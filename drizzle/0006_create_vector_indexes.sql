-- drizzle/0006_create_vector_indexes.sql
-- Apply manually via psql — NEVER via drizzle-kit migrate.
--   psql "$DATABASE_URL_UNPOOLED" -f drizzle/0006_create_vector_indexes.sql
--
-- CREATE INDEX CONCURRENTLY cannot run inside a transaction block.
-- drizzle-kit migrate wraps every migration in a transaction — running this
-- file through drizzle-kit will fail with:
--   "ERROR: CREATE INDEX CONCURRENTLY cannot run inside a transaction block"
--
-- m=16, ef_construction=64 are recommended defaults for < 1M rows.
-- Recall vs build-time trade-off: increase ef_construction for higher recall
-- at the cost of longer index build time.
--
-- At query time, set hnsw.ef_search = 100 via set_config() CTE (not SET command)
-- because the Neon HTTP driver is stateless and SET is not persisted across calls.
-- See AI-06 hybrid search implementation for the _config CTE pattern.

CREATE INDEX CONCURRENTLY IF NOT EXISTS listings_embedding_hnsw
  ON listings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX CONCURRENTLY IF NOT EXISTS jobs_embedding_hnsw
  ON jobs
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX CONCURRENTLY IF NOT EXISTS watches_criteria_embedding_hnsw
  ON watches
  USING hnsw (criteria_embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
