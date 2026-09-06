# Rajshree Electronics — Full-Stack Local Store

A production-quality e-commerce website with a Node.js/Express backend, SQLite database, and a password-protected admin panel. Built for Rajshree Electronics, Mehsana.

---

## Local Setup (5 minutes)

### Prerequisites
- **Node.js 18 or later** — download from https://nodejs.org  
  Verify with: `node --version` (should print `v18.x.x` or higher)

---

### Step 1 — Clone / open the project folder
Make sure you are in the project folder that contains `package.json`.

### Step 2 — Install dependencies
```bash
npm install
```
This downloads Express, SQLite, bcryptjs, and session libraries into `node_modules/`.

### Step 3 — Create your `.env` file
```bash
copy .env.example .env
```
Then open `.env` in any text editor.

### Step 4 — Generate an admin password hash
In a terminal, run:
```bash
node -e "require('bcryptjs').hash('YOUR_PASSWORD_HERE', 10).then(h => console.log(h))"
```
Replace `YOUR_PASSWORD_HERE` with the password you want. Copy the output (it starts with `$2b$`) and paste it as `ADMIN_PASSWORD_HASH` in `.env`.

Also set `ADMIN_USERNAME` to whatever username you want (default: `admin`).

Example final `.env`:
```
PORT=3000
SESSION_SECRET=abc123def456abc123def456abc123de
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$2b$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
WHATSAPP_NUMBER=919428940074
```

### Step 5 — Start the server
```bash
npm run dev
```
You should see:
```
  ⚡ Rajshree Electronics server running
  → Storefront : http://localhost:3000
  → Admin panel: http://localhost:3000/admin
```
The server auto-seeds 12 sample products on the first run.

---

## URLs

| URL | Description |
|-----|-------------|
| `http://localhost:3000` | Public storefront |
| `http://localhost:3000/admin` | Admin login + panel |
| `http://localhost:3000/api/products` | JSON product list |
| `http://localhost:3000/api/products?category=mobiles` | Filter by category |
| `http://localhost:3000/api/products?search=samsung` | Search by name |

---

## Admin Panel Features
- **Login** with username/password (bcrypt hashed, stored in `.env`)
- **Add products** — name, category, brand, price, original price, rating, specs (JSON), delivery note, in-stock toggle
- **Edit products** — click Edit in the table, form pre-fills, click Update Product
- **Delete products** — click Delete, confirm in prompt
- All changes appear instantly on the public storefront

---

## Project Structure
```
├── server/
│   ├── index.js              ← Express app entry point
│   ├── routes/
│   │   ├── products.js       ← Public API
│   │   └── admin.js          ← Admin API (session-protected)
│   ├── db/
│   │   ├── database.js       ← SQLite data-access layer
│   │   ├── schema.sql        ← Table definition
│   │   └── seed.js           ← 12 sample products
│   └── middleware/
│       └── auth.js           ← Session guard
├── public/
│   ├── index.html            ← Storefront
│   ├── admin/
│   │   └── index.html        ← Admin panel UI
│   └── css/
│       └── admin.css         ← Admin styles
├── database/                 ← SQLite .db files (gitignored)
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## Notes
- The `database/shop.db` SQLite file is created automatically and is excluded from git.
- To reset the database: stop the server, delete `database/shop.db`, and restart.
- To switch to PostgreSQL in production, only `server/db/database.js` needs to change.
