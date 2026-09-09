-- PostgreSQL schema for Rajshree Electronics
-- Every statement is idempotent (IF NOT EXISTS) — safe to run on every startup.

-- pg_trgm enables GIN-powered ILIKE / LIKE '%search%' on the name column.
-- Available on Neon, Render, and most hosted PostgreSQL providers.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS products (
  id             SERIAL          PRIMARY KEY,
  name           VARCHAR(200)    NOT NULL,
  category       VARCHAR(50)     NOT NULL,
  price          NUMERIC(10,2)   NOT NULL,
  original_price NUMERIC(10,2),
  brand          VARCHAR(100),
  rating         NUMERIC(3,1)    DEFAULT 0,
  reviews        INTEGER         DEFAULT 0,
  stock          BOOLEAN         DEFAULT TRUE,
  image_url      TEXT            DEFAULT '',
  specs          JSONB           DEFAULT '{}',
  delivery_note  TEXT            DEFAULT 'Usually delivered in 1-2 days',
  color          VARCHAR(200)    DEFAULT '',
  created_at     TIMESTAMPTZ     DEFAULT NOW()
);

-- Speeds up the category filter used on every storefront page load
CREATE INDEX IF NOT EXISTS idx_products_category
  ON products (LOWER(category));

-- Trigram index makes LIKE '%search_term%' fast even with a leading wildcard
CREATE INDEX IF NOT EXISTS idx_products_name_trgm
  ON products USING GIN (name gin_trgm_ops);

-- Speeds up in-stock / out-of-stock filtering
CREATE INDEX IF NOT EXISTS idx_products_stock
  ON products (stock);

-- Single-row settings table; the CHECK ensures only id=1 can exist
CREATE TABLE IF NOT EXISTS admin_settings (
  id            INTEGER  PRIMARY KEY CHECK (id = 1),
  password_hash TEXT     NOT NULL
);
