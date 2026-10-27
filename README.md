# 🛡️ SecVault — Security-First Full-Stack E-Commerce (Vue 3 + Node.js)

โปรเจกต์ระบบร้านค้าออนไลน์ (E-Commerce Web Application) แบบ Monorepo ที่ออกแบบตามหลักการ **Security-First & OWASP Top 10** พร้อมโครงสร้างสำหรับขึ้น Free Cloud Hosting ทันที (**Frontend:** Vercel, **Backend:** Render / Koyeb, **Database:** Supabase / Neon PostgreSQL Free Tier)

---

## 📁 1. โครงสร้างโปรเจกต์ (Monorepo Structure)

```text
.
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma           # PostgreSQL Schema (User, Product, Category, Order, OrderItem)
│   │   └── seed.js                 # Secure Database Seeder (Admin + 8 Security Products)
│   ├── src/
│   │   ├── config/prisma.js        # Prisma Singleton Client
│   │   ├── controllers/            # Auth, Product, and Atomic Order Controllers
│   │   ├── middleware/             # JWT/RBAC Auth, Rate Limiters, Express-Validator Sanitizers
│   │   ├── routes/                 # API Route Definitions
│   │   ├── utils/security.js       # JWT Rotation, SHA-256 Token Hashing, DTO Whitelisting
│   │   └── server.js               # Express App with Helmet, HPP, Dynamic CORS & Safe Error Handler
│   ├── .env.example
│   └── package.json
└── frontend/
    ├── src/
    │   ├── router/index.js         # Navigation Guard verifying /api/auth/me on route transitions
    │   ├── services/api.js         # Axios instance (withCredentials: true + Auto Token Refresh)
    │   ├── stores/                 # Pinia Auth (In-memory only, zero LocalStorage) & Cart Stores
    │   ├── views/                  # Storefront, CartCheckout, Login, Register, MyOrders, Admin Console
    │   ├── App.vue
    │   └── main.js
    ├── vercel.json                 # SPA Routing + Security HTTP Headers for Vercel
    ├── .env.example
    └── package.json
```

---

## 🔒 2. มาตรฐานความปลอดภัยที่ติดตั้งในระบบ (OWASP Top 10 Defense-in-Depth)

1. **Zero LocalStorage Token Storage & Refresh Token Rotation:**
   - **ห้ามเก็บ JWT ใน `localStorage` หรือ `sessionStorage`** โดยเด็ดขาด
   - ส่ง `access_token` (อายุ 15 นาที) และ `refresh_token` (อายุ 7 วัน) ผ่าน `HttpOnly`, `Secure` (Production), `SameSite` Cookie
   - เก็บค่า SHA-256 Hash ของ Refresh Token ในฐานข้อมูล พร้อมระบบ **Token Reuse Detection** (หากพบการนำ Refresh Token เก่ามาใช้ซ้ำ ระบบจะเพิกถอน Session ทั้งหมดทันที)
2. **Password Security & Brute-Force Account Lockout:**
   - แฮชรหัสผ่านด้วย `bcryptjs` (**Salt Rounds = 12**)
   - บังคับนโยบายรหัสผ่านเข้มงวด (อย่างน้อย 8 ตัวอักษร, ตัวพิมพ์ใหญ่, ตัวพิมพ์เล็ก, ตัวเลข และอักขระพิเศษ)
   - ล็อกบัญชีอัตโนมัติเป็นเวลา **15 นาที** เมื่อล็อกอินผิดติดต่อกันครบ **5 ครั้ง** (`failedLoginAttempts` & `lockUntil`)
3. **Injection, XSS, HPP & Mass Assignment Prevention:**
   - ใช้ **Prisma ORM Parameterized Queries** ป้องกัน SQL Injection 100%
   - ใช้ `express-validator` ตรวจสอบและ Sanitize (`.escape()`, `.trim()`, `.normalizeEmail()`) ทุก Input (`body`, `params`, `query`)
   - ใช้ฟังก์ชัน `pickAllowedFields()` ทำ DTO Whitelisting ป้องกันการยัดฟิลด์แปลกปลอม (เช่น การส่ง `role: "ADMIN"` ตอนสมัครสมาชิก)
   - คำนวณราคาสินค้า (`totalAmount`) และตัดสต็อกจากฐานข้อมูลภายใน **Atomic Database Transaction (`prisma.$transaction`)** เสมอ ไม่เชื่อราคาที่ส่งมาจากฝั่ง Client
   - ฝั่ง Vue 3 ใช้เฉพาะ Text Interpolation (`{{ }}`) และไม่ใช้ `v-html` กับข้อมูลจากผู้ใช้ทุกกรณี

---

## 🚀 3. วิธีรันระบบแบบ Localhost

### ขั้นตอนที่ 1: ตั้งค่าและรัน Backend (`http://localhost:5000`)

```bash
cd backend
npm install

# คัดลอกไฟล์ .env.example เป็น .env และใส่ค่า DATABASE_URL (เช่นจาก Supabase หรือ Neon.tech)
cp .env.example .env

# สร้าง Prisma Client และอัปเดตตารางลงฐานข้อมูล PostgreSQL
npx prisma generate
npx prisma db push

# รัน Seeder สร้างบัญชี Admin และสินค้าตัวอย่าง 8 รายการ
npm run seed

# เริ่มต้นเซิร์ฟเวอร์แบบ Development
npm run dev
```

> **ข้อมูลบัญชี Admin เริ่มต้น (จาก `seed.js`):**
> - **Email:** `admin@securestore.com`
> - **Password:** `Admin@Secure2026!`

### ขั้นตอนที่ 2: ตั้งค่าและรัน Frontend (`http://localhost:5173`)

```bash
cd frontend
npm install

# คัดลอกไฟล์ .env.example เป็น .env
cp .env.example .env

# เริ่มต้นเซิร์ฟเวอร์ Vite
npm run dev
```

---

## ☁️ 4. คำแนะนำการ Deploy ขึ้น Cloud ฟรี (Supabase/Neon + Render/Koyeb + Vercel)

### 1) Database: Supabase หรือ Neon (Free Tier PostgreSQL)
1. สร้างโปรเจกต์ใหม่บน [Neon.tech](https://neon.tech) หรือ [Supabase](https://supabase.com)
2. ใน Neon เลือก **Prisma** แล้วคัดลอก PostgreSQL connection string ไปใส่ใน `DATABASE_URL` ของ Render โดยใช้ connection string ที่มี `sslmode=require`

### 2) Backend: Render หรือ Koyeb (Free Web Service)
1. เชื่อมต่อ GitHub Repository และตั้งค่า **Root Directory** เป็น `backend`
2. ตั้งค่า **Build Command:** `npm install && npx prisma generate && npx prisma db push`
3. ตั้งค่า **Start Command:** `npm start`
4. กำหนด **Environment Variables** บน Render/Koyeb:
   - `NODE_ENV` = `production`
   - `PORT` = `5000`
   - `DATABASE_URL` = `<PostgreSQL_URI_จาก_Supabase_หรือ_Neon>`
   - `FRONTEND_URL` = `https://your-project-name.vercel.app`
   - `JWT_SECRET` = `<สุ่มรหัส Hex 64 ไบต์>`
   - `JWT_REFRESH_SECRET` = `<สุ่มรหัส Hex 64 ไบต์ อีกชุดที่ไม่ซ้ำกัน>`
   - `JWT_EXPIRES_IN` = `15m`
   - `JWT_REFRESH_EXPIRES_IN` = `7d`

### 3) Frontend: Vercel (Free Hobby Plan)
1. Import โปรเจกต์จาก GitHub เข้าสู่ Vercel และตั้งค่า **Root Directory** เป็น `frontend`
2. Framework Preset จะตรวจพบเป็น **Vite** อัตโนมัติ (`Build Command: npm run build`, `Output Directory: dist`)
3. กำหนด **Environment Variable** บน Vercel:
   - `VITE_API_BASE_URL` = `https://your-backend-service.onrender.com/api`
4. กด **Deploy** (ไฟล์ `frontend/vercel.json` จะตั้งค่า SPA Routing และ Security Headers ให้โดยอัตโนมัติ)

# MarketOnline
