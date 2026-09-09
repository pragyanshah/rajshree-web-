/**
 * database.js — PostgreSQL data-access layer using node-postgres (pg).
 *
 * Connects via the DATABASE_URL environment variable.
 * All exported functions are async.
 * Schema, indexes, and seed data are created automatically on first startup.
 *
 * SSL is enabled automatically for hosted providers (Neon, Render, etc.)
 * and disabled when DATABASE_URL points to localhost / 127.0.0.1.
 */

const { Pool } = require("pg");
const fs       = require("fs");
const path     = require("path");

/* ─── Connection pool ──────────────────────────────────────────────────────
   Hosted PostgreSQL providers (Neon, Render) require SSL.
   Local installs usually don't — we detect which we're talking to by URL.
   rejectUnauthorized:false accepts the self-signed certs these providers use.
   ───────────────────────────────────────────────────────────────────────── */
const isHosted =
  !!process.env.DATABASE_URL &&
  !process.env.DATABASE_URL.includes("localhost") &&
  !process.env.DATABASE_URL.includes("127.0.0.1");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isHosted ? { rejectUnauthorized: false } : false,
});

/* ─── Product shape normaliser ─────────────────────────────────────────────
   pg returns native JS types from PostgreSQL columns:
     BOOLEAN  → boolean   (no need to convert 0/1)
     JSONB    → parsed object (specs already an object)
     NUMERIC  → string    ← must be cast to Number
   ───────────────────────────────────────────────────────────────────────── */
function parseProduct(row) {
  if (!row) return null;
  return {
    ...row,
    price:          Number(row.price),
    original_price: row.original_price !== null && row.original_price !== undefined
                      ? Number(row.original_price) : null,
    rating:         Number(row.rating),
    reviews:        Number(row.reviews),
    stock:          Boolean(row.stock),
    specs:          typeof row.specs === "object" && row.specs !== null
                      ? row.specs
                      : (() => { try { return JSON.parse(row.specs || "{}"); } catch { return {}; } })()
  };
}

/* ─── Seed data ─────────────────────────────────────────────────────────── */
const SEED_PRODUCTS = [
  {
    name: "Samsung Galaxy S24 5G (Onyx Black, 256GB)", category: "mobiles",
    price: 74999, original_price: 79999, brand: "Samsung", rating: 4.8, reviews: 142, stock: true,
    image_url: "",
    specs: { "Display": "6.2\" Dynamic AMOLED 2X", "Processor": "Exynos 2400", "RAM": "8GB", "Battery": "4000 mAh", "Warranty": "1 Year Official Brand Warranty" },
    delivery_note: "Free delivery in Mehsana within 24 hours"
  },
  {
    name: "iPhone 15 (128GB, Black)", category: "mobiles",
    price: 79900, original_price: 84900, brand: "Apple", rating: 4.9, reviews: 98, stock: true,
    image_url: "",
    specs: { "Display": "6.1\" Super Retina XDR OLED", "Chip": "Apple A16 Bionic", "Camera": "48MP main + 12MP ultrawide", "Warranty": "1 Year Apple India Warranty" },
    delivery_note: "Same-day in-store pickup available"
  },
  {
    name: "OnePlus Nord CE4 5G (Dark Chrome, 128GB)", category: "mobiles",
    price: 24999, original_price: 26999, brand: "OnePlus", rating: 4.6, reviews: 89, stock: true,
    image_url: "",
    specs: { "Display": "6.7\" 120Hz AMOLED", "Charging": "100W SUPERVOOC", "Camera": "50MP Sony LYT-600", "Warranty": "1 Year Official Brand Warranty" },
    delivery_note: "Same day in-store pickup or local delivery"
  },
  {
    name: "Redmi Note 13 Pro 5G (Aurora Purple, 256GB)", category: "mobiles",
    price: 29999, original_price: 32999, brand: "Xiaomi", rating: 4.5, reviews: 203, stock: true,
    image_url: "",
    specs: { "Display": "6.67\" 120Hz AMOLED", "Camera": "200MP OIS main sensor", "Charging": "67W Turbo Charge", "Warranty": "1 Year Official Warranty" },
    delivery_note: "Usually delivered in 1-2 days"
  },
  {
    name: "HP 15s Intel Core i5 12th Gen Laptop (16GB/512GB SSD)", category: "laptops",
    price: 52990, original_price: 59990, brand: "HP", rating: 4.7, reviews: 64, stock: true,
    image_url: "",
    specs: { "Processor": "Intel Core i5-1235U", "RAM": "16GB DDR4", "Storage": "512GB NVMe SSD", "OS": "Windows 11 Home + MS Office" },
    delivery_note: "Free unboxing and setup at your home"
  },
  {
    name: "Lenovo IdeaPad Slim 3 Ryzen 5 (8GB/512GB SSD)", category: "laptops",
    price: 44990, original_price: 52990, brand: "Lenovo", rating: 4.6, reviews: 51, stock: true,
    image_url: "",
    specs: { "Processor": "AMD Ryzen 5 7520U", "RAM": "8GB LPDDR5", "Storage": "512GB NVMe SSD", "Display": "15.6\" FHD IPS Anti-glare" },
    delivery_note: "Free delivery and demo"
  },
  {
    name: "Sony Bravia 43\" 4K Ultra HD Smart LED Google TV", category: "tvs",
    price: 39990, original_price: 49900, brand: "Sony", rating: 4.9, reviews: 110, stock: true,
    image_url: "",
    specs: { "Resolution": "4K Ultra HD (3840x2160)", "Sound": "20W Dolby Audio", "Smart TV": "Google TV with Voice Remote", "Warranty": "2 Years Official Warranty" },
    delivery_note: "Free wall-mount installation included"
  },
  {
    name: "LG 43\" 4K UHD AI ThinQ Smart LED TV", category: "tvs",
    price: 34990, original_price: 42990, brand: "LG", rating: 4.7, reviews: 87, stock: false,
    image_url: "",
    specs: { "Resolution": "4K Ultra HD", "Sound": "20W with DTS Virtual X", "Smart TV": "webOS with Magic Remote", "Warranty": "2 Years" },
    delivery_note: "Free delivery and wall-mounting"
  },
  {
    name: "boAt Aavante Bar 1500 120W Bluetooth Soundbar", category: "audio",
    price: 5999, original_price: 9990, brand: "boAt", rating: 4.5, reviews: 215, stock: true,
    image_url: "",
    specs: { "Output": "120W RMS with wired subwoofer", "Connectivity": "Bluetooth 5.0, AUX, USB, Optical, HDMI ARC", "Warranty": "1 Year" },
    delivery_note: "Usually delivered in 1-2 days"
  },
  {
    name: "Sony WH-1000XM5 Wireless Noise Cancelling Headphones", category: "audio",
    price: 24990, original_price: 31990, brand: "Sony", rating: 4.9, reviews: 188, stock: true,
    image_url: "",
    specs: { "ANC": "Industry-leading noise cancellation", "Battery": "30 hours playback", "Charging": "USB-C, 3 min = 3 hrs", "Warranty": "1 Year" },
    delivery_note: "Available in-store today"
  },
  {
    name: "LG 7kg 5 Star Smart Inverter Washing Machine", category: "appliances",
    price: 17490, original_price: 21990, brand: "LG", rating: 4.7, reviews: 178, stock: true,
    image_url: "",
    specs: { "Capacity": "7 Kg", "Energy Rating": "5 Star", "Motor": "Smart Inverter (10 Year Warranty)", "Type": "Fully Automatic Top Load" },
    delivery_note: "Free doorstep delivery and demo"
  },
  {
    name: "Apple 20W USB-C Power Adapter (Original)", category: "accessories",
    price: 1699, original_price: 1900, brand: "Apple", rating: 4.9, reviews: 310, stock: true,
    image_url: "",
    specs: { "Power": "20W Fast Charging", "Port": "USB-C", "Compatibility": "iPhone 11-15 Series, iPads", "Warranty": "1 Year Apple India Warranty" },
    delivery_note: "Available in-store today"
  }
];

/* ─── Initialise ────────────────────────────────────────────────────────────
   Called once at server startup (awaited in server/index.js).
   ───────────────────────────────────────────────────────────────────────── */
async function initDB() {
  // ── Step 1: Test the connection before doing anything else.
  //    A bad DATABASE_URL or SSL mismatch will fail here with a clear message
  //    rather than blowing up deep inside migration logic.
  try {
    await pool.query("SELECT 1");
    console.log("  ✅ PostgreSQL connection established.");
  } catch (err) {
    throw new Error(
      `Cannot connect to PostgreSQL: ${err.message}\n` +
      `  → Check DATABASE_URL in your .env file.\n` +
      `  → For Neon / Render, the URL must include ?sslmode=require.`
    );
  }

  // ── Step 2: Apply schema (all statements are IF NOT EXISTS — idempotent).
  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  await pool.query(schema);

  // ── Step 3: Seed products if the table is empty.
  const { rows: [{ n: productCount }] } = await pool.query(
    "SELECT COUNT(*) AS n FROM products"
  );
  if (Number(productCount) === 0) {
    console.log("  📦 Seeding database with", SEED_PRODUCTS.length, "products…");
    const insertSQL = `
      INSERT INTO products
        (name, category, price, original_price, brand, rating, reviews,
         stock, image_url, specs, delivery_note)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    `;
    for (const p of SEED_PRODUCTS) {
      await pool.query(insertSQL, [
        p.name, p.category, p.price, p.original_price, p.brand,
        p.rating, p.reviews, p.stock, p.image_url,
        JSON.stringify(p.specs), p.delivery_note
      ]);
    }
    console.log("  ✅ Seed complete.");
  }

  // ── Step 4: Seed admin password from .env if not yet stored in DB.
  const { rows: [{ n: settingsCount }] } = await pool.query(
    "SELECT COUNT(*) AS n FROM admin_settings"
  );
  if (Number(settingsCount) === 0) {
    const hashFromEnv = process.env.ADMIN_PASSWORD_HASH || "";
    if (hashFromEnv) {
      await pool.query(
        "INSERT INTO admin_settings (id, password_hash) VALUES (1, $1)",
        [hashFromEnv]
      );
      console.log("  🔑 Admin password hash migrated from .env into database.");
    } else {
      console.warn(
        "  ⚠️  ADMIN_PASSWORD_HASH not set in .env — admin login will not work until a password is configured."
      );
    }
  }

  console.log("  🗄️  Database ready.");
}

/* ─── Public data-access API ────────────────────────────────────────────── */

async function getAllProducts({ category, search, page, limit } = {}) {
  let sql = "SELECT * FROM products WHERE 1=1";
  const params = [];
  let p = 1;

  if (category && category !== "all") {
    sql += ` AND LOWER(category) = $${p++}`;
    params.push(category.toLowerCase());
  }
  if (search) {
    sql += ` AND LOWER(name) LIKE $${p++}`;
    params.push(`%${search.toLowerCase()}%`);
  }

  sql += " ORDER BY id ASC";

  // Pagination is opt-in: only applied when both page AND limit are provided.
  // Default (no page/limit) returns the full catalog — preserving the current
  // storefront behaviour where all filtering is done client-side.
  if (page && limit) {
    const pageNum  = Math.max(1, parseInt(page,  10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 48));
    sql += ` LIMIT $${p++} OFFSET $${p++}`;
    params.push(limitNum, (pageNum - 1) * limitNum);
  }

  const result = await pool.query(sql, params);
  return result.rows.map(parseProduct);
}

async function getProductById(id) {
  const result = await pool.query(
    "SELECT * FROM products WHERE id = $1",
    [Number(id)]
  );
  return parseProduct(result.rows[0] ?? null);
}

async function createProduct(data) {
  const {
    name, category, price, original_price, brand,
    rating, reviews, stock, image_url, specs, delivery_note, color
  } = data;

  const result = await pool.query(
    `INSERT INTO products
       (name, category, price, original_price, brand, rating, reviews,
        stock, image_url, specs, delivery_note, color)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING id`,
    [
      name,
      category,
      Number(price),
      original_price ? Number(original_price) : null,
      brand,
      Number(rating)  || 0,
      Number(reviews) || 0,
      Boolean(stock),
      image_url || "",
      typeof specs === "string" ? specs : JSON.stringify(specs || {}),
      delivery_note || "Usually delivered in 1-2 days",
      color || ""
    ]
  );
  return getProductById(result.rows[0].id);
}

async function updateProduct(id, data) {
  const {
    name, category, price, original_price, brand,
    rating, reviews, stock, image_url, specs, delivery_note, color
  } = data;

  await pool.query(
    `UPDATE products
     SET name=$1, category=$2, price=$3, original_price=$4, brand=$5,
         rating=$6, reviews=$7, stock=$8, image_url=$9, specs=$10,
         delivery_note=$11, color=$12
     WHERE id=$13`,
    [
      name,
      category,
      Number(price),
      original_price ? Number(original_price) : null,
      brand,
      Number(rating)  || 0,
      Number(reviews) || 0,
      Boolean(stock),
      image_url || "",
      typeof specs === "string" ? specs : JSON.stringify(specs || {}),
      delivery_note || "Usually delivered in 1-2 days",
      color || "",
      Number(id)
    ]
  );
  return getProductById(id);
}

async function deleteProduct(id) {
  await pool.query("DELETE FROM products WHERE id = $1", [Number(id)]);
}

/* ─── Admin settings ────────────────────────────────────────────────────── */

async function getPasswordHash() {
  const result = await pool.query(
    "SELECT password_hash FROM admin_settings WHERE id = 1"
  );
  return result.rows[0]?.password_hash ?? null;
}

async function setPasswordHash(newHash) {
  await pool.query(
    "UPDATE admin_settings SET password_hash = $1 WHERE id = 1",
    [newHash]
  );
}

/* ─── Session management ────────────────────────────────────────────────── */
// Wipes all active sessions from the connect-pg-simple table.
// Called by the change-password route to invalidate every logged-in device.
async function clearAllSessions() {
  await pool.query("DELETE FROM session");
}

module.exports = {
  pool,              // exported so session store and index.js can reuse the connection
  initDB,
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getPasswordHash,
  setPasswordHash,
  clearAllSessions,
};
