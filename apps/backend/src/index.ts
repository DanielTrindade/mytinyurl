import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { urlRoutes, redirectRoutes } from './modules/url/url.routes';
import { errorHandler } from './middleware/error-handler';
import { env } from './config/env';

const app = new Elysia()
  .use(errorHandler)
  .use(
    cors({
      origin: env.CORS_ORIGINS,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type'],
      credentials: true,
    })
  )
  .use(
    swagger({
      path: '/docs',
      documentation: {
        info: {
          title: 'MyTinyURL API',
          description: 'URL Shortener API — Distributed Systems Edition',
          version: '2.0.0',
        },
        tags: [
          { name: 'URLs', description: 'URL shortening endpoints' },
          { name: 'Redirect', description: 'URL redirection' },
          { name: 'System', description: 'System endpoints' },
        ],
      },
    })
  )
  .use(urlRoutes)
  .use(redirectRoutes)
  .listen(env.PORT);

console.log(
  `🦊 MyTinyURL API running at http://${app.server?.hostname}:${app.server?.port}`
);
console.log(
  `📚 Docs available at http://${app.server?.hostname}:${app.server?.port}/docs`
);

export type App = typeof app;
