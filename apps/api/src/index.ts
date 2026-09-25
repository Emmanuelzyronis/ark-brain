import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import dotenv from 'dotenv'

dotenv.config()

const fastify = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
  },
})

// Plugins
await fastify.register(cors, {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
})

await fastify.register(jwt, {
  secret: process.env.JWT_SECRET || 'ark-brain-super-secret-jwt-key-change-in-production-64chars',
})

// Auth middleware decorator
fastify.decorate('authenticate', async function (request: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) {
  try {
    await request.jwtVerify()
  } catch {
    reply.code(401).send({ error: 'Unauthorized' })
  }
})

// Routes
import { authRoutes } from './routes/auth.js'
import { workspaceRoutes } from './routes/workspaces.js'
import { connectorRoutes } from './routes/connectors.js'
import { chatRoutes } from './routes/chat.js'
import { knowledgeRoutes } from './routes/knowledge.js'

await fastify.register(authRoutes, { prefix: '/api/auth' })
await fastify.register(workspaceRoutes, { prefix: '/api/workspaces' })
await fastify.register(connectorRoutes, { prefix: '/api/workspaces' })
await fastify.register(chatRoutes, { prefix: '/api/workspaces' })
await fastify.register(knowledgeRoutes, { prefix: '/api/workspaces' })

// Health check
fastify.get('/api/health', async () => ({
  status: 'ok',
  service: 'ark-brain-api',
  timestamp: new Date().toISOString(),
  version: '0.1.0',
}))

// OAuth redirect stubs (full OAuth requires registered app credentials)
fastify.get('/api/oauth/:source/authorize', async (request, reply) => {
  const params = request.params as { source: string }
  const query = request.query as { workspace_id?: string }

  // In production, redirect to actual OAuth URL
  // For demo, return the OAuth URL the frontend should open
  const oauthUrls: Record<string, string> = {
    slack: `https://slack.com/oauth/v2/authorize?client_id=${process.env.SLACK_CLIENT_ID || 'demo'}&scope=channels:history,channels:read&redirect_uri=${encodeURIComponent(process.env.SLACK_REDIRECT_URI || 'http://localhost:3001/api/oauth/slack/callback')}`,
    github: `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID || 'demo'}&scope=repo,read:org&redirect_uri=${encodeURIComponent(process.env.GITHUB_REDIRECT_URI || 'http://localhost:3001/api/oauth/github/callback')}`,
    notion: `https://api.notion.com/v1/oauth/authorize?client_id=${process.env.NOTION_CLIENT_ID || 'demo'}&response_type=code&redirect_uri=${encodeURIComponent(process.env.NOTION_REDIRECT_URI || 'http://localhost:3001/api/oauth/notion/callback')}`,
    confluence: `https://auth.atlassian.com/authorize?audience=api.atlassian.com&client_id=${process.env.CONFLUENCE_CLIENT_ID || 'demo'}&scope=read:confluence-content.all&redirect_uri=${encodeURIComponent(process.env.CONFLUENCE_REDIRECT_URI || 'http://localhost:3001/api/oauth/confluence/callback')}&response_type=code`,
    gdrive: `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GDRIVE_CLIENT_ID || 'demo'}&scope=https://www.googleapis.com/auth/drive.readonly&redirect_uri=${encodeURIComponent(process.env.GDRIVE_REDIRECT_URI || 'http://localhost:3001/api/oauth/gdrive/callback')}&response_type=code`,
  }

  const url = oauthUrls[params.source]
  if (!url) return reply.code(400).send({ error: 'Invalid source' })

  return reply.send({ oauth_url: url, workspace_id: query.workspace_id })
})

// Webhook handlers
fastify.post('/api/webhooks/slack', async (request, reply) => {
  const body = request.body as { type?: string; challenge?: string }
  if (body?.type === 'url_verification') {
    return reply.send({ challenge: body.challenge })
  }
  return reply.send({ ok: true })
})

fastify.post('/api/webhooks/github', async (_request, reply) => {
  return reply.send({ ok: true })
})

fastify.post('/api/webhooks/notion', async (_request, reply) => {
  return reply.send({ ok: true })
})

const port = parseInt(process.env.PORT || '3001')

try {
  await fastify.listen({ port, host: '0.0.0.0' })
  console.log(`ArkBrain API running on http://localhost:${port}`)
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}
