-- drizzle/0000_enable_extensions.sql
-- Apply manually before running drizzle-kit migrate:
--   psql "$DATABASE_URL_UNPOOLED" -f drizzle/0000_enable_extensions.sql
--
-- drizzle-kit does not auto-generate CREATE EXTENSION statements.
-- Both extensions must exist before any migration that references vector(768)
-- or the polish_unaccent text search configuration.

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS unaccent;
