import type { FastifyRequest } from 'fastify'

export interface JwtPayload {
  userId: string
  email: string
  iat?: number
  exp?: number
}

export interface AuthenticatedRequest extends FastifyRequest {
  user: JwtPayload
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: import('fastify').FastifyReply) => Promise<void>
  }
}
