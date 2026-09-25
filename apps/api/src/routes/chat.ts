import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { db } from '../db/client.js'
import { answerQuestion, generateEmbedding } from '../services/ai.service.js'

export async function chatRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  // POST /api/workspaces/:id/chat/sessions
  fastify.post('/:id/chat/sessions', async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as { id: string }
    const payload = request.user as { userId: string }

    await requireMember(params.id, payload.userId, reply)

    const result = await db.query<{ id: string; workspace_id: string; user_id: string; created_at: string }>(
      `INSERT INTO chat_sessions (workspace_id, user_id) VALUES ($1, $2) RETURNING *`,
      [params.id, payload.userId]
    )

    return reply.code(201).send(result.rows[0])
  })

  // GET /api/workspaces/:id/chat/sessions
  fastify.get('/:id/chat/sessions', async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as { id: string }
    const payload = request.user as { userId: string }

    await requireMember(params.id, payload.userId, reply)

    const result = await db.query(
      `SELECT * FROM chat_sessions WHERE workspace_id = $1 AND user_id = $2 ORDER BY updated_at DESC`,
      [params.id, payload.userId]
    )

    return reply.send(result.rows)
  })

  // GET /api/workspaces/:id/chat/sessions/:sessionId
  fastify.get('/:id/chat/sessions/:sessionId', async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as { id: string; sessionId: string }
    const payload = request.user as { userId: string }

    await requireMember(params.id, payload.userId, reply)

    const sessionResult = await db.query(
      `SELECT * FROM chat_sessions WHERE id = $1 AND workspace_id = $2`,
      [params.sessionId, params.id]
    )

    if (sessionResult.rows.length === 0) {
      return reply.code(404).send({ error: 'Session not found' })
    }

    const messagesResult = await db.query(
      `SELECT cm.*,
              COALESCE(json_agg(
                json_build_object(
                  'id', mc.id,
                  'document_id', mc.document_id,
                  'excerpt', mc.excerpt,
                  'relevance_score', mc.relevance_score,
                  'citation_order', mc.citation_order,
                  'document_title', d.title,
                  'document_url', d.external_url,
                  'document_source', d.source,
                  'document_author', d.author_name,
                  'document_date', d.published_at
                ) ORDER BY mc.citation_order
              ) FILTER (WHERE mc.id IS NOT NULL), '[]') as citations
       FROM chat_messages cm
       LEFT JOIN message_citations mc ON mc.message_id = cm.id
       LEFT JOIN documents d ON d.id = mc.document_id
       WHERE cm.session_id = $1
       GROUP BY cm.id
       ORDER BY cm.created_at`,
      [params.sessionId]
    )

    return reply.send({
      session: sessionResult.rows[0],
      messages: messagesResult.rows,
    })
  })

  // POST /api/workspaces/:id/chat/sessions/:sessionId/messages
  fastify.post('/:id/chat/sessions/:sessionId/messages', async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as { id: string; sessionId: string }
    const payload = request.user as { userId: string }
    const schema = z.object({ content: z.string().min(1).max(2000) })
    const body = schema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: 'Message content is required' })

    await requireMember(params.id, payload.userId, reply)

    // Verify session exists
    const sessionResult = await db.query(
      `SELECT id FROM chat_sessions WHERE id = $1 AND workspace_id = $2`,
      [params.sessionId, params.id]
    )
    if (sessionResult.rows.length === 0) {
      return reply.code(404).send({ error: 'Session not found' })
    }

    const question = body.data.content
    const startTime = Date.now()

    // Save user message
    await db.query(
      `INSERT INTO chat_messages (session_id, workspace_id, role, content) VALUES ($1, $2, 'user', $3)`,
      [params.sessionId, params.id, question]
    )

    // Generate embedding for semantic search
    const queryEmbedding = await generateEmbedding(question)

    // Semantic search across chunks
    const chunksResult = await db.query<{
      content: string; title: string | null; external_url: string | null;
      source: string; author_name: string | null; published_at: string | null; document_id: string
    }>(
      `SELECT c.content, d.title, d.external_url, d.source, d.author_name, d.published_at, c.document_id,
              1 - (c.embedding <=> $1::vector) as similarity
       FROM chunks c
       JOIN documents d ON d.id = c.document_id
       WHERE c.workspace_id = $2
       ORDER BY c.embedding <=> $1::vector
       LIMIT 10`,
      [`[${queryEmbedding.join(',')}]`, params.id]
    )

    // Also get relevant decisions
    const decisionsResult = await db.query<{ title: string; rationale: string | null; decision_type: string }>(
      `SELECT title, rationale, decision_type FROM decisions
       WHERE workspace_id = $1
       ORDER BY extracted_at DESC LIMIT 5`,
      [params.id]
    )

    const contextChunks = chunksResult.rows.map(row => ({
      content: row.content,
      source: row.source,
      title: row.title,
      url: row.external_url,
      author: row.author_name,
      date: row.published_at,
    }))

    // Get answer from Claude
    const { answer, citedSourceIndices } = await answerQuestion(
      question,
      contextChunks,
      decisionsResult.rows
    )

    const latency = Date.now() - startTime

    // Save assistant message
    const citedDocumentIds = citedSourceIndices
      .filter(i => i < chunksResult.rows.length)
      .map(i => chunksResult.rows[i].document_id)
      .filter((id, idx, arr) => arr.indexOf(id) === idx)

    const msgResult = await db.query<{ id: string; content: string; created_at: string }>(
      `INSERT INTO chat_messages (session_id, workspace_id, role, content, cited_document_ids, latency_ms)
       VALUES ($1, $2, 'assistant', $3, $4, $5) RETURNING id, content, created_at`,
      [params.sessionId, params.id, answer, citedDocumentIds, latency]
    )

    const messageId = msgResult.rows[0].id
    const citations = []

    // Save citations
    for (let order = 0; order < Math.min(citedSourceIndices.length, 3); order++) {
      const idx = citedSourceIndices[order]
      if (idx >= chunksResult.rows.length) continue
      const chunk = chunksResult.rows[idx]
      if (!chunk) continue

      await db.query(
        `INSERT INTO message_citations (message_id, document_id, excerpt, citation_order)
         VALUES ($1, $2, $3, $4)`,
        [messageId, chunk.document_id, chunk.content.slice(0, 300), order + 1]
      )

      citations.push({
        citation_order: order + 1,
        document_id: chunk.document_id,
        excerpt: chunk.content.slice(0, 300),
        document_title: chunk.title,
        document_url: chunk.external_url,
        document_source: chunk.source,
        document_author: chunk.author_name,
        document_date: chunk.published_at,
      })
    }

    // Update session
    await db.query(
      `UPDATE chat_sessions SET message_count = message_count + 2, updated_at = NOW(),
       title = COALESCE(title, $2) WHERE id = $1`,
      [params.sessionId, question.slice(0, 60)]
    )

    // Log audit
    await db.query(
      `INSERT INTO audit_logs (workspace_id, user_id, action, resource_type, resource_id)
       VALUES ($1, $2, 'chat_message', 'chat_session', $3)`,
      [params.id, payload.userId, params.sessionId]
    )

    return reply.send({
      id: messageId,
      role: 'assistant',
      content: answer,
      created_at: msgResult.rows[0].created_at,
      latency_ms: latency,
      citations,
    })
  })

  // DELETE /api/workspaces/:id/chat/sessions/:sessionId
  fastify.delete('/:id/chat/sessions/:sessionId', async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as { id: string; sessionId: string }
    const payload = request.user as { userId: string }

    await requireMember(params.id, payload.userId, reply)

    await db.query(
      `DELETE FROM chat_sessions WHERE id = $1 AND workspace_id = $2 AND user_id = $3`,
      [params.sessionId, params.id, payload.userId]
    )

    return reply.send({ message: 'Session deleted' })
  })
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
