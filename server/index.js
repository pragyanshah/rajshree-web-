require("dotenv").config();
const express    = require("express");
const session    = require("express-session");
const path       = require("path");
const { initDB } = require("./db/database");

const app  = express();
const PORT = process.env.PORT || 3000;

/* ── Security hardening ── */
app.disable("x-powered-by");

/* ── Body parsing ── */
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true }));

/* ── Sessions ── */
const SQLiteStore = require("connect-sqlite3")(session);
app.use(session({
  store: new SQLiteStore({
    db:  "sessions.db",
    dir: path.join(__dirname, "../database")
  }),
  secret:            process.env.SESSION_SECRET || "dev-secret-change-me",
  resave:            false,
  saveUninitialized: false,
  cookie: {
    maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: "strict",
    secure:   process.env.NODE_ENV === "production"
  }
}));

/* ── API Routes ── */
app.use("/api/products", require("./routes/products"));
app.use("/api/admin",    require("./routes/admin"));

/* ── Health check (used by Render, Railway, etc.) ── */
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

/* ── Admin HTML shortcut ── */
app.get("/admin", (_req, res) =>
  res.sendFile(path.join(__dirname, "../public/admin/index.html"))
);

/* ── Static files (public storefront) ── */
app.use(express.static(path.join(__dirname, "../public")));

/* ── 404 fallback ── */
app.use((_req, res) => res.status(404).send("Not found"));

/* ── Start (async to await DB init) ── */
(async () => {
  try {
    await initDB();
    app.listen(PORT, () => {
      console.log(`\n  [*] Rajshree Electronics server running`);
      console.log(`  Storefront : http://localhost:${PORT}`);
      console.log(`  Admin panel: http://localhost:${PORT}/admin\n`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
})();
