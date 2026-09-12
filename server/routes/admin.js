const router      = require("express").Router();
const bcrypt      = require("bcryptjs");
const multer      = require("multer");
const { requireAuth } = require("../middleware/auth");
const {
  getAllProducts, getProductById, createProduct, updateProduct,
  deleteProduct, getPasswordHash, setPasswordHash, clearAllSessions
} = require("../db/database");

/* ─── Shared product input validation ────────────────────────────────────── */
function validateProductFields(body) {
  const { name, category, brand, price, original_price, delivery_note } = body;

  if (!name || typeof name !== "string" || !name.trim()) return "Product name is required.";
  if (name.length > 200)            return "Product name must be under 200 characters.";
  if (!category || typeof category !== "string" || !category.trim()) return "Category is required.";
  if (category.length > 50)         return "Category must be under 50 characters.";
  if (!brand || typeof brand !== "string" || !brand.trim()) return "Brand is required.";
  if (brand.length > 100)           return "Brand must be under 100 characters.";

  const numPrice = Number(price);
  if (price === undefined || price === null || price === "") return "Price is required.";
  if (isNaN(numPrice))              return "Price must be a valid number.";
  if (numPrice < 0)                 return "Price must be a non-negative number.";

  if (original_price !== undefined && original_price !== null && original_price !== "") {
    const numOrig = Number(original_price);
    if (isNaN(numOrig))             return "Original price must be a valid number.";
    if (numOrig < 0)                return "Original price must be a non-negative number.";
  }

  if (delivery_note && delivery_note.length > 500) return "Delivery note must be under 500 characters.";

  return null; // no error
}

/* ─── Cloudinary setup ───────────────────────────────────────────────────── */
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:          "rajshree-electronics",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
    transformation:  [{ width: 800, height: 800, crop: "limit", quality: "auto" }],
    public_id: (_req, _file) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e6);
      return `product-${uniqueSuffix}`;
    }
  }
});

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only JPEG, PNG, WebP, and GIF images are allowed."));
  }
});

const rateLimit = require("express-rate-limit");

/* ─── Rate limiter: login (5 attempts per 15 minutes per IP) ─────────────── */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again after 15 minutes." }
});

/* ─── Rate limiter: change-password (5 attempts per 15 minutes per IP) ───── */
const changePwLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many password-change attempts. Please try again after 15 minutes." }
});

/* ─── POST /api/admin/login ──────────────────────────────────────────────── */
router.post("/login", loginLimiter, async (req, res) => {
  const { username, password } = req.body;
  const expectedUser = process.env.ADMIN_USERNAME || "admin";

  if (username !== expectedUser) {
    return res.status(401).json({ error: "Invalid credentials." });
  }

  // Prefer the env var hash (set in Render dashboard) so login never depends
  // on DB state. Fall back to DB only if the env var is not configured.
  const hash = process.env.ADMIN_PASSWORD_HASH || await getPasswordHash();
  if (!hash) {
    return res.status(500).json({ error: "Admin password not configured. Set ADMIN_PASSWORD_HASH in your environment variables." });
  }

  const match = await bcrypt.compare(password, hash);
  if (!match) return res.status(401).json({ error: "Invalid credentials." });

  req.session.admin = true;
  res.json({ ok: true });
});

/* ─── POST /api/admin/logout ─────────────────────────────────────────────── */
router.post("/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

/* ─── GET /api/admin/session ─────────────────────────────────────────────── */
router.get("/session", (req, res) => {
  res.json({ loggedIn: req.session.admin === true });
});

/* ─── All routes below require auth ──────────────────────────────────────── */
router.use(requireAuth);

/* ─── POST /api/admin/change-password ───────────────────────────────────── */
router.post("/change-password", changePwLimiter, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Please fill in all fields." });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: "New password must be at least 8 characters long." });
  }

  const currentHash = await getPasswordHash();
  if (!currentHash) {
    return res.status(500).json({ error: "Could not retrieve current password. Please contact support." });
  }

  const match = await bcrypt.compare(currentPassword, currentHash);
  if (!match) {
    return res.status(401).json({ error: "Current password is incorrect. Please try again." });
  }

  const newHash = await bcrypt.hash(newPassword, 10);
  await setPasswordHash(newHash);

  /* Invalidate all existing sessions — now a single pg DELETE via the pool */
  try {
    await clearAllSessions();
  } catch (e) {
    console.warn("Could not clear session store:", e.message);
  }

  /* Destroy the current in-memory session; client must log in with new password */
  req.session.destroy(() => {
    res.json({ ok: true, message: "Password changed successfully. Please sign in again with your new password." });
  });
});

/* ─── POST /api/admin/upload ─────────────────────────────────────────────── */
router.post("/upload", (req, res) => {
  upload.single("image")(req, res, (err) => {
    if (err) {
      const msg = err instanceof multer.MulterError
        ? (err.code === "LIMIT_FILE_SIZE" ? "File too large (max 5 MB)." : err.message)
        : err.message;
      return res.status(400).json({ error: msg });
    }
    if (!req.file) return res.status(400).json({ error: "No image file provided." });
    /* Cloudinary returns the permanent URL in req.file.path */
    const url = req.file.path;
    res.json({ ok: true, url, filename: req.file.filename });
  });
});

/* ─── GET /api/admin/products ────────────────────────────────────────────── */
router.get("/products", async (_req, res) => {
  try {
    res.json(await getAllProducts());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── POST /api/admin/products ───────────────────────────────────────────── */
router.post("/products", async (req, res) => {
  const validationError = validateProductFields(req.body);
  if (validationError) return res.status(400).json({ error: validationError });
  try {
    const product = await createProduct(req.body);
    res.status(201).json(product);
  } catch (err) {
    console.warn("Product create error:", err.message);
    res.status(400).json({ error: "Could not save the product. Please check your input and try again." });
  }
});

/* ─── PUT /api/admin/products/:id ────────────────────────────────────────── */
router.put("/products/:id", async (req, res) => {
  const validationError = validateProductFields(req.body);
  if (validationError) return res.status(400).json({ error: validationError });
  try {
    const existing = await getProductById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Product not found." });
    const product = await updateProduct(req.params.id, req.body);
    res.json(product);
  } catch (err) {
    console.warn("Product update error:", err.message);
    res.status(400).json({ error: "Could not update the product. Please check your input and try again." });
  }
});

/* ─── DELETE /api/admin/products/:id ─────────────────────────────────────── */
router.delete("/products/:id", async (req, res) => {
  try {
    const existing = await getProductById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Product not found." });
    await deleteProduct(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── GET /api/admin/template.csv ───────────────────────────────────────── */
router.get("/template.csv", (_req, res) => {
  const headers = "name,category,price,original_price,brand,rating,reviews,stock,image_url,specs,delivery_note,color";
  const ex1 = [
    '"Samsung Galaxy S24 5G (256GB, Onyx Black)"',
    'mobiles',
    '74999',
    '79999',
    'Samsung',
    '4.8',
    '142',
    'true',
    'https://res.cloudinary.com/example/image/upload/product-1.jpg',
    '"Display:6.2 inch AMOLED;Processor:Exynos 2400;RAM:8GB;Battery:4000 mAh"',
    '"Free delivery in Mehsana within 24 hours"',
    'Onyx Black'
  ].join(",");
  const ex2 = [
    '"HP 15s Intel Core i5 (16GB/512GB SSD)"',
    'laptops',
    '52990',
    '59990',
    'HP',
    '4.7',
    '64',
    'true',
    '',
    '"Processor:Core i5-1235U;RAM:16GB DDR4;Storage:512GB NVMe SSD;OS:Windows 11"',
    '"Free unboxing and setup at your home"',
    'Silver'
  ].join(",");
  const ex3 = [
    '"Sony WH-1000XM5 Wireless Headphones"',
    'audio',
    '24990',
    '31990',
    'Sony',
    '4.9',
    '188',
    'false',
    '',
    '"ANC:Industry-leading;Battery:30 hours;Charging:USB-C"',
    '"Available in-store today"',
    'Black'
  ].join(",");

  const csv = [headers, ex1, ex2, ex3].join("\r\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="rajshree-products-template.csv"');
  res.send(csv);
});

/* ─── POST /api/admin/products/bulk-import ───────────────────────────────── */
// Uses multer with in-memory storage — no temp files on disk.
const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv"))
      cb(null, true);
    else
      cb(new Error("Only CSV files are allowed."));
  }
});

/**
 * Minimal CSV parser that handles:
 *  - Comma-delimited fields
 *  - Fields wrapped in double-quotes (including quoted fields containing commas)
 *  - Escaped double-quotes inside quoted fields ("")
 * Returns array of string arrays (rows × columns).
 */
function parseCSV(text) {
  const rows   = [];
  const lines  = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  for (const line of lines) {
    if (!line.trim()) continue;
    const fields = [];
    let cur = "", inQ = false, i = 0;
    while (i < line.length) {
      const ch = line[i];
      if (inQ) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i += 2; continue; } // escaped quote
        if (ch === '"') { inQ = false; i++; continue; }                          // closing quote
        cur += ch;
      } else {
        if (ch === '"') { inQ = true; i++; continue; }  // opening quote
        if (ch === ',')  { fields.push(cur); cur = ""; i++; continue; }  // delimiter
        cur += ch;
      }
      i++;
    }
    fields.push(cur); // last field
    rows.push(fields);
  }
  return rows;
}

/**
 * Parse spec string like "Display:6.2 inch;RAM:8GB" into {Display:"6.2 inch", RAM:"8GB"}
 * Accepts existing JSON strings too.
 */
function parseSpecs(raw) {
  if (!raw || !raw.trim()) return {};
  // If it already looks like JSON, parse it directly
  if (raw.trim().startsWith("{")) {
    try { return JSON.parse(raw); } catch { /* fall through to key:value parse */ }
  }
  const obj = {};
  raw.split(";").forEach(pair => {
    const idx = pair.indexOf(":");
    if (idx < 1) return;
    const key = pair.substring(0, idx).trim();
    const val = pair.substring(idx + 1).trim();
    if (key) obj[key] = val;
  });
  return obj;
}

router.post("/products/bulk-import", (req, res) => {
  csvUpload.single("csv")(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err instanceof multer.MulterError
        ? (err.code === "LIMIT_FILE_SIZE" ? "CSV file too large (max 10 MB)." : err.message)
        : err.message
      });
    }
    if (!req.file) return res.status(400).json({ error: "No CSV file provided." });

    const text  = req.file.buffer.toString("utf8");
    const rows  = parseCSV(text);
    if (rows.length < 2) {
      return res.status(400).json({ error: "CSV must have a header row and at least one data row." });
    }

    // Build column index from header row
    const EXPECTED = ["name","category","price","original_price","brand",
                      "rating","reviews","stock","image_url","specs",
                      "delivery_note","color"];
    const headerRow = rows[0].map(h => h.trim().toLowerCase());
    const colIdx    = {};
    EXPECTED.forEach(col => { colIdx[col] = headerRow.indexOf(col); });

    const missingRequired = ["name","category","price","brand"]
      .filter(c => colIdx[c] === -1);
    if (missingRequired.length) {
      return res.status(400).json({
        error: `CSV is missing required columns: ${missingRequired.join(", ")}. ` +
               `Please download the template and check your file.`
      });
    }

    const col = (row, name) => {
      const idx = colIdx[name];
      return idx === -1 ? "" : (row[idx] || "").trim();
    };

    let added = 0;
    const skipped = [];

    for (let i = 1; i < rows.length; i++) {
      const row     = rows[i];
      const rowNum  = i + 1; // 1-indexed, row 1 = header
      if (row.every(cell => !cell.trim())) continue; // skip blank rows

      const data = {
        name:           col(row, "name"),
        category:       col(row, "category"),
        price:          col(row, "price"),
        original_price: col(row, "original_price") || "",
        brand:          col(row, "brand"),
        rating:         col(row, "rating") || 0,
        reviews:        col(row, "reviews") || 0,
        stock:          col(row, "stock").toLowerCase() !== "false",
        image_url:      col(row, "image_url") || "",
        specs:          JSON.stringify(parseSpecs(col(row, "specs"))),
        delivery_note:  col(row, "delivery_note") || "Usually delivered in 1-2 days",
        color:          col(row, "color") || ""
      };

      // Reuse the same validation already used for single-product creation
      const validationError = validateProductFields(data);
      if (validationError) {
        skipped.push(`Row ${rowNum}: ${validationError}`);
        continue;
      }

      try {
        await createProduct(data);
        added++;
      } catch (dbErr) {
        skipped.push(`Row ${rowNum}: Database error — ${dbErr.message}`);
      }
    }

    res.json({ ok: true, added, skipped });
  });
});

module.exports = router;
