import Fastify, { FastifyInstance } from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { urlRoutes } from './routes/url.routes';
import { errorHandler } from './middlewares/errorHandler';
import cors from '@fastify/cors';
import { configureRateLimit } from './middlewares/RateLimit';

export async function buildApp(opts = {}): Promise<FastifyInstance> {
  const app = Fastify(opts);

  // cors config
  await app.register(cors, {
    origin: ['http://localhost:5173', 'http://frontend:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-api-key'],
    credentials: true,
    maxAge: 600,
    exposedHeaders: ['X-Total-Count'],
    preflightContinue: false,
  });

  // Swagger Config
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'MyTinyURL API',
        description: 'API para encurtar URLs',
        version: '1.0.0'
      },
      servers: [{
        url: 'http://localhost:3000',
        description: 'Desenvolvimento'
      }],
      tags: [
        { name: 'urls', description: 'Endpoints de URLs' }
      ],
      components: {
        securitySchemes: {
          apiKey: {
            type: 'apiKey',
            name: 'x-api-key',
            in: 'header'
          }
        }
      }
    }
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false
    },
    staticCSP: true
  });

  // Registra as rotas da API com prefixo /api
  await app.register(urlRoutes);

  // Error handler global
  app.setErrorHandler(errorHandler);

  // Health check
  app.get('/health', async () => {
    return { status: 'ok' };
  });

  // Registra o rate limit
  await configureRateLimit(app);

  return app;
}