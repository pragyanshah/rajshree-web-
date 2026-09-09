const router      = require("express").Router();
const bcrypt      = require("bcryptjs");
const multer      = require("multer");
const path        = require("path");
const fs          = require("fs");
const { requireAuth } = require("../middleware/auth");
const { getAllProducts, getProductById, createProduct, updateProduct, deleteProduct, getPasswordHash, setPasswordHash } = require("../db/database");

/* ─── Shared product input validation ─── */
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

/* ─── Cloudinary setup ─── */
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
    folder:         "rajshree-electronics",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
    transformation: [{ width: 800, height: 800, crop: "limit", quality: "auto" }],
    public_id: (_req, file) => {
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

const rateLimit    = require("express-rate-limit");

/* ─── Rate limiter for admin login (5 attempts per 15 minutes per IP) ─── */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again after 15 minutes." }
});

/* ─── Rate limiter for change-password (5 attempts per 15 minutes per IP) ─── */
const changePwLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many password-change attempts. Please try again after 15 minutes." }
});

/* ─── POST /api/admin/login ─── */
router.post("/login", loginLimiter, async (req, res) => {
  const { username, password } = req.body;
  const expectedUser = process.env.ADMIN_USERNAME || "admin";

  const hashInDB = getPasswordHash();
  if (!hashInDB) {
    return res.status(500).json({ error: "Admin password not configured. Please set up a password first." });
  }
  if (username !== expectedUser) {
    return res.status(401).json({ error: "Invalid credentials." });
  }
  const match = await bcrypt.compare(password, hashInDB);
  if (!match) return res.status(401).json({ error: "Invalid credentials." });

  req.session.admin = true;
  res.json({ ok: true });
});

/* ─── POST /api/admin/logout ─── */
router.post("/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

/* ─── GET /api/admin/session ─── (check if still logged in) */
router.get("/session", (req, res) => {
  res.json({ loggedIn: req.session.admin === true });
});

/* ─── All routes below require auth ─── */
router.use(requireAuth);

/* ─── POST /api/admin/change-password ─── */
router.post("/change-password", changePwLimiter, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Please fill in all fields." });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: "New password must be at least 8 characters long." });
  }

  const currentHash = getPasswordHash();
  if (!currentHash) {
    return res.status(500).json({ error: "Could not retrieve current password. Please contact support." });
  }

  const match = await bcrypt.compare(currentPassword, currentHash);
  if (!match) {
    return res.status(401).json({ error: "Current password is incorrect. Please try again." });
  }

  const newHash = await bcrypt.hash(newPassword, 10);
  setPasswordHash(newHash);

  /* Invalidate all existing sessions so stolen/old sessions can't be reused.
     connect-sqlite3 stores sessions in database/sessions.db in a table called
     "sessions". We open it with sql.js (already a project dependency), clear
     every row, save, then destroy the current in-memory session. */
  try {
    const sessDbPath = path.join(__dirname, "../../database/sessions.db");
    if (fs.existsSync(sessDbPath)) {
      const SQL = await require("sql.js")();
      const sessDb = new SQL.Database(fs.readFileSync(sessDbPath));
      sessDb.run("DELETE FROM sessions");
      fs.writeFileSync(sessDbPath, Buffer.from(sessDb.export()));
      sessDb.close();
    }
  } catch (e) {
    console.warn("Could not clear session store:", e.message);
  }

  /* Destroy the current session; the client will need to log in with the new password */
  req.session.destroy(() => {
    res.json({ ok: true, message: "Password changed successfully. Please sign in again with your new password." });
  });
});

/* ─── POST /api/admin/upload ─── (image upload → Cloudinary) */
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

/* ─── GET /api/admin/products ─── */
router.get("/products", (_req, res) => {
  try { res.json(getAllProducts()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

/* ─── POST /api/admin/products ─── */
router.post("/products", (req, res) => {
  const validationError = validateProductFields(req.body);
  if (validationError) return res.status(400).json({ error: validationError });
  try {
    const product = createProduct(req.body);
    res.status(201).json(product);
  } catch (err) {
    console.warn("Product create error:", err.message);
    res.status(400).json({ error: "Could not save the product. Please check your input and try again." });
  }
});

/* ─── PUT /api/admin/products/:id ─── */
router.put("/products/:id", (req, res) => {
  const validationError = validateProductFields(req.body);
  if (validationError) return res.status(400).json({ error: validationError });
  try {
    const existing = getProductById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Product not found." });
    const product = updateProduct(req.params.id, req.body);
    res.json(product);
  } catch (err) {
    console.warn("Product update error:", err.message);
    res.status(400).json({ error: "Could not update the product. Please check your input and try again." });
  }
});

/* ─── DELETE /api/admin/products/:id ─── */
router.delete("/products/:id", (req, res) => {
  try {
    const existing = getProductById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Product not found." });
    deleteProduct(req.params.id);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
