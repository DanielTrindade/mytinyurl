import Fastify from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { urlRoutes } from './routes/url.routes';
import { errorHandler } from './middlewares/errorHandler';
import { redirectRoutes } from './routes/redirect.route';

const app = Fastify({
  logger: true
});

// Swagger Config
app.register(swagger, {
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

app.register(swaggerUi, {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: false
  },
  staticCSP: true
});

// Registra as rotas de redirecionamento
app.register(redirectRoutes);
// Registra as rotas da API com prefixo /api
app.register(urlRoutes, { prefix: '/api' });

// Error handler global
app.setErrorHandler(errorHandler);

// Health check
app.get('/health', async () => {
  return { status: 'ok' };
});

const start = async () => {
  try {
    await app.listen({ port: 3000, host: '0.0.0.0' });
    app.log.info('Server running at http://localhost:3000');
    app.log.info('Documentation available at http://localhost:3000/docs');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();