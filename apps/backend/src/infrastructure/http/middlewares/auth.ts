import { FastifyRequest, FastifyReply } from 'fastify';

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const apiKey = request.headers['x-api-key'];
  
  if (!apiKey || typeof apiKey !== 'string' || apiKey !== process.env.API_KEY) {
    return reply.status(401).send({
      status: 'error',
      message: 'Não autorizado'
    });
  }
}
