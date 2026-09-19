# تحویل MVP بک‌اند گلدکسا

> وضعیت این سند باید با artifactهای قابل‌تکرار سنجیده شود. در repository فعلی فقط unit testهای موجود قابل‌تأییدند؛ ادعای «۹۷ endpoint تست‌شده» و «تأیید کامل جریان مالی» artifact قابل‌تکرار ندارد و تحویل قطعی محسوب نمی‌شود.

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
- **سوییت تست Jest:** تست‌های pricing، زرین‌پال، پرداخت، و ماتریس امنیتی. در آخرین اجرای محلی ۱۷ تست pass شد؛ suiteهای E2E بدون `E2E_BASE_URL` عمداً skip می‌شوند.
- **کش آماده‌ی Redis:** `CacheService` (ioredis) که اگر سرور Redis در دسترس باشد از آن و وگرنه از in-memory استفاده می‌کند (`CACHE_DRIVER`). کش قیمت طلا از این سرویس استفاده می‌کند.
- **observability:** `AuditLogger` سراسری که عملیات مالی (`WALLET_*`, `PAYMENT_VERIFIED`) را در `audit_logs` ثبت و لاگ ساختاریافته می‌زند؛ endpoint `/metrics` (uptime/memory).
- **AI پشت feature flag:** کل `ai-engine` با `FeatureFlagGuard` پشت `AI_ENGINE_ENABLED` (پیش‌فرض خاموش → 503).
- **رزرو موجودی سبد:** افزودن به سبد موجودی را با احتساب رزروهای فعال بررسی و تا `CART_RESERVATION_MINUTES` رزرو می‌کند (+ رفع باگ DTOهای سبد که کل cart را ۴۰۰ می‌کرد).

## آسیب‌پذیری بحرانی رفع‌شده: خود-ارتقا به admin
- `PATCH /users/:id/role` بدون هیچ guard باز بود → هر کاربر می‌توانست **خودش را admin کند**. حالا `AdminGuard` (فقط admin) دارد. `level`، `kyc` و لیست کاربران هم admin-only شدند.

## endpointهای افزوده‌شده طبق API Spec
- `POST /auth/logout`، `GET/PATCH /users/me` (از JWT)، `GET /pricing/current`، `GET /admin/reports` (گزارش درآمد تفکیکی: پرداخت‌های موفق، ارزش سفارش‌ها، کارمزد escrow، سفارش به تفکیک وضعیت)، `POST /orders/:id/cancel`.
- endpointهای شخصی users (profile/kyc/addresses/bank) حالا ownership دارند (کاربر فقط داده خودش؛ admin استثنا).

## تکمیل چرخه‌ی بازار دست‌دوم و escrow

- `POST /marketplace/listings/:id/purchase` خرید مستقیم آگهی با کیف پول را در یک transaction انجام می‌دهد؛ listing با قفل سطر بررسی می‌شود، order و escrow ساخته می‌شوند، مبلغ با `holdEscrow` قفل می‌شود و listing به‌صورت اتمیک `sold` می‌شود.
- خرید تکراری همان listing با بررسی escrow/order رد یا به نتیجه‌ی قبلی همان معامله هدایت می‌شود.
- `idempotencyKey` خرید مستقیم در escrow ذخیره و unique شده است؛ retry همان خریدار و listing همان order/escrow قبلی را برمی‌گرداند و reuse کلید برای معامله‌ی دیگر رد می‌شود.
- امتیاز marketplace اکنون فقط پس از escrow `released` و فقط توسط یکی از طرفین واقعی همان معامله پذیرفته می‌شود؛ برای هر طرف/معامله unique index و کنترل تکرار وجود دارد.
- چرخه‌ی برداشت فروش طلای دیجیتال اضافه شد: `POST /wallet/payouts` حساب بانکی کاربر را بررسی و مبلغ را با ledger نوع `payout_hold` رزرو می‌کند؛ ادمین می‌تواند approve/reject/paid کند و reject/failed به‌صورت atomic با `payout_refund` مبلغ را برمی‌گرداند. درخواست‌ها idempotent و قابل رهگیری هستند.
- پنل کاربر فرم درخواست برداشت و تاریخچه‌ی وضعیت را نشان می‌دهد؛ پنل ادمین نیز فهرست برداشت‌های pending، تأیید، رد/بازگشت وجه و ثبت reference بانکی را دارد.
- ثبت آگهی با منبع `goldeksa_purchase` دیگر به `sellerId` اعتماد نمی‌کند: سفارش باید متعلق به همان کاربر، وضعیت `delivered` و دارای item هم‌وزن/هم‌عیار باشد؛ همچنین یک سفارش نمی‌تواند هم‌زمان چند آگهی فعال یا فروخته‌شده داشته باشد.
- `PATCH /marketplace/listings/:id/cancel` برای لغو آگهی توسط فروشنده اضافه شد؛ مالکیت و وضعیت نهایی قبل از تغییر بررسی می‌شود.
- `PATCH /escrow/payments/:id/ship` فقط توسط فروشنده‌ی همان escrow و با کد رهگیری معتبر قابل اجراست.
- `POST /escrow/payments/:id/confirm-delivery` فقط توسط خریدار همان escrow اجرا می‌شود و release atomic مبلغ را انجام می‌دهد.
- `POST /escrow/payments/:id/pay` پرداخت escrow را از کیف پول خریدار انجام می‌دهد و وضعیت را به `held` می‌برد.
- `POST /escrow/payments/:id/dispute` توسط خریدار یا فروشنده اختلاف را ثبت و مبلغ را در وضعیت `disputed` نگه می‌دارد؛ resolution ادمین برای release/refund نیازمند یادداشت اجباری است.
- پنل ادمین اکنون `GET /admin/escrow/disputes` و `PATCH /admin/escrow/:id/resolve` دارد؛ فهرست اختلاف‌ها، دلیل، طرفین و دو مسیر release/refund با یادداشت تصمیم در UI مدیریت نمایش داده می‌شود.
- پایان مزایده دیگر به‌اشتباه `settled/completed` نمی‌شود؛ تا زمان پرداخت برنده در `awaiting_payment` می‌ماند و بعد از پرداخت به escrow متصل می‌شود.
- هنگام `HELD` شدن escrow، مزایده به `escrow_held` و هنگام release به‌صورت transactional به `completed/settled` می‌رود؛ refund نیز مزایده را `failed/refunded` می‌کند تا کیف پول، escrow، سفارش و گزارش مزایده از هم جدا نشوند.
- مسیرهای جدید با تست‌های واحد marketplace، escrow و wallet پوشش داده شده‌اند؛ تست E2E ایزوله‌ی PostgreSQL نیز خرید مستقیم، hold کیف پول، ارسال، release و بازکردن dispute را پوشش می‌دهد.
- rate-limit مربوط به OTP و login اکنون از CacheService استفاده می‌کند؛ در صورت دسترسی Redis، شمارش با `INCR/EXPIRE` بین replicaها مشترک است و فقط در fallback توسعه‌ای به حافظه برمی‌گردد.
- مزایده اکنون gateway زنده‌ی Socket.IO دارد: کلاینت با `auction.join` وارد room می‌شود و هر bid موفق با رویداد `auction.updated` برای همان مزایده broadcast می‌شود؛ Vite و Nginx نیز proxy ارتقای WebSocket را فعال کرده‌اند.
- قیمت آگهی‌های دست‌دوم و مزایده دیگر فقط یک عدد دستی و بی‌منبع نیست: هنگام ایجاد، سرویس Pricing قیمت معتبر ۱۸ عیار، ارزش ذاتی بر اساس وزن/عیار و زمان snapshot را در listing/auction ذخیره می‌کند؛ مبلغ پیشنهادی فروشنده همچنان قیمت قراردادی است اما مقایسه و audit آن بر اساس قیمت زنده انجام می‌شود.
- `AuctionsService.processLifecycle` با cron هر دقیقه وضعیت مزایده‌ها، پایان زمان، مهلت پرداخت و انتقال به برنده دوم را حتی بدون ترافیک endpoint پردازش می‌کند؛ lifecycle اکنون با lock کوتاه‌مدت Redis (`SET NX` با TTL و release توکنی) بین replicaها هماهنگ می‌شود و در production بدون Redis اجرا نمی‌شود.
- endpoint عمومی مزایده فقط وضعیت‌های قابل‌نمایش را برمی‌گرداند و endpoint مدیریتی جدا برای مشاهده‌ی همه‌ی وضعیت‌ها اضافه شده است.
- بازار دست‌دوم endpoint مدیریتی و پنل moderation دارد؛ انتقال وضعیت آگهی با state machine انجام می‌شود و فعال‌سازی بدون تأیید کارشناسی رد می‌شود.
- چرخه‌ی refund سفارش نیز کامل‌تر شد: `GET /admin/refunds` درخواست‌های pending را فهرست می‌کند و `PATCH /admin/refunds/:id` با approve/reject تعیین تکلیف می‌کند؛ approve سفارش wallet در transaction قفل‌شده، credit idempotent به کیف پول انجام می‌دهد و سفارش online تا اتصال provider واقعی عمداً approve نمی‌شود.
- هنگام قطع منبع قیمت، علاوه بر audit/log به همه‌ی کاربران admin اعلان in-app `gold_price_source_down` ارسال می‌شود؛ خطای notification هرگز feed قیمت را متوقف نمی‌کند.
- ممیزی dependency در این مرحله، Axios را به `1.20.0`، Sharp را به `0.35.4`، TypeORM را به `0.3.31` و Socket.IO parser را به `4.2.7` ارتقا داد؛ آسیب‌پذیری‌های باقی‌مانده به زنجیره‌ی Nest 10 و ابزارهای transitive مربوط‌اند و رفع کامل آن‌ها نیازمند migration کنترل‌شده به Nest 12 است، بنابراین `npm audit fix --force` اجرا نشده است.

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
- suite فعلی Jest شامل ۱۲ تست موفق است؛ پوشش آن عمدتاً unit-level است.
- smoke/e2e setup در `backend/test/e2e` اضافه شده و با `E2E_BASE_URL` اجرا می‌شود. compose ایزوله‌ی `backend/test/docker-compose.e2e.yml` PostgreSQL و Redis جدا دارد؛ `E2E_ALLOW_DB_FIXTURES=1` فقط در همین دیتابیس تست برای seed کیف پول مجاز است.
- security enforcement با `ENFORCE_SECURITY_TESTS=1` آماده است و تا رفع findingهای endpointهای حساس نباید pass کامل تلقی شود.
