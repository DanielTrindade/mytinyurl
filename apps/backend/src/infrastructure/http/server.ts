import Fastify from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { urlRoutes } from '@infrastructure/http/routes/url.routes';
import { errorHandler } from '@infrastructure/http/middlewares/errorHandler';
import cors from '@fastify/cors';
import { configureRateLimit } from './middlewares/RateLimit';
const app = Fastify({
  logger: true
});

//cors config
app.register(cors, {
  origin: ['http://localhost:5173', 'http://frontend:5173'], // URL do frontend Vite
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Métodos permitidos
  allowedHeaders: ['Content-Type', 'x-api-key'], // Headers permitidos
  credentials: true, // Permite envio de cookies/credenciais
  maxAge: 600, // Cache das preflight requests (em segundos)
  exposedHeaders: ['X-Total-Count'], // Headers expostos ao cliente
  preflightContinue: false, // Controle de preflight requests
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

// Registra as rotas da API com prefixo /api
app.register(urlRoutes);

// Error handler global
app.setErrorHandler(errorHandler);

// Health check
app.get('/health', async () => {
  return { status: 'ok' };
});

const start = async () => {
  try {
    //registra o rate limit antes das rotas
    await configureRateLimit(app);
    await app.listen({ port: 3000, host: '0.0.0.0' });
    app.log.info('Server running at http://localhost:3000');
    app.log.info('Documentation available at http://localhost:3000/docs');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();