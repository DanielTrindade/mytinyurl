import { buildApp } from './app';
import { urlService } from './modules/url/url.service';
import { cacheService } from './cache/redis';
import { eventProducer } from './events/producer';
import { shardRouter } from './db';
import { env } from './config/env';

const app = buildApp({
    config: env,
    urlService,
    getCacheMetrics: () => cacheService.getMetrics(),
    getEventMetrics: () => eventProducer.getMetrics(),
    getShardCount: () => shardRouter.shardCount,
});

app.listen(env.PORT);

console.log(`MyTinyURL API running at http://${app.server?.hostname}:${app.server?.port}`);

if (env.ENABLE_DOCS) {
    console.log(`Docs available at http://${app.server?.hostname}:${app.server?.port}/docs`);
}

export type App = typeof app;
