/**
 * database.js — SQLite data-access layer using sql.js (pure JavaScript,
 * no native C++ compilation required).
 *
 * The database is loaded from disk on startup and written back to disk
 * after every write operation.  To swap to PostgreSQL later, only this
 * file needs to change.
 */

const path = require("path");
const fs   = require("fs");

const DB_PATH     = path.join(__dirname, "../../database/shop.db");
const SCHEMA_PATH = path.join(__dirname, "schema.sql");
const DB_DIR      = path.dirname(DB_PATH);

let db;   // sql.js Database instance

/* ─── Persist to disk after every write ─── */
function save() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

/* ─── Low-level helpers ─── */
function runStmt(sql, params = []) {
  db.run(sql, params);
  save();
  const idRow = db.exec("SELECT last_insert_rowid() AS id");
  return idRow[0]?.values[0][0] ?? null;
}

function queryAll(sql, params = []) {
  const result = db.exec(sql, params);
  if (!result.length) return [];
  const { columns, values } = result[0];
  return values.map(row => {
    const obj = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });
}

function queryOne(sql, params = []) {
  return queryAll(sql, params)[0] ?? null;
}

/* ─── Product shape normaliser ─── */
function parseProduct(row) {
  if (!row) return null;
  return {
    ...row,
    stock: row.stock === 1 || row.stock === true,
    specs: (() => {
      if (typeof row.specs === "object" && row.specs !== null) return row.specs;
      try { return JSON.parse(row.specs || "{}"); } catch { return {}; }
    })()
  };
}

/* ─── Seed data ─── */
const SEED_PRODUCTS = [
  { name: "Samsung Galaxy S24 5G (Onyx Black, 256GB)", category: "mobiles", price: 74999, original_price: 79999, brand: "Samsung", rating: 4.8, reviews: 142, stock: 1, image_url: "", specs: JSON.stringify({ "Display": '6.2" Dynamic AMOLED 2X', "Processor": "Exynos 2400", "RAM": "8GB", "Battery": "4000 mAh", "Warranty": "1 Year Official Brand Warranty" }), delivery_note: "Free delivery in Mehsana within 24 hours" },
  { name: "iPhone 15 (128GB, Black)", category: "mobiles", price: 79900, original_price: 84900, brand: "Apple", rating: 4.9, reviews: 98, stock: 1, image_url: "", specs: JSON.stringify({ "Display": '6.1" Super Retina XDR OLED', "Chip": "Apple A16 Bionic", "Camera": "48MP main + 12MP ultrawide", "Warranty": "1 Year Apple India Warranty" }), delivery_note: "Same-day in-store pickup available" },
  { name: "OnePlus Nord CE4 5G (Dark Chrome, 128GB)", category: "mobiles", price: 24999, original_price: 26999, brand: "OnePlus", rating: 4.6, reviews: 89, stock: 1, image_url: "", specs: JSON.stringify({ "Display": '6.7" 120Hz AMOLED', "Charging": "100W SUPERVOOC", "Camera": "50MP Sony LYT-600", "Warranty": "1 Year Official Brand Warranty" }), delivery_note: "Same day in-store pickup or local delivery" },
  { name: "Redmi Note 13 Pro 5G (Aurora Purple, 256GB)", category: "mobiles", price: 29999, original_price: 32999, brand: "Xiaomi", rating: 4.5, reviews: 203, stock: 1, image_url: "", specs: JSON.stringify({ "Display": '6.67" 120Hz AMOLED', "Camera": "200MP OIS main sensor", "Charging": "67W Turbo Charge", "Warranty": "1 Year Official Warranty" }), delivery_note: "Usually delivered in 1-2 days" },
  { name: "HP 15s Intel Core i5 12th Gen Laptop (16GB/512GB SSD)", category: "laptops", price: 52990, original_price: 59990, brand: "HP", rating: 4.7, reviews: 64, stock: 1, image_url: "", specs: JSON.stringify({ "Processor": "Intel Core i5-1235U", "RAM": "16GB DDR4", "Storage": "512GB NVMe SSD", "OS": "Windows 11 Home + MS Office" }), delivery_note: "Free unboxing and setup at your home" },
  { name: "Lenovo IdeaPad Slim 3 Ryzen 5 (8GB/512GB SSD)", category: "laptops", price: 44990, original_price: 52990, brand: "Lenovo", rating: 4.6, reviews: 51, stock: 1, image_url: "", specs: JSON.stringify({ "Processor": "AMD Ryzen 5 7520U", "RAM": "8GB LPDDR5", "Storage": "512GB NVMe SSD", "Display": '15.6" FHD IPS Anti-glare' }), delivery_note: "Free delivery and demo" },
  { name: 'Sony Bravia 43" 4K Ultra HD Smart LED Google TV', category: "tvs", price: 39990, original_price: 49900, brand: "Sony", rating: 4.9, reviews: 110, stock: 1, image_url: "", specs: JSON.stringify({ "Resolution": "4K Ultra HD (3840x2160)", "Sound": "20W Dolby Audio", "Smart TV": "Google TV with Voice Remote", "Warranty": "2 Years Official Warranty" }), delivery_note: "Free wall-mount installation included" },
  { name: 'LG 43" 4K UHD AI ThinQ Smart LED TV', category: "tvs", price: 34990, original_price: 42990, brand: "LG", rating: 4.7, reviews: 87, stock: 0, image_url: "", specs: JSON.stringify({ "Resolution": "4K Ultra HD", "Sound": "20W with DTS Virtual X", "Smart TV": "webOS with Magic Remote", "Warranty": "2 Years" }), delivery_note: "Free delivery and wall-mounting" },
  { name: "boAt Aavante Bar 1500 120W Bluetooth Soundbar", category: "audio", price: 5999, original_price: 9990, brand: "boAt", rating: 4.5, reviews: 215, stock: 1, image_url: "", specs: JSON.stringify({ "Output": "120W RMS with wired subwoofer", "Connectivity": "Bluetooth 5.0, AUX, USB, Optical, HDMI ARC", "Warranty": "1 Year" }), delivery_note: "Usually delivered in 1-2 days" },
  { name: "Sony WH-1000XM5 Wireless Noise Cancelling Headphones", category: "audio", price: 24990, original_price: 31990, brand: "Sony", rating: 4.9, reviews: 188, stock: 1, image_url: "", specs: JSON.stringify({ "ANC": "Industry-leading noise cancellation", "Battery": "30 hours playback", "Charging": "USB-C, 3 min = 3 hrs", "Warranty": "1 Year" }), delivery_note: "Available in-store today" },
  { name: "LG 7kg 5 Star Smart Inverter Washing Machine", category: "appliances", price: 17490, original_price: 21990, brand: "LG", rating: 4.7, reviews: 178, stock: 1, image_url: "", specs: JSON.stringify({ "Capacity": "7 Kg", "Energy Rating": "5 Star", "Motor": "Smart Inverter (10 Year Warranty)", "Type": "Fully Automatic Top Load" }), delivery_note: "Free doorstep delivery and demo" },
  { name: "Apple 20W USB-C Power Adapter (Original)", category: "accessories", price: 1699, original_price: 1900, brand: "Apple", rating: 4.9, reviews: 310, stock: 1, image_url: "", specs: JSON.stringify({ "Power": "20W Fast Charging", "Port": "USB-C", "Compatibility": "iPhone 11-15 Series, iPads", "Warranty": "1 Year Apple India Warranty" }), delivery_note: "Available in-store today" }
];

/* ─── Initialise (async — must be awaited in server/index.js) ─── */
async function initDB() {
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

  const SQL = await require("sql.js")();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Run schema (idempotent — CREATE TABLE IF NOT EXISTS)
  const schema = fs.readFileSync(SCHEMA_PATH, "utf8");
  db.run(schema);

  // Migrate: add color column if it doesn't exist yet (for existing databases)
  try { db.run("ALTER TABLE products ADD COLUMN color TEXT DEFAULT ''"); save(); } catch { /* column already exists */ }

  // Seed if table is empty
  const result = db.exec("SELECT COUNT(*) AS n FROM products");
  const count  = result[0]?.values[0][0] ?? 0;
  if (Number(count) === 0) {
    console.log("  📦 Seeding database with", SEED_PRODUCTS.length, "products…");
    const insertSQL = `INSERT INTO products (name, category, price, original_price, brand, rating, reviews, stock, image_url, specs, delivery_note)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    for (const p of SEED_PRODUCTS) {
      db.run(insertSQL, [p.name, p.category, p.price, p.original_price, p.brand, p.rating, p.reviews, p.stock, p.image_url, p.specs, p.delivery_note]);
    }
    save();
    console.log("  ✅ Seed complete.");
  }

  console.log("  🗄️  Database ready.");
}

/* ─── Public data-access API ─── */
function getAllProducts({ category, search } = {}) {
  let sql = "SELECT * FROM products WHERE 1=1";
  const params = [];
  if (category && category !== "all") { sql += " AND LOWER(category) = ?"; params.push(category.toLowerCase()); }
  if (search)  { sql += " AND LOWER(name) LIKE ?"; params.push(`%${search.toLowerCase()}%`); }
  sql += " ORDER BY id ASC";
  return queryAll(sql, params).map(parseProduct);
}

function getProductById(id) {
  return parseProduct(queryOne("SELECT * FROM products WHERE id = ?", [Number(id)]));
}

function createProduct(data) {
  const { name, category, price, original_price, brand, rating, reviews, stock, image_url, specs, delivery_note, color } = data;
  const newId = runStmt(
    `INSERT INTO products (name, category, price, original_price, brand, rating, reviews, stock, image_url, specs, delivery_note, color) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, category, Number(price), original_price ? Number(original_price) : null, brand, Number(rating) || 0, Number(reviews) || 0, stock ? 1 : 0, image_url || "", typeof specs === "string" ? specs : JSON.stringify(specs || {}), delivery_note || "Usually delivered in 1-2 days", color || ""]
  );
  return getProductById(newId);
}

function updateProduct(id, data) {
  const { name, category, price, original_price, brand, rating, reviews, stock, image_url, specs, delivery_note, color } = data;
  runStmt(
    `UPDATE products SET name=?, category=?, price=?, original_price=?, brand=?, rating=?, reviews=?, stock=?, image_url=?, specs=?, delivery_note=?, color=? WHERE id=?`,
    [name, category, Number(price), original_price ? Number(original_price) : null, brand, Number(rating) || 0, Number(reviews) || 0, stock ? 1 : 0, image_url || "", typeof specs === "string" ? specs : JSON.stringify(specs || {}), delivery_note || "Usually delivered in 1-2 days", color || "", Number(id)]
  );
  return getProductById(id);
}

function deleteProduct(id) {
  db.run("DELETE FROM products WHERE id = ?", [Number(id)]);
  save();
}

module.exports = { initDB, getAllProducts, getProductById, createProduct, updateProduct, deleteProduct };
