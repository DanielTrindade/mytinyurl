import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../config/env';

async function runMigrations() {
    console.log('⏳ Running migrations on all shards...');

    for (let i = 0; i < env.DATABASE_URLS.length; i++) {
        const url = env.DATABASE_URLS[i];
        console.log(`  📦 Shard ${i}: migrating...`);

        const client = postgres(url, { max: 1 });
        const db = drizzle(client);

        await migrate(db, { migrationsFolder: './drizzle' });
        await client.end();

        console.log(`  ✅ Shard ${i}: done`);
    }

    console.log('✅ All shard migrations completed!');
    process.exit(0);
}

runMigrations().catch((err) => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
});
