-- drizzle/0007_add_fts_columns.sql
-- Apply manually via psql — NEVER via drizzle-kit migrate.
--   psql "$DATABASE_URL_UNPOOLED" -f drizzle/0007_add_fts_columns.sql
--
-- Reason: GENERATED ALWAYS AS ... STORED with a custom text search config is not
-- supported by Drizzle's schema DSL. CREATE INDEX CONCURRENTLY also requires
-- running outside a transaction block.
--
-- FTS config is named 'polish_unaccent' — this name is canonical and must match:
--   - AI-06 hybrid search (websearch_to_tsquery('polish_unaccent', ...))
--   - BE-07 search API
--   - DEPLOY-02 production setup
-- (FULLSTACK-REVIEW ISSUE-C1 / ISSUE-W11)

-- ── 1. Create Polish FTS configuration with accent folding ────────────────────
-- COPY = simple: start from the simple dictionary (no stemming — Polish stemming
-- in PostgreSQL is poor; simple token matching + unaccent is more reliable).
CREATE TEXT SEARCH CONFIGURATION IF NOT EXISTS polish_unaccent (COPY = simple);

ALTER TEXT SEARCH CONFIGURATION polish_unaccent
  ALTER MAPPING FOR hword, hword_part, word
  WITH unaccent, simple;

-- ── 2. listings.fts ───────────────────────────────────────────────────────────
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (
    to_tsvector('polish_unaccent',
      coalesce(title,       '') || ' ' ||
      coalesce(description, '') || ' ' ||
      coalesce(location,    '')
    )
  ) STORED;

CREATE INDEX CONCURRENTLY IF NOT EXISTS listings_fts_gin
  ON listings USING GIN (fts);

-- ── 3. jobs.fts ───────────────────────────────────────────────────────────────
-- Includes location and tech_stack so queries like "React Warsaw" and
-- "TypeScript remote" match via FTS without relying solely on URL params.
-- array_to_string handles NULL tech_stack arrays (returns '' not NULL).
-- (FULLSTACK-REVIEW ISSUE-W4 / QA-expert fix)
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (
    to_tsvector('polish_unaccent',
      coalesce(title,                           '') || ' ' ||
      coalesce(description,                     '') || ' ' ||
      coalesce(company,                         '') || ' ' ||
      coalesce(location,                        '') || ' ' ||
      coalesce(array_to_string(tech_stack, ' '), '')
    )
  ) STORED;

CREATE INDEX CONCURRENTLY IF NOT EXISTS jobs_fts_gin
  ON jobs USING GIN (fts);
