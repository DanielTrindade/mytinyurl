import 'dotenv/config';
import Fastify from 'fastify';
import swagger from '@fastify/swagger';
import ScalarApiReference from '@scalar/fastify-api-reference';
import { urlRoutes } from '@infrastructure/http/routes/url.routes';
import { errorHandler } from '@infrastructure/http/middlewares/errorHandler';
import { redirectRoutes } from '@infrastructure/http/routes/redirect.route';
import { container } from '@infrastructure/container';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';

const app = Fastify({
  logger: true
});

// Security Headers
app.register(helmet);

// Rate Limiting
app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute'
});

// CORS config — environment-based origins
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://frontend:5173'];

app.register(cors, {
  origin: corsOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-api-key'],
  credentials: true,
  maxAge: 600,
  exposedHeaders: ['X-Total-Count'],
  preflightContinue: false,
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
      url: process.env.APP_URL || 'http://localhost:3000',
      description: process.env.NODE_ENV === 'production' ? 'Produção' : 'Desenvolvimento'
    }],
    tags: [
      { name: 'urls', description: 'Endpoints de URLs' },
      { name: 'redirect', description: 'Redirecionamento de URLs' }
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

app.register(ScalarApiReference, {
  routePrefix: '/docs',
  configuration: {
    title: 'MyTinyURL API',
  },
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

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  app.log.info(`Received ${signal}. Starting graceful shutdown...`);
  try {
    await app.close();
    await container.prisma.$disconnect();
    app.log.info('Graceful shutdown complete.');
    process.exit(0);
  } catch (err) {
    app.log.error(`Error during shutdown: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3000;
    await app.listen({ port, host: '0.0.0.0' });
    app.log.info(`Server running at http://localhost:${port}`);
    app.log.info(`Documentation available at http://localhost:${port}/docs`);
  } catch (err) {
    app.log.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
};

start();