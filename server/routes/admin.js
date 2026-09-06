const router      = require("express").Router();
const bcrypt      = require("bcryptjs");
const multer      = require("multer");
const path        = require("path");
const fs          = require("fs");
const { requireAuth } = require("../middleware/auth");
const { getAllProducts, getProductById, createProduct, updateProduct, deleteProduct } = require("../db/database");

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

/* ─── POST /api/admin/login ─── */
router.post("/login", loginLimiter, async (req, res) => {
  const { username, password } = req.body;
  const expectedUser = process.env.ADMIN_USERNAME || "admin";
  const hashInEnv    = process.env.ADMIN_PASSWORD_HASH || "";

  if (!hashInEnv) {
    return res.status(500).json({ error: "Admin password not configured. Set ADMIN_PASSWORD_HASH in .env" });
  }
  if (username !== expectedUser) {
    return res.status(401).json({ error: "Invalid credentials." });
  }
  const match = await bcrypt.compare(password, hashInEnv);
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
  try {
    const product = createProduct(req.body);
    res.status(201).json(product);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

/* ─── PUT /api/admin/products/:id ─── */
router.put("/products/:id", (req, res) => {
  try {
    const existing = getProductById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Product not found." });
    const product = updateProduct(req.params.id, req.body);
    res.json(product);
  } catch (err) { res.status(400).json({ error: err.message }); }
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
