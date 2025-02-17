import { FastifyInstance } from 'fastify';
import { container } from '@infrastructure/container/index';
import { authMiddleware } from '../middlewares/auth';

interface IParams {
  Params: {
    shortCode: string;
  }
}

export async function urlRoutes(app: FastifyInstance) {
  const urlController = container.urlController;

  // Public routes

  app.get<IParams>('/:shortCode', {
    schema: {
      tags: ['urls'],
      description: 'Redireciona para a URL original',
      params: {
        type: 'object',
        properties: {
          shortCode: { type: 'string' }
        }
      }
    }
  }, urlController.redirect.bind(urlController));

  app.register(async (appWithPrefix) => {
    appWithPrefix.post('/shorten', {
      schema: {
        tags: ['urls'],
        description: 'Cria uma URL encurtada',
        body: {
          type: 'object',
          required: ['originalUrl'],
          properties: {
            originalUrl: { 
              type: 'string', 
              format: 'uri',
              description: 'URL que será encurtada (deve começar com http:// ou https://)'
            },
            expiresAt: { 
              type: 'string', 
              format: 'date-time',
              description: 'Data de expiração da URL (opcional)'
            }
          }
        },
        response: {
          201: {
            description: 'URL encurtada criada com sucesso',
            type: 'object',
            properties: {
              shortCode: { type: 'string' },
              shortUrl: { type: 'string' },
              originalUrl: { type: 'string' },
              expiresAt: { type: 'string', format: 'date-time', nullable: true }
            }
          },
          400: {
            description: 'Erro de validação',
            type: 'object',
            properties: {
              status: { type: 'string' },
              message: { type: 'string' },
              errors: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    field: { type: 'string' },
                    message: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    }, urlController.create.bind(urlController));
  
    // Protected routes
    appWithPrefix.get<IParams>('/stats/:shortCode', {
      schema: {
        tags: ['urls'],
        description: 'Retorna estatísticas da URL encurtada',
        security: [{ apiKey: [] }],
        params: {
          type: 'object',
          properties: {
            shortCode: { type: 'string' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              visits: { type: 'number' },
              createdAt: { type: 'string', format: 'date-time' },
              lastAccess: { type: 'string', format: 'date-time', nullable: true }
            }
          }
        }
      },
      preHandler: [authMiddleware]
    }, urlController.getStats.bind(urlController));
  }, {prefix: '/api'})
}