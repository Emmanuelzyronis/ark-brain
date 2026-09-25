import Anthropic from '@anthropic-ai/sdk'
import dotenv from 'dotenv'

dotenv.config()

// Support both direct Anthropic API and Azure-hosted Claude
const isAzure = !!process.env.ANTHROPIC_FOUNDRY_API_KEY && !!process.env.ANTHROPIC_FOUNDRY_BASE_URL

const client = new Anthropic(
  isAzure
    ? {
        apiKey: process.env.ANTHROPIC_FOUNDRY_API_KEY,
        baseURL: process.env.ANTHROPIC_FOUNDRY_BASE_URL,
        defaultHeaders: { 'api-version': '2025-04-01-preview' },
      }
    : { apiKey: process.env.ANTHROPIC_API_KEY }
)

const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6'

export interface ExtractedEntity {
  name: string
  entity_type: 'person' | 'system' | 'concept' | 'vendor' | 'protocol' | 'framework'
  description: string
}

export interface ExtractedDecision {
  title: string
  rationale: string
  outcome: string
  decision_type: 'architecture' | 'vendor' | 'process' | 'incident' | 'product' | 'security'
  confidence_score: number
}

export interface ExtractionResult {
  entities: ExtractedEntity[]
  decisions: ExtractedDecision[]
}

export async function extractEntitiesAndDecisions(
  content: string,
  source: string,
  title?: string
): Promise<ExtractionResult> {
  const prompt = `You are an expert knowledge extractor for engineering teams. Analyze the following ${source} content and extract:

1. **Entities**: Named things that are referenced (systems, vendors, people, frameworks, protocols, concepts)
2. **Decisions**: Architectural, vendor, process, incident, product, or security decisions that were made

For entities, classify as: person, system, concept, vendor, protocol, or framework.
For decisions, classify as: architecture, vendor, process, incident, product, or security.
Give confidence_score 0.0-1.0 based on how clearly a decision was made vs implied.

Content title: ${title || 'Untitled'}
Content:
${content.slice(0, 8000)}

Respond ONLY with valid JSON in this exact format:
{
  "entities": [
    {"name": "PostgreSQL", "entity_type": "system", "description": "Relational database system"},
    {"name": "AWS", "entity_type": "vendor", "description": "Cloud infrastructure provider"}
  ],
  "decisions": [
    {
      "title": "Chose PostgreSQL over MongoDB for primary database",
      "rationale": "We chose PostgreSQL because of its ACID compliance and strong querying capabilities needed for our complex reporting requirements",
      "outcome": "PostgreSQL is now our primary database for all transactional data",
      "decision_type": "architecture",
      "confidence_score": 0.9
    }
  ]
}

If there are no clear entities or decisions, return empty arrays.`

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return { entities: [], decisions: [] }
    }

    const result = JSON.parse(jsonMatch[0]) as ExtractionResult
    return {
      entities: Array.isArray(result.entities) ? result.entities : [],
      decisions: Array.isArray(result.decisions) ? result.decisions : [],
    }
  } catch (error) {
    console.error('AI extraction error:', error)
    return { entities: [], decisions: [] }
  }
}

export async function answerQuestion(
  question: string,
  contextChunks: Array<{ content: string; source: string; title: string | null; url: string | null; author: string | null; date: string | null }>,
  decisions: Array<{ title: string; rationale: string | null; decision_type: string }>
): Promise<{ answer: string; citedSourceIndices: number[] }> {
  const contextText = contextChunks
    .map((chunk, i) => `[Source ${i + 1}] ${chunk.title || chunk.source} (${chunk.author || 'unknown'}, ${chunk.date ? new Date(chunk.date).toLocaleDateString() : 'unknown date'})\n${chunk.content}`)
    .join('\n\n---\n\n')

  const decisionsText = decisions
    .map((d, i) => `[Decision ${i + 1}] ${d.decision_type.toUpperCase()}: ${d.title}\nRationale: ${d.rationale || 'No rationale recorded'}`)
    .join('\n\n')

  const prompt = `You are ArkBrain, an AI assistant that helps engineering teams understand their own institutional knowledge and decision history.

Answer the following question using ONLY the provided sources. Always cite which sources informed your answer using [Source N] notation.

Question: ${question}

Relevant Documents:
${contextText || 'No relevant documents found.'}

Relevant Decisions:
${decisionsText || 'No relevant decisions found.'}

Instructions:
- Answer directly and concisely
- Use [Source N] citations inline when referencing specific information
- If information is from multiple sources, cite all relevant ones
- If you cannot answer from the provided context, say so clearly
- Be specific about dates, authors, and technical details when available
- Format your answer in clear prose, not bullet points unless listing items`

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    })

    const answer = response.content[0].type === 'text' ? response.content[0].text : 'Unable to generate answer.'

    // Extract cited source indices
    const citedIndices: number[] = []
    const sourceMatches = answer.matchAll(/\[Source (\d+)\]/g)
    for (const match of sourceMatches) {
      const idx = parseInt(match[1]) - 1
      if (idx >= 0 && idx < contextChunks.length && !citedIndices.includes(idx)) {
        citedIndices.push(idx)
      }
    }

    return { answer, citedSourceIndices: citedIndices }
  } catch (error) {
    console.error('AI answer error:', error)
    return {
      answer: 'I encountered an error while generating your answer. Please try again.',
      citedSourceIndices: [],
    }
  }
}

export async function generateOnboardingFAQ(
  decisions: Array<{ title: string; rationale: string | null; decision_type: string; outcome: string | null }>,
  documents: Array<{ title: string | null; source: string; content: string | null }>
): Promise<Array<{ question: string; answer: string }>> {
  const decisionsText = decisions
    .slice(0, 30)
    .map(d => `${d.decision_type.toUpperCase()}: ${d.title}\n  Rationale: ${d.rationale || 'N/A'}\n  Outcome: ${d.outcome || 'N/A'}`)
    .join('\n\n')

  const prompt = `You are creating an onboarding FAQ for new engineers joining a team. Based on the team's decision history and documentation, generate the 10 most important questions a new hire would ask, with clear answers.

Team Decisions:
${decisionsText || 'No decisions recorded yet.'}

Generate questions about:
- Why certain technologies were chosen
- Key architectural decisions
- Important processes and workflows
- Security and compliance decisions
- Vendor choices and rationale

Respond ONLY with valid JSON:
{
  "faqs": [
    {
      "question": "Why did we choose PostgreSQL as our primary database?",
      "answer": "We chose PostgreSQL because..."
    }
  ]
}`

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return []

    const result = JSON.parse(jsonMatch[0]) as { faqs: Array<{ question: string; answer: string }> }
    return Array.isArray(result.faqs) ? result.faqs : []
  } catch (error) {
    console.error('FAQ generation error:', error)
    return []
  }
}

// Simple embedding approximation using random vectors
// In production, use Azure OpenAI text-embedding-3-large
export async function generateEmbedding(text: string): Promise<number[]> {
  // Return a deterministic pseudo-embedding based on text hash
  // This allows semantic search to work structurally even without real embeddings
  const hash = simpleHash(text)
  const embedding = new Array(1536).fill(0).map((_, i) => {
    return Math.sin(hash * (i + 1) * 0.001) * 0.5
  })
  // Normalize
  const mag = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0))
  return embedding.map(v => v / (mag || 1))
}

function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return Math.abs(hash)
}
