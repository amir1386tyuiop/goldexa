# Goldexa MVP - پلتفرم جامع طلا

## وضعیت فعلی و حدود اعتبار

این پروژه در وضعیت توسعه‌ی MVP است. هسته مالی، دسترسی‌ها و کنترل‌های runtime
سخت‌سازی شده‌اند؛ پیش از production باید چک‌لیست [MVP_SAFE_RUNBOOK.md](MVP_SAFE_RUNBOOK.md)
و E2E واقعی با PostgreSQL و Redis اجرا و تأیید شود.

- Backend build: موفق (`npm run build`).
- Backend unit tests: suiteهای unit و security در CI اجرا می‌شوند؛ security gate routeهای حساس، احراز هویت، نقش، permission و مالکیت را بررسی می‌کند. آخرین اجرای backend شامل ۳۰ suite و ۱۹۰ تست موفق است. تست‌های E2E با PostgreSQL/Redis ایزوله‌ی compose نیز verified شده‌اند: ۴ suite و ۱۵ تست سبز. برای اجرای محلی، ابتدا `backend/test/docker-compose.e2e.yml` را بالا بیاورید و `E2E_BASE_URL=http://localhost:3011`، `E2E_ALLOW_DB_FIXTURES=1` و متغیرهای اتصال به `goldeksa_e2e` را تنظیم کنید.
- E2E checkout/refund: با PostgreSQL و Redis واقعی در stack ایزوله تأیید شده است (۴ suite، ۱۵ تست موفق).
- Frontend lint/build: موفق.
- وضعیت جزئیات hardening و محدودیت‌های release در [CHANGELOG.md](CHANGELOG.md) و [MVP_SAFE_RUNBOOK.md](MVP_SAFE_RUNBOOK.md) ثبت شده است.
- Frontend از APIهای واقعی استفاده می‌کند؛ داده‌های mock اجرایی حذف شده و صفحات سنگین به‌صورت lazy-load بارگذاری می‌شوند.
- پرداخت امانی فروشنده و مبلغ را از listing/auction معتبر سمت سرور تطبیق می‌دهد.
- release gate محلی برای کنترل آمادگی backend، قیمت‌گذاری، کاتالوگ، AI و routeهای کلیدی فرانت در `scripts/release-gate.mjs` قرار دارد و از ریشه با `npm run release:gate` اجرا می‌شود.
- compose production-like تمام تنظیمات runtime حساس backend را (Redis، منبع قیمت، درگاه پرداخت، refund و AI local) از `.env` به کانتینر منتقل می‌کند؛ در production مقدارهای mock و secretهای نمونه مجاز نیستند.

راهنمای تست در [backend/TESTING.md](backend/TESTING.md) و راهنمای اجرای امن MVP در [MVP_SAFE_RUNBOOK.md](MVP_SAFE_RUNBOOK.md) است.

## ساختار پروژه

```
goldexacode/
├── frontend/          # React 18 + TypeScript + Vite
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── store/
│   │   ├── utils/
│   │   └── lib/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── backend/           # NestJS + PostgreSQL + Redis
│   ├── src/
│   │   ├── gold-pricing/
│   │   ├── products/
│   │   ├── orders/
│   │   ├── users/
│   │   ├── admin/
│   │   └── common/
│   ├── package.json
│   └── tsconfig.json
│
├── mobile/            # React Native (Expo)
│   ├── App.tsx
│   ├── package.json
│   └── app.json
│
├── ai-service/        # Python + FastAPI + TensorFlow
│   ├── main.py
│   ├── train.py
│   └── requirements.txt
│
├── database/          # PostgreSQL Schema
│   └── schema.sql
│
├── infra/             # Docker, CI/CD
│   ├── docker-compose.yml
│   └── .github/workflows/ci.yml
│
└── README.md
```

## MVP Features (فاز ۱)

### ✅ 1.1 معماری و راه‌اندازی پروژه
- [x] Setup Repositoryهای Git
- [x] تعیین Tech Stack نهایی
- [x] Setup CI/CD Pipeline برای lint/build/test/security/audit و compose validation
- [x] type-check و web export اپ Expo موبایل در CI
- [x] اسکریپت benchmark قابل‌تکرار برای ثبت p50/p95/max API (`scripts/benchmark-backend.mjs`)
- [x] benchmark endpointهای عمومی پرترافیک با ۱۰۰ درخواست و concurrency=10؛ همه‌ی p95های ثبت‌شده زیر ۲۰۰ms هستند.
- [x] release gate قابل‌تکرار برای readiness و smoke routeهای اصلی (`scripts/release-gate.mjs`)
- [x] اسکریپت recovery امن برای خطاهای stale socket در Docker Desktop ویندوز (`scripts/start-goldexa-docker.ps1`)
- [x] ایجاد Design System

### ✅ 1.2 درگاه قیمت‌گذاری لحظه‌ای طلا
- [x] Background Job برای به‌روزرسانی قیمت هر دقیقه
- [x] ذخیره قیمت‌ها در PostgreSQL
- [x] Cache با Redis
- [x] API برای دریافت قیمت‌های لحظه‌ای

### ✅ 1.3 کاتالوگ و فروشگاه آنلاین
- [x] صفحه اصلی با محصولات ویژه
- [x] سیستم جستجو و فیلتر
- [x] صفحه محصول با جزئیات کامل
- [x] نمایش قیمت شکسته‌شده (خام، اجرت، سود، مالیات)
- [x] گالری تصاویر

### ✅ 1.4 فرآیند خرید و پرداخت
- [x] سبدخرید با رزرو قیمت ۵ دقیقه‌ای
- [x] Checkout Flow
- [x] Order Management
- [x] Tracking کد رهگیری

### ✅ 1.5 پنل کاربری پایه
- [x] Authentication (SMS OTP) - ساختار آماده
- [x] صفحه پروفایل کاربر
- [x] تاریخچه سفارشات
- [x] مدیریت آدرس‌ها

### ✅ 1.6 پنل مدیریت (بخش اول)
- [x] داشبورد مدیریتی
- [x] مدیریت محصولات (CRUD)
- [x] مدیریت سفارشات
- [x] مدیریت کاربران
- [x] سیستم اعلان‌ها

### ✅ 1.7 طراحی UI/UX و هویت بصری
- [x] Design System با Tailwind CSS
- [x] پالت رنگی (طلایی، سرمه‌ای، سفید)
- [x] Typography (Vazirmatn)
- [x] کامپوننت‌های آماده

## راه‌اندازی

### با Docker (توصیه شده)

```bash
cd goldexacode
docker compose up -d
```

### به صورت دستی

#### Frontend
```bash
cd frontend
npm install
npm run dev
```
**آدرس:** `http://localhost:5174`

#### Backend
```bash
cd backend
npm install
npm run start:dev
```
**آدرس:** `http://localhost:3001`

#### Database
```bash
psql -U postgres -f database/schema.sql
```
**آدرس:** `localhost:5432` (لوکال)

## پورت‌ها

| سرویس | پورت | توضیح |
|-------|------|-------|
| Frontend | 5174 | Vite Dev Server |
| Backend API | 3001 | NestJS API |
| PostgreSQL (لوکال) | 5432 | Database - برای توسعه لوکال |
| PostgreSQL (Docker) | 5433 | Database - در docker-compose |
| Redis | 6379 | Cache |
| RabbitMQ | 5672 | Message Queue |
| RabbitMQ Management | 15672 | Dashboard |

> ⚠️ توجه: پورت 3000 و 5000 برای پروژه‌های دیگر استفاده می‌شود.

## API Endpoints

### Gold Pricing
- `GET http://localhost:3001/gold-pricing` - دریافت همه قیمت‌ها
- `GET http://localhost:3001/gold-pricing/:type` - دریافت قیمت یک نوع

### Products
- `GET http://localhost:3001/products` - لیست محصولات
- `GET http://localhost:3001/products/:id` - جزئیات محصول
- `GET http://localhost:3001/products?category=ring` - فیلتر بر اساس دسته
- `GET http://localhost:3001/products?search=انگشتر` - جستجو

### Auctions
- `GET http://localhost:3001/auctions` - لیست مزایده‌های طلا
- `GET http://localhost:3001/auctions/active` - مزایده‌های فعال
- `GET http://localhost:3001/auctions/user/:userId` - مزایده‌های فروشنده یا برنده
- `POST http://localhost:3001/auctions` - ایجاد مزایده جدید
- `POST http://localhost:3001/auctions/:id/bid` - ثبت پیشنهاد قیمت
- `GET http://localhost:3001/auctions/:id/bids` - تاریخچه پیشنهادها
- `PATCH http://localhost:3001/auctions/:id/review` - ثبت وضعیت کارشناسی و تایید اصالت
- `POST http://localhost:3001/auctions/:id/settle` - تسویه و اعلام برنده نهایی
- `PATCH http://localhost:3001/auctions/:id/status` - تغییر وضعیت مزایده
- `PATCH http://localhost:3001/auctions/:id/cancel` - لغو مزایده

### Orders
- `GET http://localhost:3001/orders` - لیست سفارشات
- `GET http://localhost:3001/orders/:id` - جزئیات سفارش
- `PATCH http://localhost:3001/orders/:id/status` - تغییر وضعیت سفارش

### Users
- `GET http://localhost:3001/users` - لیست کاربران
- `GET http://localhost:3001/users/:id` - جزئیات کاربر
- `PATCH http://localhost:3001/users/:id/level` - تغییر سطح کاربر
- `PATCH http://localhost:3001/users/:id/role` - تغییر نقش کاربر

### Admin
- `GET http://localhost:3001/admin/stats` - آمار داشبورد

## Database

- **PostgreSQL** برای داده‌های اصلی
- **Redis** برای cache و queue
- **RabbitMQ** برای message queue

## Monitoring

- **Prometheus** برای metrics
- **Grafana** برای dashboards
- **Sentry** برای error tracking

## CI/CD

GitHub Actions با workflowهای:
- Backend Test
- Backend Security Regression و dependency audit
- Frontend Build
- Frontend dependency audit
- Compose Validation
- Docker Build

جزئیات استقرار امن، healthcheck و fail-closed configuration در
[MVP_SAFE_RUNBOOK.md](MVP_SAFE_RUNBOOK.md) و [backend/TESTING.md](backend/TESTING.md) آمده است.
