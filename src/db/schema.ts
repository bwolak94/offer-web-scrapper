import {
  pgTable,
  pgEnum,
  uuid,
  text,
  numeric,
  integer,
  boolean,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
  vector,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ─── Enums ────────────────────────────────────────────────────────────────────
// Enums must be defined before any table that references them.

export const categoryEnum    = pgEnum('category',     ['sale', 'rent_long', 'rent_short'])
export const refTypeEnum     = pgEnum('ref_type',     ['listing', 'job'])
export const watchTypeEnum   = pgEnum('watch_type',   ['listing', 'job'])
export const scoreStatusEnum = pgEnum('score_status', ['pending', 'scored', 'failed'])
export const channelEnum     = pgEnum('channel',      ['email', 'webhook'])

// ─── listings ─────────────────────────────────────────────────────────────────

export const listings = pgTable('listings', {
  id:           uuid('id').primaryKey().defaultRandom(),
  category:     categoryEnum('category').notNull(),
  source:       text('source').notNull(),
  url:          text('url').notNull(),
  title:        text('title').notNull(),
  price:        numeric('price',   { precision: 12, scale: 2 }),
  currency:     text('currency').default('PLN'),
  area_m2:      numeric('area_m2', { precision: 8,  scale: 2 }),
  rooms:        integer('rooms'),
  location:     text('location'),
  lat:          numeric('lat', { precision: 10, scale: 7 }),
  lng:          numeric('lng', { precision: 10, scale: 7 }),
  description:  text('description'),
  images:       text('images').array(),
  ai_score:     integer('ai_score'),
  score_status: scoreStatusEnum('score_status').notNull().default('pending'),
  scored_at:    timestamp('scored_at',  { withTimezone: true }),
  // embedding is generated asynchronously — must NOT be notNull()
  embedding:    vector('embedding', { dimensions: 768 }),
  // content_hash is computed at scrape time and used to detect changes.
  // notNull() is intentional: every row must have a hash for upsert dedup.
  content_hash: text('content_hash').notNull(),
  // fts (tsvector) is GENERATED ALWAYS AS ... STORED using the 'polish_unaccent'
  // text search config. Added via manual migration drizzle/0007_add_fts_columns.sql
  // because Drizzle's schema DSL does not support GENERATED ALWAYS columns with
  // custom text search configurations. DO NOT add it here.
  scraped_at:   timestamp('scraped_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at:   timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  urlIdx:             uniqueIndex('listings_url_idx').on(t.url),
  categoryScrapedIdx: index('listings_category_scraped_idx').on(t.category, t.scraped_at),
  sourceIdx:          index('listings_source_idx').on(t.source),
  aiScoreIdx:         index('listings_ai_score_idx').on(t.ai_score),
  scoreStatusIdx:     index('listings_score_status_idx').on(t.score_status),
  locationIdx:        index('listings_location_idx').on(t.location),
}))

// ─── jobs ─────────────────────────────────────────────────────────────────────

export const jobs = pgTable('jobs', {
  id:              uuid('id').primaryKey().defaultRandom(),
  source:          text('source').notNull(),
  url:             text('url').notNull(),
  title:           text('title').notNull(),
  company:         text('company'),
  location:        text('location'),
  salary_min:      numeric('salary_min', { precision: 10, scale: 2 }),
  salary_max:      numeric('salary_max', { precision: 10, scale: 2 }),
  currency:        text('currency').default('PLN'),
  employment_type: text('employment_type'),
  tech_stack:      text('tech_stack').array(),
  remote:          boolean('remote'),
  description:     text('description'),
  ai_score:        integer('ai_score'),
  score_status:    scoreStatusEnum('score_status').notNull().default('pending'),
  scored_at:       timestamp('scored_at',  { withTimezone: true }),
  embedding:       vector('embedding', { dimensions: 768 }),
  content_hash:    text('content_hash').notNull(),
  // fts: see listings comment above — added via drizzle/0007_add_fts_columns.sql
  // Includes location + array_to_string(tech_stack,' ') so queries like
  // "React Warsaw" and "TypeScript remote" match via FTS. (FULLSTACK-REVIEW ISSUE-W4)
  scraped_at:      timestamp('scraped_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at:      timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  urlIdx:         uniqueIndex('jobs_url_idx').on(t.url),
  sourceIdx:      index('jobs_source_idx').on(t.source),
  aiScoreIdx:     index('jobs_ai_score_idx').on(t.ai_score),
  scoreStatusIdx: index('jobs_score_status_idx').on(t.score_status),
  locationIdx:    index('jobs_location_idx').on(t.location),
  scrapedAtIdx:   index('jobs_scraped_at_idx').on(t.scraped_at),
}))

// ─── watches ──────────────────────────────────────────────────────────────────

export const watches = pgTable('watches', {
  id:                 uuid('id').primaryKey().defaultRandom(),
  type:               watchTypeEnum('type').notNull(),
  filters:            jsonb('filters').notNull().default({}),
  criteria:           text('criteria'),
  // criteria_embedding is used for the Stage 1 vector pre-filter in the two-stage
  // watch evaluation. Generated async when criteria text is provided.
  criteria_embedding: vector('criteria_embedding', { dimensions: 768 }),
  min_score:          integer('min_score').notNull().default(70),
  notify_email:       text('notify_email'),
  notify_webhook:     text('notify_webhook'),
  active:             boolean('active').notNull().default(true),
  created_at:         timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at:         timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ─── snapshots ────────────────────────────────────────────────────────────────

export const snapshots = pgTable('snapshots', {
  id:         uuid('id').primaryKey().defaultRandom(),
  ref_id:     uuid('ref_id').notNull(),
  ref_type:   refTypeEnum('ref_type').notNull(),
  diff:       jsonb('diff').notNull(),
  snapped_at: timestamp('snapped_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  refIdx:       index('snapshots_ref_idx').on(t.ref_id, t.ref_type),
  snappedAtIdx: index('snapshots_snapped_at_idx').on(t.snapped_at),
}))

// ─── score_cache ──────────────────────────────────────────────────────────────

export const scoreCache = pgTable('score_cache', {
  id:            uuid('id').primaryKey().defaultRandom(),
  ref_id:        uuid('ref_id').notNull(),
  ref_type:      refTypeEnum('ref_type').notNull(),
  criteria_hash: text('criteria_hash').notNull(),
  model:         text('model').notNull(),
  score:         integer('score').notNull(),
  reason:        text('reason'),
  created_at:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqueEntry: uniqueIndex('score_cache_unique_idx').on(t.ref_id, t.ref_type, t.criteria_hash),
}))

// ─── notification_log ─────────────────────────────────────────────────────────
// Was absent from the original schema.md — added here to support notification
// deduplication. Without this table, QStash retries can send duplicate emails.
// (PLAN_REVIEW Issue 5.3)

export const notificationLog = pgTable('notification_log', {
  id:       uuid('id').primaryKey().defaultRandom(),
  watch_id: uuid('watch_id').notNull().references(() => watches.id, { onDelete: 'cascade' }),
  ref_id:   uuid('ref_id').notNull(),
  ref_type: refTypeEnum('ref_type').notNull(),
  channel:  channelEnum('channel').notNull(),
  sent_at:  timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  // uniqueIndex prevents duplicate notifications for the same (watch, item) pair.
  // QStash retry logic could otherwise deliver the same notification multiple times.
  uniqueWatchRef: uniqueIndex('notification_log_unique_watch_ref_idx').on(t.watch_id, t.ref_id),
  sentAtIdx:      index('notification_log_sent_at_idx').on(t.sent_at),
}))

// ─── Relations ────────────────────────────────────────────────────────────────

export const listingsRelations = relations(listings, ({ many }) => ({
  snapshots: many(snapshots),
}))

export const jobsRelations = relations(jobs, ({ many }) => ({
  snapshots: many(snapshots),
}))

export const watchesRelations = relations(watches, ({ many }) => ({
  notificationLogs: many(notificationLog),
}))

export const notificationLogRelations = relations(notificationLog, ({ one }) => ({
  watch: one(watches, { fields: [notificationLog.watch_id], references: [watches.id] }),
}))
