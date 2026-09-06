# Rajshree Electronics — Complete Project Handoff
## Everything Built So Far (Full Summary for Next AI)

---

## 🏗️ What This Project Is
A **complete, locally-runnable full-stack e-commerce website** for Rajshree Electronics, a real electronics shop in Mehsana, Gujarat, India.
- No cloud services, no payment gateway, no build tools required
- Just Node.js — run one command and the whole site is live

---

## 📁 Project Location
```
C:\Users\AE\.gemini\antigravity\scratch\local-electronics-shop\
```

---

## ⚙️ Tech Stack
| Layer | Technology |
|---|---|
| Backend | Node.js + Express 4 |
| Database | sql.js (pure JavaScript SQLite — no C++ needed on Windows) |
| Sessions | express-session + connect-sqlite3 |
| Auth | bcryptjs (password hashed, stored in .env) |
| Image Upload | multer (saves to public/uploads/) |
| Frontend | Vanilla HTML + CSS + JavaScript (no React, no build step) |
| Fonts | Outfit (headings) + Inter (body) from Google Fonts |

---

## 📂 Complete File Structure
```
local-electronics-shop/
├── server/
│   ├── index.js                    ← Express app entry point
│   ├── generate-password-hash.js   ← CLI tool to hash new admin passwords
│   ├── routes/
│   │   ├── products.js             ← GET /api/products, GET /api/products/:id
│   │   └── admin.js                ← Admin CRUD + login/logout + image upload
│   ├── db/
│   │   ├── database.js             ← sql.js data-access layer + 12 seed products
│   │   └── schema.sql              ← CREATE TABLE products
│   └── middleware/
│       └── auth.js                 ← Session guard (requireAuth)
├── public/
│   ├── index.html                  ← MAIN STOREFRONT (premium upgraded UI)
│   ├── uploads/                    ← Uploaded product images saved here
│   ├── admin/
│   │   └── index.html              ← Full admin panel UI
│   └── css/
│       └── admin.css               ← Admin panel styles (with upload area styles)
├── database/
│   ├── shop.db                     ← SQLite database (auto-created on first run)
│   └── sessions.db                 ← Session storage (auto-created)
├── index.html                      ← OLD unused file (ignore — use public/index.html)
├── .env                            ← Active config (CHANGE PASSWORD BEFORE GOING LIVE)
├── .env.example                    ← Template
├── .gitignore                      ← .env is listed here ✅
├── package.json
└── README.md
```

---

## 🚀 How to Run
```
1. Open cmd (Win+R → cmd → Enter)
2. cd "C:\Users\AE\.gemini\antigravity\scratch\local-electronics-shop"
3. node server\index.js
4. Keep cmd window open (server dies if you close it)

Storefront  → http://localhost:3000
Admin panel → http://localhost:3000/admin
```

---

## 🔐 Admin Credentials

```
Username: admin
Password: [Configured securely in .env — ask project owner]
```

> **Security Note:** The live admin password and bcrypt hash are never stored in documentation or source control. They are strictly kept in the private, git-ignored `.env` file.

### To rotate or update the admin password in the future:
```bash
node server/generate-password-hash.js YourNewPassword
```
Copy the generated bcrypt output hash → update `ADMIN_PASSWORD_HASH` in `.env` → restart the server.

---

## 🌐 API Endpoints

### Public (no auth required):
```
GET  /api/products                   → all 12 products
GET  /api/products?category=mobiles  → filter by category
GET  /api/products?search=samsung    → search by name
GET  /api/products/:id               → single product
```

### Admin (session cookie required):
```
POST   /api/admin/login              → login {username, password}
POST   /api/admin/logout             → logout
GET    /api/admin/session            → check if logged in
GET    /api/admin/products           → all products (admin view)
POST   /api/admin/products           → create product
PUT    /api/admin/products/:id       → update product
DELETE /api/admin/products/:id       → delete product
POST   /api/admin/upload             → upload image file → returns {url}
```

---

## 🗄️ Database Schema (products table)
```sql
id             INTEGER PRIMARY KEY AUTOINCREMENT
name           TEXT NOT NULL
category       TEXT NOT NULL   (mobiles/laptops/tvs/audio/appliances/accessories)
price          REAL NOT NULL
original_price REAL            (for showing discount)
brand          TEXT
rating         REAL            (0-5)
reviews        INTEGER
stock          INTEGER         (0 = out of stock, 1 = in stock)
image_url      TEXT            (URL or /uploads/filename.jpg)
specs          TEXT            (JSON string: {"Display":"6.2 inch",...})
delivery_note  TEXT
created_at     DATETIME DEFAULT CURRENT_TIMESTAMP
```

---

## 🛍️ Storefront Features (public/index.html) — PREMIUM UPGRADED UI
- **Landing card** — Google Business-style card with shop info, animated entrance (fadeInUp), floating logo
- **Animated transition** — Landing → Store with smooth fade + scale animation
- **Glassmorphism header** — Sticky, backdrop blur, semi-transparent
- **Live search** — Filter products as you type
- **Category chips** — All, Mobiles, Laptops, TVs, Audio, Appliances, Accessories
- **Deal banner** — Shimmer animation + real countdown timer to midnight
- **Product grid** — Staggered entrance animations, hover lift + image zoom on cards
- **Sidebar filters** — Price range, Brand, Rating, In-stock toggle
- **Mobile filters** — Bottom sheet drawer on mobile
- **Product modal** — Spring animation, specs table, WhatsApp enquiry link
- **Cart drawer** — Slide-in from right, qty controls, remove items
- **Cart persistence** — Saved in localStorage (survives page refresh) ✅
- **WhatsApp buttons** — Header + landing + product modal all link to WhatsApp
- **Trust section** — 4 cards (Genuine, Returns, Delivery, Repair) with hover effect
- **Owner quote card**
- **Footer** — Shop info + subtle ⚙ Admin Panel link (bottom-right, faded)
- **Toast notifications** — Spring-animated, bottom center
- **SEO** — Proper title, meta description, semantic HTML

### Shop Info (hardcoded):
```
Name:     Rajshree Electronics
Address:  94, Municipal Shopping Centre, near BNSL Office, Pilaji Ganj, Mehsana, Gujarat 384001
Phone:    094289 40074 / +919428940074
WhatsApp: 919428940074
Hours:    Open · Closes 9 PM · Mon–Sun
Rating:   4.8 ★ (29 reviews)
```

---

## 🔧 Admin Panel Features (public/admin/index.html)
- **Login screen** — Error feedback, session auto-check on load
- **Dashboard header** — Green "🌎 View Storefront ↗" button + "Changes appear live" hint
- **Product table** — ID, thumbnail image, Name, Category chip, Price, Stock badge, Edit/Delete
- **Add product form** — All fields including:
  - Name, Category (dropdown), Brand
  - Price, Original Price (for discount)
  - Rating, Reviews count
  - **📸 Image Upload Area** — drag-and-drop OR click to upload (JPEG/PNG/WebP/GIF, max 5MB)
  - Live upload progress bar
  - Image preview with remove button
  - OR paste a URL as fallback
  - Specs (JSON textarea with hint)
  - Delivery note
  - In Stock checkbox
- **Edit mode** — Click Edit → form pre-fills → image preview loads
- **Delete** — Confirmation prompt
- **Table search** — Client-side filter as you type (searches name, brand, category)
- **Toast notifications** — Success and error states
- **Sign Out** button

---

## 🔗 How Storefront & Admin Are Connected
Both use the **same Express server + same SQLite database**.
- Add product in admin → refresh storefront → appears instantly ✅
- Edit price in admin → refresh storefront → new price shows ✅
- Upload image in admin → storefront shows the image ✅
- Delete product in admin → gone from storefront ✅

Navigation:
- **Storefront footer** → tiny ⚙ "Admin Panel" link (bottom-right, faded for discretion)
- **Admin header** → green "View Storefront ↗" button (opens new tab)

---

## 🌱 Seed Products (12 total — auto-inserted on first run if DB is empty)
| # | Name | Category | Price |
|---|---|---|---|
| 1 | Samsung Galaxy S24 5G (256GB) | Mobiles | ₹74,999 |
| 2 | iPhone 15 (128GB, Black) | Mobiles | ₹79,900 |
| 3 | OnePlus Nord CE4 5G (128GB) | Mobiles | ₹24,999 |
| 4 | Redmi Note 13 Pro 5G (256GB) | Mobiles | ₹29,999 |
| 5 | HP 15s i5 12th Gen (16GB/512GB) | Laptops | ₹52,990 |
| 6 | Lenovo IdeaPad Slim 3 Ryzen 5 | Laptops | ₹44,990 |
| 7 | Sony Bravia 43" 4K Google TV | TVs | ₹39,990 |
| 8 | LG 43" 4K UHD AI ThinQ TV | TVs | ₹34,990 (out of stock) |
| 9 | boAt Aavante Bar 1500 Soundbar | Audio | ₹5,999 |
| 10 | Sony WH-1000XM5 Headphones | Audio | ₹24,990 |
| 11 | LG 7kg Washing Machine | Appliances | ₹17,490 |
| 12 | Apple 20W USB-C Adapter | Accessories | ₹1,699 |

---

## ⚠️ Known Quirks
- Run `node server\index.js` from INSIDE the project folder — wrong directory = server dies instantly
- sql.js writes the full DB to disk after every write — safe but slightly slow for large datasets
- Sessions persist across restarts (sessions.db). Users stay logged in for 7 days
- Cart is in localStorage — clears if user clears browser data
- The old root `index.html` (Google Sheets version) still exists — it's unused, can be deleted

---

## 📋 What Still Needs To Be Done (Future Phases)
- [x] **Change admin password** — ✅ Done (Default password removed; secure hash configured in `.env`)
- [ ] **Add real product images** — Use admin panel upload area to upload actual photos
- [ ] **Real checkout / payment** — Integrate Razorpay or PhonePe
- [ ] **Order management system** — Track orders placed (needs new DB table + UI)
- [ ] **Customer accounts** — Buyer login/register system
- [ ] **WhatsApp order notification** — Auto-notify shop owner on each order (Twilio/WATI API)
- [ ] **Deploy online** — Railway, Render, or VPS so real customers can access it
- [ ] **Switch DB to PostgreSQL** — For production (only database.js needs to change)
- [ ] **Delete old root index.html** — The sql.js-connected storefront is in public/index.html
- [ ] **Change SESSION_SECRET** — Update in .env before going live
- [ ] **SSL/HTTPS** — Required for production deployment

---

## 📦 NPM Dependencies
```json
{
  "bcryptjs": "^2.4.3",
  "connect-sqlite3": "^0.9.13",
  "dotenv": "^16.4.5",
  "express": "^4.18.3",
  "express-session": "^1.18.0",
  "multer": "^1.x",
  "sql.js": "^1.11.0"
}
```
Run `npm install` if node_modules is missing.

---

## 🎨 Design System (CSS Variables in public/index.html)
```css
--bg: #F5F3EE          (warm off-white background)
--surface: #FFFFFF      (card surface)
--teal-900: #0A3335     (primary dark)
--teal-700: #0F5257     (primary mid)
--teal-600: #146B72     (primary light)
--amber-500: #F0A500    (accent/buttons)
--green-600: #1B8A5A    (WhatsApp/deals/in-stock)
--red-500: #D64550      (out of stock/errors)
Font Display: Outfit (headings, bold)
Font Body: Inter (body text)
```
