import { FastifyRequest, FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit'

export const configureRateLimit = async (app: FastifyInstance): Promise<void> => {
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    keyGenerator: (req: FastifyRequest): string => {
      const forwarded = req.headers['x-forwarded-for'];
      return (
        Array.isArray(forwarded) 
          ? forwarded[0] 
          : (forwarded || req.ip)
      ).toString();
    }
  });
};