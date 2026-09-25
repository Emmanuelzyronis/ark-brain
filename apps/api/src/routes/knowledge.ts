import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { db } from '../db/client.js'
import { generateOnboardingFAQ } from '../services/ai.service.js'

export async function knowledgeRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  // GET /api/workspaces/:id/decisions
  fastify.get('/:id/decisions', async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as { id: string }
    const payload = request.user as { userId: string }
    const query = request.query as { page?: string; limit?: string; type?: string }

    await requireMember(params.id, payload.userId, reply)

    const page = parseInt(query.page || '1')
    const limit = parseInt(query.limit || '20')
    const offset = (page - 1) * limit

    let sql = `SELECT d.* FROM decisions d WHERE d.workspace_id = $1`
    const values: unknown[] = [params.id]

    if (query.type) {
      sql += ` AND d.decision_type = $${values.length + 1}`
      values.push(query.type)
    }

    const totalResult = await db.query(
      `SELECT COUNT(*) FROM decisions WHERE workspace_id = $1${query.type ? ' AND decision_type = $2' : ''}`,
      query.type ? [params.id, query.type] : [params.id]
    )

    sql += ` ORDER BY d.extracted_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`
    values.push(limit, offset)

    const result = await db.query(sql, values)

    return reply.send({
      data: result.rows,
      total: parseInt(totalResult.rows[0].count),
      page,
      limit,
      has_more: offset + result.rows.length < parseInt(totalResult.rows[0].count),
    })
  })

  // GET /api/workspaces/:id/decisions/tags
  fastify.get('/:id/decisions/tags', async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as { id: string }
    const payload = request.user as { userId: string }

    await requireMember(params.id, payload.userId, reply)

    const result = await db.query(
      `SELECT decision_type, COUNT(*) as count FROM decisions WHERE workspace_id = $1 GROUP BY decision_type ORDER BY count DESC`,
      [params.id]
    )

    return reply.send(result.rows)
  })

  // GET /api/workspaces/:id/decisions/:decisionId
  fastify.get('/:id/decisions/:decisionId', async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as { id: string; decisionId: string }
    const payload = request.user as { userId: string }

    await requireMember(params.id, payload.userId, reply)

    const decisionResult = await db.query(
      `SELECT * FROM decisions WHERE id = $1 AND workspace_id = $2`,
      [params.decisionId, params.id]
    )

    if (decisionResult.rows.length === 0) {
      return reply.code(404).send({ error: 'Decision not found' })
    }

    const sourcesResult = await db.query(
      `SELECT ds.*, d.title, d.external_url, d.source, d.author_name, d.published_at
       FROM decision_sources ds
       JOIN documents d ON d.id = ds.document_id
       WHERE ds.decision_id = $1`,
      [params.decisionId]
    )

    return reply.send({
      ...decisionResult.rows[0],
      sources: sourcesResult.rows,
    })
  })

  // GET /api/workspaces/:id/entities
  fastify.get('/:id/entities', async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as { id: string }
    const payload = request.user as { userId: string }
    const query = request.query as { type?: string; limit?: string }

    await requireMember(params.id, payload.userId, reply)

    const limit = parseInt(query.limit || '50')
    let sql = `SELECT * FROM entities WHERE workspace_id = $1`
    const values: unknown[] = [params.id]

    if (query.type) {
      sql += ` AND entity_type = $${values.length + 1}`
      values.push(query.type)
    }

    sql += ` ORDER BY mention_count DESC LIMIT $${values.length + 1}`
    values.push(limit)

    const result = await db.query(sql, values)
    return reply.send(result.rows)
  })

  // GET /api/workspaces/:id/graph
  fastify.get('/:id/graph', async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as { id: string }
    const payload = request.user as { userId: string }

    await requireMember(params.id, payload.userId, reply)

    const entitiesResult = await db.query(
      `SELECT id, name, entity_type, mention_count FROM entities WHERE workspace_id = $1 ORDER BY mention_count DESC LIMIT 50`,
      [params.id]
    )

    const decisionsResult = await db.query(
      `SELECT id, title, decision_type FROM decisions WHERE workspace_id = $1 ORDER BY extracted_at DESC LIMIT 30`,
      [params.id]
    )

    const relationshipsResult = await db.query(
      `SELECT * FROM entity_relationships WHERE workspace_id = $1 LIMIT 100`,
      [params.id]
    )

    const nodes = [
      ...entitiesResult.rows.map((e: Record<string, unknown>) => ({
        id: e.id,
        type: 'entity',
        label: e.name,
        entity_type: e.entity_type,
        mention_count: e.mention_count,
      })),
      ...decisionsResult.rows.map((d: Record<string, unknown>) => ({
        id: d.id,
        type: 'decision',
        label: d.title,
        decision_type: d.decision_type,
      })),
    ]

    const edges = relationshipsResult.rows.map((r: Record<string, unknown>) => ({
      id: r.id,
      from: r.from_entity_id,
      to: r.to_entity_id,
      relationship_type: r.relationship_type,
      weight: r.weight,
    }))

    return reply.send({ nodes, edges })
  })

  // POST /api/workspaces/:id/onboarding/faq — generate FAQ
  fastify.post('/:id/onboarding/faq', async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as { id: string }
    const payload = request.user as { userId: string }

    await requireAdmin(params.id, payload.userId, reply)

    const decisionsResult = await db.query<{ title: string; rationale: string | null; decision_type: string; outcome: string | null }>(
      `SELECT title, rationale, decision_type, outcome FROM decisions WHERE workspace_id = $1 ORDER BY confidence_score DESC LIMIT 30`,
      [params.id]
    )

    const documentsResult = await db.query<{ title: string | null; source: string; content: string | null }>(
      `SELECT title, source, LEFT(content, 500) as content FROM documents WHERE workspace_id = $1 LIMIT 10`,
      [params.id]
    )

    const faqs = await generateOnboardingFAQ(decisionsResult.rows, documentsResult.rows)

    // Clear existing FAQs and insert new ones
    await db.query(`DELETE FROM onboarding_faqs WHERE workspace_id = $1`, [params.id])

    for (const faq of faqs) {
      await db.query(
        `INSERT INTO onboarding_faqs (workspace_id, question, answer) VALUES ($1, $2, $3)`,
        [params.id, faq.question, faq.answer]
      )
    }

    return reply.send({ message: 'FAQ generated', count: faqs.length })
  })

  // GET /api/workspaces/:id/onboarding/faq
  fastify.get('/:id/onboarding/faq', async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as { id: string }
    const payload = request.user as { userId: string }

    await requireMember(params.id, payload.userId, reply)

    const result = await db.query(
      `SELECT * FROM onboarding_faqs WHERE workspace_id = $1 ORDER BY generated_at DESC`,
      [params.id]
    )

    return reply.send(result.rows)
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

async function requireAdmin(workspaceId: string, userId: string, reply: FastifyReply) {
  const role = await requireMember(workspaceId, userId, reply)
  if (role !== 'admin') {
    reply.code(403).send({ error: 'Admin access required' })
    throw new Error('Admin required')
  }
}
