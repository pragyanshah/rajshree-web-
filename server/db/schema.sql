CREATE TABLE IF NOT EXISTS products (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  name           TEXT    NOT NULL,
  category       TEXT    NOT NULL,
  price          INTEGER NOT NULL,
  original_price INTEGER,
  brand          TEXT,
  rating         REAL    DEFAULT 0,
  reviews        INTEGER DEFAULT 0,
  stock          INTEGER DEFAULT 1,
  image_url      TEXT    DEFAULT "",
  specs          TEXT    DEFAULT "{}",
  delivery_note  TEXT    DEFAULT "Usually delivered in 1-2 days",
  color          TEXT    DEFAULT "",
  created_at     TEXT
);

CREATE TABLE IF NOT EXISTS admin_settings (
  id            INTEGER PRIMARY KEY CHECK (id = 1),
  password_hash TEXT    NOT NULL
);
