import { FastifyInstance } from 'fastify';
import { container } from '@infrastructure/container';

export async function redirectRoutes(app: FastifyInstance) {
  const { urlController } = container;

  app.get('/:shortCode', {
    schema: {
      tags: ['redirect'],
      description: 'Redireciona para a URL original',
      params: {
        type: 'object',
        properties: {
          shortCode: { type: 'string' }
        }
      }
    }
  }, urlController.redirect.bind(urlController));
}