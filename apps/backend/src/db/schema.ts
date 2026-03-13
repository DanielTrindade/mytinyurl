import {
    pgTable,
    uuid,
    text,
    varchar,
    integer,
    boolean,
    timestamp,
} from 'drizzle-orm/pg-core';

export const urls = pgTable('urls', {
    id: uuid('id').defaultRandom().primaryKey(),
    originalUrl: text('original_url').notNull(),
    shortCode: varchar('short_code', { length: 10 }).unique().notNull(),
    statsToken: varchar('stats_token', { length: 64 }).notNull(),
    visits: integer('visits').default(0).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
});

// Inferred types from the schema
export type Url = typeof urls.$inferSelect;
export type NewUrl = typeof urls.$inferInsert;
