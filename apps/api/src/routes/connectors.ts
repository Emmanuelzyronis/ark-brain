import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { db } from '../db/client.js'
import { extractEntitiesAndDecisions, generateEmbedding } from '../services/ai.service.js'

const SOURCES = ['slack', 'notion', 'github', 'confluence', 'gdrive'] as const

export async function connectorRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  // GET /api/workspaces/:id/connectors
  fastify.get('/:id/connectors', async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as { id: string }
    const payload = request.user as { userId: string }

    await requireMember(params.id, payload.userId, reply)

    const result = await db.query(
      `SELECT id, workspace_id, source, status, scope, external_workspace_id,
              metadata, last_synced_at, error_message, created_at, updated_at
       FROM connectors WHERE workspace_id = $1 ORDER BY created_at`,
      [params.id]
    )
    return reply.send(result.rows)
  })

  // POST /api/workspaces/:id/connectors/:source/sync — trigger manual sync
  fastify.post('/:id/connectors/:source/sync', async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as { id: string; source: string }
    const payload = request.user as { userId: string }

    await requireAdmin(params.id, payload.userId, reply)

    if (!SOURCES.includes(params.source as (typeof SOURCES)[number])) {
      return reply.code(400).send({ error: 'Invalid source' })
    }

    const connResult = await db.query(
      `SELECT * FROM connectors WHERE workspace_id = $1 AND source = $2`,
      [params.id, params.source]
    )

    if (connResult.rows.length === 0) {
      return reply.code(404).send({ error: 'Connector not found. Connect this source first.' })
    }

    const connector = connResult.rows[0]

    // Create sync job
    const jobResult = await db.query<{ id: string }>(
      `INSERT INTO sync_jobs (connector_id, workspace_id, job_type, status)
       VALUES ($1, $2, 'full', 'queued') RETURNING id`,
      [connector.id, params.id]
    )

    // Update connector status
    await db.query(
      `UPDATE connectors SET status = 'connecting', error_message = NULL, updated_at = NOW()
       WHERE id = $1`,
      [connector.id]
    )

    // Run sync asynchronously (fire and forget)
    setImmediate(() => runSync(connector.id, params.id, connector.source, connector.access_token, jobResult.rows[0].id))

    return reply.send({ message: 'Sync started', job_id: jobResult.rows[0].id })
  })

  // DELETE /api/workspaces/:id/connectors/:source — disconnect
  fastify.delete('/:id/connectors/:source', async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as { id: string; source: string }
    const payload = request.user as { userId: string }

    await requireAdmin(params.id, payload.userId, reply)

    await db.query(
      `UPDATE connectors SET status = 'disconnected', access_token = NULL, refresh_token = NULL, updated_at = NOW()
       WHERE workspace_id = $1 AND source = $2`,
      [params.id, params.source]
    )

    return reply.send({ message: 'Connector disconnected' })
  })

  // POST /api/workspaces/:id/connectors/:source/demo — create demo connector with sample data
  fastify.post('/:id/connectors/:source/demo', async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as { id: string; source: string }
    const payload = request.user as { userId: string }

    await requireAdmin(params.id, payload.userId, reply)

    if (!SOURCES.includes(params.source as (typeof SOURCES)[number])) {
      return reply.code(400).send({ error: 'Invalid source' })
    }

    // Upsert connector
    const connResult = await db.query<{ id: string }>(
      `INSERT INTO connectors (workspace_id, source, status, scope, metadata)
       VALUES ($1, $2, 'connecting', 'demo', '{"demo": true}')
       ON CONFLICT (workspace_id, source) DO UPDATE SET status = 'connecting', updated_at = NOW()
       RETURNING id`,
      [params.id, params.source]
    )

    const connectorId = connResult.rows[0].id

    // Create sync job
    const jobResult = await db.query<{ id: string }>(
      `INSERT INTO sync_jobs (connector_id, workspace_id, job_type, status)
       VALUES ($1, $2, 'full', 'queued') RETURNING id`,
      [connectorId, params.id]
    )

    // Run demo sync
    setImmediate(() => runDemoSync(connectorId, params.id, params.source, jobResult.rows[0].id))

    return reply.code(201).send({ message: 'Demo connector created, sync started', connector_id: connectorId })
  })
}

async function runSync(
  connectorId: string,
  workspaceId: string,
  source: string,
  accessToken: string,
  jobId: string
) {
  try {
    await db.query(
      `UPDATE sync_jobs SET status = 'running', started_at = NOW() WHERE id = $1`,
      [jobId]
    )

    // In a real app, call the actual API here
    // For demo purposes, we'll create sample documents based on source
    await runDemoSync(connectorId, workspaceId, source, jobId)
  } catch (error) {
    console.error('Sync error:', error)
    await db.query(
      `UPDATE sync_jobs SET status = 'failed', completed_at = NOW(), error_message = $1 WHERE id = $2`,
      [(error as Error).message, jobId]
    )
    await db.query(
      `UPDATE connectors SET status = 'error', error_message = $1, updated_at = NOW() WHERE id = $2`,
      [(error as Error).message, connectorId]
    )
  }
}

async function runDemoSync(connectorId: string, workspaceId: string, source: string, jobId: string) {
  try {
    await db.query(
      `UPDATE sync_jobs SET status = 'running', started_at = NOW() WHERE id = $1`,
      [jobId]
    )

    const demoDocuments = getDemoDocuments(source)
    let processed = 0

    for (const doc of demoDocuments) {
      // Insert document
      const docResult = await db.query<{ id: string }>(
        `INSERT INTO documents (workspace_id, connector_id, source, external_id, external_url, title, content, author_name, published_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (workspace_id, source, external_id) DO UPDATE SET
           title = EXCLUDED.title, content = EXCLUDED.content, indexed_at = NOW()
         RETURNING id`,
        [workspaceId, connectorId, source, doc.external_id, doc.external_url, doc.title, doc.content, doc.author_name, doc.published_at]
      )

      const documentId = docResult.rows[0].id

      // Extract entities and decisions with Claude
      try {
        const extraction = await extractEntitiesAndDecisions(doc.content, source, doc.title)

        // Store entities
        for (const entity of extraction.entities) {
          await db.query(
            `INSERT INTO entities (workspace_id, name, entity_type, description)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (workspace_id, name, entity_type) DO UPDATE SET
               description = EXCLUDED.description, last_seen_at = NOW(), mention_count = entities.mention_count + 1`,
            [workspaceId, entity.name, entity.entity_type, entity.description]
          )
        }

        // Store decisions
        for (const decision of extraction.decisions) {
          await db.query(
            `INSERT INTO decisions (workspace_id, title, rationale, outcome, decision_type, confidence_score, source_document_ids)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [workspaceId, decision.title, decision.rationale, decision.outcome, decision.decision_type, decision.confidence_score, [documentId]]
          )
        }

        // Create chunk and embedding
        const chunks = chunkText(doc.content, 500)
        for (let i = 0; i < chunks.length; i++) {
          const embedding = await generateEmbedding(chunks[i])
          await db.query(
            `INSERT INTO chunks (document_id, workspace_id, content, chunk_index, embedding)
             VALUES ($1, $2, $3, $4, $5)`,
            [documentId, workspaceId, chunks[i], i, `[${embedding.join(',')}]`]
          )
        }
      } catch (aiError) {
        console.error('AI extraction error for doc:', doc.title, aiError)
      }

      processed++
      await db.query(
        `UPDATE sync_jobs SET documents_processed = $1 WHERE id = $2`,
        [processed, jobId]
      )
    }

    await db.query(
      `UPDATE sync_jobs SET status = 'completed', completed_at = NOW(), documents_processed = $1 WHERE id = $2`,
      [processed, jobId]
    )

    await db.query(
      `UPDATE connectors SET status = 'active', last_synced_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [connectorId]
    )
  } catch (error) {
    console.error('Demo sync error:', error)
    await db.query(
      `UPDATE sync_jobs SET status = 'failed', completed_at = NOW(), error_message = $1 WHERE id = $2`,
      [(error as Error).message, jobId]
    )
    await db.query(
      `UPDATE connectors SET status = 'error', error_message = $1, updated_at = NOW() WHERE id = $2`,
      [(error as Error).message, connectorId]
    )
  }
}

function chunkText(text: string, maxLength: number): string[] {
  const chunks: string[] = []
  const sentences = text.split(/[.!?]+\s+/)
  let current = ''

  for (const sentence of sentences) {
    if (current.length + sentence.length > maxLength && current.length > 0) {
      chunks.push(current.trim())
      current = sentence
    } else {
      current += (current ? ' ' : '') + sentence
    }
  }

  if (current.trim()) chunks.push(current.trim())
  return chunks.filter(c => c.length > 20)
}

function getDemoDocuments(source: string) {
  const docsMap: Record<string, Array<{ external_id: string; external_url: string | null; title: string; content: string; author_name: string; published_at: string }>> = {
    github: [
      {
        external_id: 'pr-1',
        external_url: 'https://github.com/company/backend/pull/1',
        title: 'PR: Switch from MongoDB to PostgreSQL',
        content: `After extensive evaluation, we decided to migrate our primary database from MongoDB to PostgreSQL. The main reasons are:
1. ACID compliance is critical for our financial transaction data
2. Complex JOIN queries are much more performant in PostgreSQL
3. pgvector extension enables semantic search without a separate vector database
4. Our team has much stronger SQL expertise than MongoDB aggregation pipelines

We chose PostgreSQL 16 with the Neon serverless driver for zero-ops database management.
The migration was completed in 3 sprints with zero downtime using dual-write pattern.`,
        author_name: 'sarah.chen',
        published_at: '2025-03-15T10:00:00Z',
      },
      {
        external_id: 'pr-2',
        external_url: 'https://github.com/company/backend/pull/47',
        title: 'PR: Migrate to Fastify from Express',
        content: `Migrating from Express to Fastify v5 for the following reasons:
- Fastify is 2x faster in benchmarks due to schema-based serialization
- Built-in TypeScript support with full type inference
- Schema validation with JSON Schema reduces boilerplate
- Plugin system is more structured and composable than Express middleware

Performance testing showed 40% reduction in p99 latency on our API endpoints.
We evaluated Hono and Elysia but chose Fastify for its maturity and ecosystem.`,
        author_name: 'alex.rodriguez',
        published_at: '2025-05-20T14:00:00Z',
      },
      {
        external_id: 'issue-15',
        external_url: 'https://github.com/company/infra/issues/15',
        title: 'Issue: Cloud Provider Selection - AWS vs GCP',
        content: `After 6 weeks of evaluation we decided to go with AWS over GCP for the following reasons:
- AWS has stronger enterprise sales support which matters for our B2B customers
- Our team has 3 AWS certified engineers vs 0 GCP
- AWS SLA commitments are stronger for our uptime requirements
- Bedrock gives us access to Claude and other foundation models natively
- Cost modeling shows AWS is 15% cheaper at our projected scale

We will use: ECS Fargate for containers, RDS for databases, CloudFront for CDN, and Bedrock for AI.`,
        author_name: 'emma.wilson',
        published_at: '2025-01-10T09:00:00Z',
      },
    ],
    slack: [
      {
        external_id: 'slack-C001-1685000000',
        external_url: null,
        title: 'Slack: #architecture - Auth service discussion',
        content: `@team We need to decide on authentication strategy. Options:
1. Roll our own JWT auth
2. Auth0 ($23k/year at scale)
3. Clerk ($5k/year + great DX)

After discussion we went with Clerk because:
- Developer experience is the best
- Pricing scales with us, not punishing early
- Built-in org management saves us 2 sprints
- Webhooks are reliable for our sync needs

Decision: Clerk for auth. @backend team to integrate this sprint.`,
        author_name: 'james.park',
        published_at: '2025-06-01T16:00:00Z',
      },
      {
        external_id: 'slack-C002-1685100000',
        external_url: null,
        title: 'Slack: #infra - Incident: Database outage Nov 2024',
        content: `INCIDENT REPORT - Database Outage Nov 14 2024
Duration: 4h 23min
Impact: 100% of API requests failing
Root cause: Connection pool exhaustion during traffic spike

Resolution:
- Increased connection pool from 10 to 100
- Added connection timeout of 30s
- Implemented circuit breaker pattern
- Migrated to PgBouncer for connection pooling

Post-mortem actions:
1. Add alerting on connection pool utilization >70%
2. Load testing in staging before any deploy
3. Runbook updated with connection pool recovery steps`,
        author_name: 'maria.santos',
        published_at: '2024-11-15T08:00:00Z',
      },
      {
        external_id: 'slack-C003-1686000000',
        external_url: null,
        title: 'Slack: #product - AI vendor selection',
        content: `We evaluated the following AI providers for our NLP features:
- OpenAI GPT-4o: Best raw performance but expensive at scale
- Anthropic Claude: Best reasoning and safety for enterprise customers
- Google Gemini: Good price but inconsistent API reliability
- AWS Bedrock: Great for multi-model access and AWS native

Decision: Anthropic Claude via API as primary, with AWS Bedrock fallback.
Rationale: Our enterprise customers require explainable AI with strong safety guarantees. Claude's constitutional AI approach matches our enterprise positioning. Cost is 30% lower than GPT-4o at our volume.`,
        author_name: 'david.kim',
        published_at: '2025-07-15T11:00:00Z',
      },
    ],
    notion: [
      {
        external_id: 'notion-page-001',
        external_url: 'https://notion.so/company/architecture-decisions',
        title: 'Architecture Decision Records (ADR)',
        content: `# Architecture Decision Records

## ADR-001: Monorepo Structure
Date: 2025-01-05
Status: Accepted

Context: We needed to decide between a monorepo and polyrepo for our codebase.
Decision: Turborepo monorepo with apps/web, apps/api, packages/shared structure.
Rationale: Shared types, atomic commits, and easier local development outweigh the complexity cost.
Consequences: Single git history, shared CI/CD configuration, easy cross-package refactoring.

## ADR-002: State Management
Date: 2025-02-10
Status: Accepted

Context: Frontend needed a state management solution for complex async state.
Decision: React Query (TanStack Query) for server state, Zustand for client state.
Rationale: React Query handles caching, invalidation, and optimistic updates automatically.
Zustand is lightweight (1kb) and has excellent TypeScript support.`,
        author_name: 'tech-lead',
        published_at: '2025-02-10T12:00:00Z',
      },
    ],
    confluence: [
      {
        external_id: 'conf-001',
        external_url: 'https://company.atlassian.net/wiki/spaces/ENG/pages/001',
        title: 'Engineering Handbook - Development Process',
        content: `# Development Process

## Sprint Cadence
We run 2-week sprints starting Monday. Planning on Monday, retro on Friday.

## Code Review Policy
All PRs require at minimum 1 approval from a senior engineer.
Security-sensitive changes require 2 approvals and a security review checklist.

## Deployment Process
We use GitOps with ArgoCD. Merging to main triggers deployment to staging.
Production deployments require a deployment ticket and are done Tuesday/Thursday only.

## Technology Choices
We standardized on TypeScript for all new code (frontend and backend).
Python is allowed for ML/data pipeline work only.
No new microservices without an ADR and architecture review.`,
        author_name: 'engineering-team',
        published_at: '2025-01-20T09:00:00Z',
      },
    ],
    gdrive: [
      {
        external_id: 'gdrive-001',
        external_url: 'https://docs.google.com/document/d/001',
        title: 'Vendor Evaluation: Data Processing Pipeline',
        content: `# Data Processing Pipeline Vendor Evaluation

Evaluated: Databricks, Snowflake, dbt + BigQuery, Apache Spark on EMR

Decision: dbt + BigQuery for analytics, Kafka + Flink for real-time processing.

Rationale:
- dbt gives analysts SQL-first workflow they already know
- BigQuery pricing is consumption-based, perfect for variable workloads
- Kafka is industry standard for event streaming
- Flink gives exactly-once processing guarantees critical for billing

Cost comparison:
- Databricks: $180k/year estimated
- Snowflake: $150k/year estimated
- dbt + BigQuery: $45k/year estimated (chosen)

Timeline: 8-week migration completed Q3 2025.`,
        author_name: 'data-team',
        published_at: '2025-08-01T10:00:00Z',
      },
    ],
  }

  return docsMap[source] || docsMap.github
}

async function requireMember(workspaceId: string, userId: string, reply: FastifyReply) {
  const result = await db.query(
    `SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`,
    [workspaceId, userId]
  )
  if (result.rows.length === 0) {
    reply.code(403).send({ error: 'Access denied' })
    throw new Error('Access denied')
  }
  return result.rows[0].role as string
}

async function requireAdmin(workspaceId: string, userId: string, reply: FastifyReply) {
  const role = await requireMember(workspaceId, userId, reply)
  if (role !== 'admin') {
    reply.code(403).send({ error: 'Admin access required' })
    throw new Error('Admin required')
  }
}
