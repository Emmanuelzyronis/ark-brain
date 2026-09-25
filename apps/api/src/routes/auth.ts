import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { db } from '../db/client.js'

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).optional(),
  workspace_name: z.string().min(1).optional(),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function authRoutes(fastify: FastifyInstance) {
  // POST /api/auth/register
  fastify.post('/register', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = registerSchema.safeParse(request.body)
    if (!body.success) {
      return reply.code(400).send({ error: 'Invalid request', details: body.error.errors })
    }

    const { email, password, name } = body.data

    // Check if user already exists
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email])
    if (existing.rows.length > 0) {
      return reply.code(409).send({ error: 'User already exists with this email' })
    }

    const password_hash = await bcrypt.hash(password, 12)

    const result = await db.query<{ id: string; email: string; name: string | null; avatar_url: string | null; created_at: string }>(
      `INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3)
       RETURNING id, email, name, avatar_url, created_at`,
      [email, name || null, password_hash]
    )

    const user = result.rows[0]

    // Create workspace if workspace_name provided
    if (body.data.workspace_name) {
      const slug = body.data.workspace_name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 50)

      const wsResult = await db.query<{ id: string }>(
        `INSERT INTO workspaces (name, slug, owner_id) VALUES ($1, $2, $3)
         ON CONFLICT (slug) DO UPDATE SET slug = EXCLUDED.slug || '-' || extract(epoch from now())::int
         RETURNING id`,
        [body.data.workspace_name, slug, user.id]
      )

      if (wsResult.rows.length > 0) {
        await db.query(
          `INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, 'admin')`,
          [wsResult.rows[0].id, user.id]
        )
      }
    }

    const token = fastify.jwt.sign(
      { userId: user.id, email: user.email },
      { expiresIn: process.env.JWT_EXPIRY || '7d' }
    )

    return reply.code(201).send({
      user: { id: user.id, email: user.email, name: user.name, avatar_url: user.avatar_url, created_at: user.created_at },
      token,
    })
  })

  // POST /api/auth/login
  fastify.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = loginSchema.safeParse(request.body)
    if (!body.success) {
      return reply.code(400).send({ error: 'Invalid request', details: body.error.errors })
    }

    const { email, password } = body.data

    const result = await db.query<{ id: string; email: string; name: string | null; avatar_url: string | null; password_hash: string; created_at: string }>(
      'SELECT id, email, name, avatar_url, password_hash, created_at FROM users WHERE email = $1',
      [email]
    )

    if (result.rows.length === 0) {
      return reply.code(401).send({ error: 'Invalid email or password' })
    }

    const user = result.rows[0]
    const passwordMatch = await bcrypt.compare(password, user.password_hash)

    if (!passwordMatch) {
      return reply.code(401).send({ error: 'Invalid email or password' })
    }

    const token = fastify.jwt.sign(
      { userId: user.id, email: user.email },
      { expiresIn: process.env.JWT_EXPIRY || '7d' }
    )

    return reply.send({
      user: { id: user.id, email: user.email, name: user.name, avatar_url: user.avatar_url, created_at: user.created_at },
      token,
    })
  })

  // POST /api/auth/logout
  fastify.post('/logout', async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ message: 'Logged out successfully' })
  })

  // GET /api/auth/me
  fastify.get(
    '/me',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const payload = request.user as { userId: string; email: string }

      const result = await db.query<{ id: string; email: string; name: string | null; avatar_url: string | null; created_at: string }>(
        'SELECT id, email, name, avatar_url, created_at FROM users WHERE id = $1',
        [payload.userId]
      )

      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'User not found' })
      }

      const user = result.rows[0]

      // Get workspace memberships
      const workspaces = await db.query<{ id: string; name: string; slug: string; role: string }>(
        `SELECT w.id, w.name, w.slug, wm.role
         FROM workspaces w
         JOIN workspace_members wm ON wm.workspace_id = w.id
         WHERE wm.user_id = $1 AND w.deleted_at IS NULL`,
        [payload.userId]
      )

      return reply.send({
        user: { ...user },
        workspaces: workspaces.rows,
      })
    }
  )
}
