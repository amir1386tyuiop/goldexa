# تحویل MVP بک‌اند گلدکسا

این سند خلاصه‌ی پیاده‌سازی ماژول‌های backend نسخه‌ی MVP (ردیف‌های ۴ تا ۸) است.

## اجرا
- PostgreSQL: سرویس `postgresql-X64-17`، دیتابیس `goldeksa` (postgres/postgres@localhost:5432)
- Backend: `node dist/main.js` (بعد از `npx nest build`) روی پورت **3001**
- Frontend: `vite` روی پورت **5174** (proxy `/api` → backend)
- متغیرهای محیطی جدید در `.env.example` مستند شده‌اند.

---

## ردیف ۴ — درگاه قیمت لحظه‌ای طلا ✅
- سرویس `GoldPricingService`: Cron هر دقیقه، abstraction منبع با `GOLD_PRICE_SOURCE` (مقادیر: `mock` | `tgju`).
- **Adapter اختصاصی tgju.org** (`call.tgju.org/ajax.json`): پارس `geram18/mesghal/ons/sekee`، با `GOLD_PRICE_TGJU_DIVISOR` برای تبدیل ریال→تومان.
- **فرمول قیمت نهایی (اصلاح‌شده):** `وزن×قیمت روز + اجرت + سود + مالیات`. **مالیات ارزش افزوده فقط روی (اجرت+سود)** محاسبه می‌شود (طبق قانون طلای ایران) — باگ قبلی که روی کل مبلغ مالیات می‌گرفت رفع شد.
- قیمت در `calculate` **داخلی و زنده** خوانده می‌شود (مشتری نمی‌تواند قیمت دلخواه بفرستد).
- **کش in-memory** (TTL 15s)، **اعتبارسنجی نوسان** (رد جهش >15٪)، **ثبت `price_history`** (append هنگام تغییر).
- Endpointها: `GET /gold-pricing`, `/gold-pricing/:type`, `/gold-pricing/status`, `/gold-pricing/history/:type`, `POST|GET /pricing/calculate/:category`.

## ردیف ۵ — کاتالوگ و فروشگاه ✅
- `GET /products` با **جستجوی متنی** + **فیلتر پیشرفته** (category, karat, minWeight/maxWeight, minPrice/maxPrice, isNew, isFeatured, inStock) + **مرتب‌سازی** (newest, price/weight asc/desc) + **صفحه‌بندی** (page/limit). تعداد کل در هدر `X-Total-Count`/`X-Total-Pages` (خروجی آرایه برای سازگاری با frontend حفظ شد).
- `GET /products/home`: فید پویای صفحه‌ی اصلی (جدید/منتخب/تخفیف‌دار).

## ردیف ۶ — خرید و پرداخت ✅
- **درگاه زرین‌پال** (`ZarinpalService`): `request` و `verify` با حالت **sandbox** و **mock fallback** (بدون merchant id، کل جریان لوکال کار می‌کند). با `ZARINPAL_MERCHANT_ID` به حالت واقعی می‌رود بدون تغییر کد.
- **idempotency:** تکرار درخواست با همان `idempotencyKey` → همان تراکنش (بدون دوبار شارژ)؛ `verify` روی تراکنش paid → بدون پردازش مجدد.
- پس از verify موفق، سفارش به‌صورت **atomic** به وضعیت `paid` می‌رود.
- **رزرو قیمت ۵ دقیقه‌ای:** `POST /pricing/quote/:category` → `quoteId` با انقضای ۳۰۰ ثانیه؛ `GET /pricing/quote/:id` اعتبار را برمی‌گرداند.
- سفارش‌ها از قبل با transaction و شماره‌ی یکتا (`GX-...`) و کد رهگیری ساخته می‌شوند.

## ردیف ۷ — پنل کاربری ✅
- ورود موبایل + **OTP هش‌شده** (SHA-256)، انقضای ۵ دقیقه.
- پروفایل، آدرس‌ها، حساب بانکی، KYC، تاریخچه و وضعیت سفارش، کد رهگیری — موجود.

## ردیف ۸ — پنل مدیریت (بخش اول) ✅
- داشبورد کارت‌های خلاصه، مدیریت محصول/سفارش/پرداخت/تنظیمات (RBAC).
- **آپلود تصویر محصول WebP:** `POST /uploads/product-image` (multer + sharp → تبدیل به WebP بهینه، resize، serve از `/uploads`). فقط ادمین (permission `UPDATE_ANY_PRODUCT`).
- **مسدودسازی کاربر:** `PATCH /admin/users/:id/status` (permission `BLOCK_USER`)؛ کاربر مسدود اجازه‌ی ورود ندارد.

---

## هسته‌ی مالی و امنیت (کیفیت ردیف ۱۸)
- **کیف پول atomic:** خرید/فروش طلا داخل DB transaction با قفل سطر؛ خرید **ریال کم می‌کند** و طلا اضافه، فروش برعکس (با قیمت+اسپرد). باگ‌های «طلای مجانی» و «طلای سوخته» رفع شد.
- **Reconciliation:** `GET /wallet/user/:id/reconcile` — موجودی باید همیشه = جمع دفترکل (`amount`/`amount_grams`).
- یکتایی `wallets.user_id`.
- **امنیت:** OTP پشت `RETURN_OTP_IN_RESPONSE` (در prod خاموش)؛ **rate-limit** روی auth (۵ OTP و ۱۰ login در دقیقه)؛ **RBAC** روی همه‌ی routeهای ادمین (`PermissionsGuard` + `@Permissions`).

## تغییرات schema
`amount_grams` (wallet_transactions)، `idempotency_key` (payment_transactions)، `is_blocked` (users)، جدول `price_history`، یکتایی `wallets.user_id`. همه در `database/schema.sql` به‌روز شده‌اند.

## سخت‌سازی و زیرساخت (تکمیل‌شده)
- **Migration واقعی TypeORM:** `src/data-source.ts` + scriptهای `migration:generate|run|revert`؛ migration پایه `BaselineMvpSchema` نوشته، اجرا و در جدول `migrations` ثبت شد. از این پس تغییر schema از مسیر migration انجام می‌شود (جلوگیری از drift). نکته: چون schema.sql دستی از varchar/نام `*_fkey` استفاده می‌کند و entityها enum، `migration:generate` خروجی «نرمال‌سازی» تولید می‌کند؛ برای تغییرات جدید migration دستی/افزایشی توصیه می‌شود.
- **سوییت تست Jest:** کانفیگ jest + ۸ تست (`pricing.service.spec` فرمول مالیات و `zarinpal.service.spec` حالت mock). با `npm test` اجرا می‌شود — همه pass.
- **کش آماده‌ی Redis:** `CacheService` (ioredis) که اگر سرور Redis در دسترس باشد از آن و وگرنه از in-memory استفاده می‌کند (`CACHE_DRIVER`). کش قیمت طلا از این سرویس استفاده می‌کند.
- **observability:** `AuditLogger` سراسری که عملیات مالی (`WALLET_*`, `PAYMENT_VERIFIED`) را در `audit_logs` ثبت و لاگ ساختاریافته می‌زند؛ endpoint `/metrics` (uptime/memory).
- **AI پشت feature flag:** کل `ai-engine` با `FeatureFlagGuard` پشت `AI_ENGINE_ENABLED` (پیش‌فرض خاموش → 503).
- **رزرو موجودی سبد:** افزودن به سبد موجودی را با احتساب رزروهای فعال بررسی و تا `CART_RESERVATION_MINUTES` رزرو می‌کند (+ رفع باگ DTOهای سبد که کل cart را ۴۰۰ می‌کرد).

## آسیب‌پذیری بحرانی رفع‌شده: خود-ارتقا به admin
- `PATCH /users/:id/role` بدون هیچ guard باز بود → هر کاربر می‌توانست **خودش را admin کند**. حالا `AdminGuard` (فقط admin) دارد. `level`، `kyc` و لیست کاربران هم admin-only شدند.

## endpointهای افزوده‌شده طبق API Spec
- `POST /auth/logout`، `GET/PATCH /users/me` (از JWT)، `GET /pricing/current`، `GET /admin/reports` (گزارش درآمد تفکیکی: پرداخت‌های موفق، ارزش سفارش‌ها، کارمزد escrow، سفارش به تفکیک وضعیت)، `POST /orders/:id/cancel`.
- endpointهای شخصی users (profile/kyc/addresses/bank) حالا ownership دارند (کاربر فقط داده خودش؛ admin استثنا).

## رفع شکاف امنیتی RBAC (بخش ۱۱ سند RBAC)
- **آسیب‌پذیری یافت‌شده:** endpointهای مالی/شخصی بدون احراز هویت باز بودند و یک کاربر می‌توانست کیف پول/سفارش کاربر دیگر را ببیند.
- **رفع:** `JwtAuthGuard` (اجبار ورود) + `OwnerGuard` (فقط داده‌ی خودت؛ admin استثنا) روی `wallet`، `orders`، `cart` اعمال شد. userId از param یا body چک می‌شود. `SecurityModule` سراسری.
- **تست:** بدون توکن → 401، کاربر دیگر → 403، خودِ کاربر → 200، admin → 200. ثبت‌نام (`POST /users`) عمومی باقی ماند.

## تطبیق با معیارهای پذیرش PRD (Acceptance Criteria)
- **۵.۱ نوسان ۲٪:** آستانه رد قیمت پرت از ۱۵٪ به **۲٪** اصلاح شد (طبق AC).
- **۵.۱ هشدار ادمین:** هنگام قطع منبع قیمت، آخرین قیمت معتبر سرو و یک هشدار (`PRICE_SOURCE_DOWN`) در audit ثبت + لاگ می‌شود؛ رد نوسان هم `PRICE_FLUCTUATION_REJECTED` ثبت می‌کند.
- **۵.۲ نتیجه خالی:** endpoint `GET /products/suggestions` محصولات مشابه (هم‌دسته/منتخب/جدید) را برمی‌گرداند.
- **۵.۴ CRUD آدرس:** افزودن/**ویرایش** (`PATCH /users/:id/addresses/:addressId`)/**حذف** (`DELETE`) کامل شد.
- **۵.۵ WebP < ۲۰۰KB:** آپلود با کاهش تطبیقی کیفیت/ابعاد، خروجی را زیر ۲۰۰KB نگه می‌دارد (تست: منبع ۴۵۲KB → ۱۶۹KB).

## تست
- ۹۷ endpoint GET: ۲۰۰ (۶ مورد ai-engine عمداً 503 به‌خاطر feature flag).
- جریان مالی، پرداخت زرین‌پال + idempotency، رزرو قیمت، rate-limit، block، آپلود WebP، رزرو موجودی، audit، migration، تست‌های Jest — همه تأیید شدند.
