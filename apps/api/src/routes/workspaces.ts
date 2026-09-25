import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { db } from '../db/client.js'
import { randomBytes } from 'crypto'

export async function workspaceRoutes(fastify: FastifyInstance) {
  // Apply auth to all workspace routes
  fastify.addHook('preHandler', fastify.authenticate)

  // POST /api/workspaces
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const schema = z.object({ name: z.string().min(1) })
    const body = schema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: 'Name is required' })

    const payload = request.user as { userId: string }
    const slug = body.data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50)

    const result = await db.query<{ id: string; name: string; slug: string; created_at: string }>(
      `INSERT INTO workspaces (name, slug, owner_id) VALUES ($1, $2, $3) RETURNING id, name, slug, created_at`,
      [body.data.name, slug, payload.userId]
    )
    const ws = result.rows[0]

    await db.query(
      `INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, 'admin')`,
      [ws.id, payload.userId]
    )

    return reply.code(201).send(ws)
  })

  // GET /api/workspaces
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const payload = request.user as { userId: string }

    const result = await db.query(
      `SELECT w.*, wm.role FROM workspaces w
       JOIN workspace_members wm ON wm.workspace_id = w.id
       WHERE wm.user_id = $1 AND w.deleted_at IS NULL
       ORDER BY w.created_at DESC`,
      [payload.userId]
    )
    return reply.send(result.rows)
  })

  // GET /api/workspaces/:id
  fastify.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as { id: string }
    const payload = request.user as { userId: string }

    const result = await db.query(
      `SELECT w.*, wm.role FROM workspaces w
       JOIN workspace_members wm ON wm.workspace_id = w.id
       WHERE w.id = $1 AND wm.user_id = $2 AND w.deleted_at IS NULL`,
      [params.id, payload.userId]
    )

    if (result.rows.length === 0) return reply.code(404).send({ error: 'Workspace not found' })
    return reply.send(result.rows[0])
  })

  // PATCH /api/workspaces/:id
  fastify.patch('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as { id: string }
    const payload = request.user as { userId: string }
    const schema = z.object({ name: z.string().min(1).optional(), settings: z.record(z.unknown()).optional() })
    const body = schema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })

    await requireAdmin(params.id, payload.userId, reply)

    const updates: string[] = []
    const values: unknown[] = []
    let idx = 1

    if (body.data.name) {
      updates.push(`name = $${idx++}`)
      values.push(body.data.name)
    }
    if (body.data.settings) {
      updates.push(`settings = $${idx++}`)
      values.push(JSON.stringify(body.data.settings))
    }

    if (updates.length === 0) return reply.send({ message: 'No changes' })

    values.push(params.id)
    const result = await db.query(
      `UPDATE workspaces SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    )
    return reply.send(result.rows[0])
  })

  // DELETE /api/workspaces/:id (soft delete)
  fastify.delete('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as { id: string }
    const payload = request.user as { userId: string }

    await requireAdmin(params.id, payload.userId, reply)

    await db.query(`UPDATE workspaces SET deleted_at = NOW() WHERE id = $1`, [params.id])
    return reply.send({ message: 'Workspace deleted' })
  })

  // GET /api/workspaces/:id/members
  fastify.get('/:id/members', async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as { id: string }
    const payload = request.user as { userId: string }

    await requireMember(params.id, payload.userId, reply)

    const result = await db.query(
      `SELECT wm.id, wm.workspace_id, wm.user_id, wm.role, wm.joined_at,
              u.email, u.name, u.avatar_url
       FROM workspace_members wm
       JOIN users u ON u.id = wm.user_id
       WHERE wm.workspace_id = $1
       ORDER BY wm.joined_at`,
      [params.id]
    )
    return reply.send(result.rows)
  })

  // POST /api/workspaces/:id/invites
  fastify.post('/:id/invites', async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as { id: string }
    const payload = request.user as { userId: string }
    const schema = z.object({ email: z.string().email(), role: z.enum(['admin', 'viewer']) })
    const body = schema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: 'Email and role are required' })

    await requireAdmin(params.id, payload.userId, reply)

    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    const result = await db.query(
      `INSERT INTO workspace_invites (workspace_id, email, role, token, expires_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [params.id, body.data.email, body.data.role, token, expiresAt, payload.userId]
    )

    return reply.code(201).send({
      ...result.rows[0],
      invite_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/invite/${token}`,
    })
  })

  // DELETE /api/workspaces/:id/members/:userId
  fastify.delete('/:id/members/:userId', async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as { id: string; userId: string }
    const payload = request.user as { userId: string }

    await requireAdmin(params.id, payload.userId, reply)

    await db.query(
      `DELETE FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`,
      [params.id, params.userId]
    )
    return reply.send({ message: 'Member removed' })
  })

  // PATCH /api/workspaces/:id/members/:userId
  fastify.patch('/:id/members/:userId', async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as { id: string; userId: string }
    const payload = request.user as { userId: string }
    const schema = z.object({ role: z.enum(['admin', 'viewer']) })
    const body = schema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: 'Role is required' })

    await requireAdmin(params.id, payload.userId, reply)

    await db.query(
      `UPDATE workspace_members SET role = $1 WHERE workspace_id = $2 AND user_id = $3`,
      [body.data.role, params.id, params.userId]
    )
    return reply.send({ message: 'Role updated' })
  })

  // GET /api/workspaces/:id/stats
  fastify.get('/:id/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as { id: string }
    const payload = request.user as { userId: string }

    await requireMember(params.id, payload.userId, reply)

    const [docs, decisions, entities, connectors] = await Promise.all([
      db.query('SELECT COUNT(*) FROM documents WHERE workspace_id = $1', [params.id]),
      db.query('SELECT COUNT(*) FROM decisions WHERE workspace_id = $1', [params.id]),
      db.query('SELECT COUNT(*) FROM entities WHERE workspace_id = $1', [params.id]),
      db.query('SELECT COUNT(*), MAX(last_synced_at) as last_sync FROM connectors WHERE workspace_id = $1', [params.id]),
    ])

    return reply.send({
      document_count: parseInt(docs.rows[0].count),
      decision_count: parseInt(decisions.rows[0].count),
      entity_count: parseInt(entities.rows[0].count),
      connector_count: parseInt(connectors.rows[0].count),
      last_sync_at: connectors.rows[0].last_sync,
    })
  })

  // GET /api/workspaces/:id/documents
  fastify.get('/:id/documents', async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as { id: string }
    const payload = request.user as { userId: string }
    const query = request.query as { page?: string; limit?: string; source?: string }

    await requireMember(params.id, payload.userId, reply)

    const page = parseInt(query.page || '1')
    const limit = parseInt(query.limit || '20')
    const offset = (page - 1) * limit

    let sql = `SELECT d.id, d.source, d.external_id, d.external_url, d.title, d.author_name, d.published_at, d.indexed_at
               FROM documents d WHERE d.workspace_id = $1`
    const values: unknown[] = [params.id]

    if (query.source) {
      sql += ` AND d.source = $${values.length + 1}`
      values.push(query.source)
    }

    sql += ` ORDER BY d.indexed_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`
    values.push(limit, offset)

    const result = await db.query(sql, values)
    return reply.send({ data: result.rows, page, limit })
  })

  // GET /api/workspaces/:id/audit
  fastify.get('/:id/audit', async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as { id: string }
    const payload = request.user as { userId: string }
    const query = request.query as { page?: string; limit?: string }

    await requireAdmin(params.id, payload.userId, reply)

    const page = parseInt(query.page || '1')
    const limit = parseInt(query.limit || '50')
    const offset = (page - 1) * limit

    const result = await db.query(
      `SELECT al.*, u.email, u.name FROM audit_logs al
       LEFT JOIN users u ON u.id = al.user_id
       WHERE al.workspace_id = $1
       ORDER BY al.created_at DESC LIMIT $2 OFFSET $3`,
      [params.id, limit, offset]
    )
    return reply.send({ data: result.rows, page, limit })
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
  return result.rows[0].role
}

async function requireAdmin(workspaceId: string, userId: string, reply: FastifyReply) {
  const role = await requireMember(workspaceId, userId, reply)
  if (role !== 'admin') {
    reply.code(403).send({ error: 'Admin access required' })
    throw new Error('Admin required')
  }
}
