import { buildApp } from './app';

async function start() {
  const app = await buildApp({
    logger: {
      level: 'info',
      transport: {
        target: 'pino-pretty'
      }
    }
  });

  try {
    await app.listen({ port: 3000, host: '0.0.0.0' });
    app.log.info('Server running at http://localhost:3000');
    app.log.info('Documentation available at http://localhost:3000/docs');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();