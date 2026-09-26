# بک‌لاگ کامل گلدکسا — برگرفته از Proposal + PRD + PRD1 + Architecture

راهنمای وضعیت: ✅ انجام‌شده (backend) · 🟡 نیمه‌کاره · ⬜ مانده · 🎨 وظیفه‌ی frontend/UX · 🔒 نیازمند ورودی/تصمیم بیرونی
دامنه‌ی تحویلی کاربر: **backend نسخه MVP (فاز ۱)**. موارد فاز ۲ و ۳ برای کامل بودن مرجع آورده شده‌اند.

---

## فاز ۰ — زیرساخت و طراحی
- ✅ راه‌اندازی پروژه (NestJS + React/Vite) و اجرای لوکال (backend:3001، frontend:5174، postgres:5432)
- 🟡 معماری Hexagonal/Modular-Monolith — ماژولار هست ولی لایه‌بندی Domain/Application/Infra کامل نیست (CRUD مستقیم)
- ✅ PostgreSQL + 🟡 Redis (کلاینت آماده، سرور اجرا نیست → fallback in-memory) + ⬜ Elasticsearch (برای Search پیشنهاد شده)
- ✅ Migration واقعی TypeORM (data-source + scripts + baseline) — منبع واحد schema
- 🎨 UX/UI Design System در Figma (پالت طلایی/سرمه‌ای، تایپوگرافی IRANSans، آیکون‌ها) — Single Source of Truth
- 🟡 CI/CD (GitHub Actions: test/build/security/compose/docker gate پیاده شده؛ deploy محیط واقعی و secrets هنوز نیازمند زیرساخت مقصد است) + Docker Compose production-like موجود و متغیرهای runtime حساس به backend منتقل می‌شوند
- 🟡 Monitoring: endpoint استاندارد `/metrics/prometheus`، Prometheus و Grafana در compose production-like اضافه شد؛ datasource/dashboard پایه و ruleهای API-down، scrape-missing و memory-pressure provision می‌شوند؛ اتصال Alertmanager/ELK/Sentry و alert delivery محیط واقعی باقی است

---

## فاز ۱ — MVP (تحویلی اصلی backend)

### ۵.۱ درگاه قیمت‌گذاری لحظه‌ای طلا
- ✅ سرویس پس‌زمینه دریافت قیمت هر ≤۱ دقیقه (Cron) از منبع (adapter tgju.org + fallback mock)
- ✅ فرمول قیمت نهایی: `(وزن×قیمت روز ۱۸عیار) + اجرت + سود + مالیات` — **مالیات فقط روی اجرت+سود**
- ✅ ذخیره و کش قیمت (Redis-ready) + ثبت `price_history`
- ✅ AC: نمایش آخرین قیمت معتبر هنگام قطع منبع (fallback)
- ✅ AC: رد نوسان غیرمنطقی — آستانه‌ی hard limit برابر ۲٪ است و مقدار ردشده audit می‌شود
- ✅ AC: قیمت یکسان در همه‌جا (قیمت فقط از Pricing Module خوانده می‌شود)
- ✅ AC: ادمین می‌تواند ضرایب اجرت/سود/مالیات را تغییر دهد (pricing rules/tax/labor/spread + CRUD)
- ✅ AC: هشدار به مدیر هنگام قطع منبع قیمت (audit، log و اعلان in-app برای مدیران)
- ✅ endpoint وضعیت فید برای تایمر/چراغ سبز UI (`/gold-pricing/status`)
- ✅ نمایش قیمت زنده‌ی یکسان با checkout در catalog/product responses + تایمر/چراغ سبز در صفحه‌ی محصول

### ۵.۲ کاتالوگ و فروشگاه
- ✅ جستجوی متنی + فیلتر پیشرفته (دسته/جنس/عیار/بازه‌ی وزن/بازه‌ی قیمت) هم‌زمان
- ✅ صفحه‌بندی + مرتب‌سازی + `X-Total-Count`
- ✅ فید صفحه‌ی اصلی پویا (`/products/home`: جدید/منتخب/تخفیف‌دار)
- ✅ صفحه‌ی محصول (اطلاعات/مدیا/موجودی) — endpointها
- ✅ AC: پیام «محصولی یافت نشد» + پیشنهاد محصولات مشابه از endpoint suggestions
- 🎨 AC: بارگذاری صفحه‌ی محصول < ۱.۵ ثانیه (FCP) — سمت frontend
- 🎨 گالری تصاویر با زوم، صفحه‌ی اصلی با بنر

### ۵.۳ خرید و پرداخت
- ✅ سبد خرید + به‌روزرسانی قیمت + تغییر تعداد/حذف
- ✅ رزرو موجودی سبد + **قفل قیمت ۵ دقیقه‌ای** (quote)
- ✅ تسویه با آدرس + خلاصه‌ی سفارش (order + items، atomic)
- ✅ اتصال درگاه **زرین‌پال** (request/verify) با sandbox/mock + **idempotency** (بدون دوبار شارژ)
- ✅ AC: شماره سفارش یکتا (`GX-...`)
- ✅ AC: پرداخت ناموفق → بازگشت با خطای واضح (status failed)
- ✅ مدیریت لجستیک MVP: ثبت کد رهگیری توسط فروشنده + نمایش به کاربر (tracking/shipments)
- 🟡 اتصال واقعی زرین‌پال نیازمند `ZARINPAL_MERCHANT_ID` و تست sandbox است؛ refund آنلاین اکنون فقط با `ZARINPAL_REFUND_ENDPOINT` و تأیید provider انجام می‌شود و در mock عمداً رد می‌شود

### ۵.۴ پنل کاربری پایه
- ✅ ورود موبایل + OTP (هش‌شده، انقضای ۵دقیقه، پشت flag برای prod، rate-limit)
- ✅ پروفایل (نام/شماره) + آدرس‌ها (افزودن/ویرایش/حذف) + حساب بانکی + KYC
- ✅ تاریخچه‌ی سفارش + جزئیات + وضعیت لحظه‌ای + فاکتور + کد رهگیری
- ✅ AC: کاربر فقط به داده‌ی خودش دسترسی دارد (RBAC) — 🟡 نیازمند ممیزی enforce روی همه‌ی routeهای کاربر

### ۵.۵ پنل مدیریت (بخش اول)
- ✅ داشبورد کارت‌های خلاصه (کاربر جدید/سفارش امروز/درآمد روز/محصول فعال) — `/admin/stats`
- ✅ مدیریت محصول (افزودن/ویرایش/غیرفعال) + **آپلود تصویر WebP** (sharp)
- ✅ AC: خروجی تصویر WebP با محدودیت سخت حداکثر ۲۰۰KB؛ اگر فشرده‌سازی به سقف نرسد فایل ذخیره نمی‌شود.
- ✅ مدیریت سفارش (لیست/فیلتر/تغییر وضعیت) — تغییر وضعیت بلافاصله در پنل کاربر منعکس می‌شود
- ✅ مدیریت کاربران + **مسدودسازی** (block/unblock + جلوگیری از ورود)
- ✅ گزارش‌های مالی پایه و تفکیکی (پرداخت، سفارش، escrow آزادشده، کمیسیون مزایده، بازپرداخت و payout پرداخت‌شده) — ledger مستقل `platform_revenue` برای کمیسیون escrow/مزایده اضافه شد؛ اسپرد/اشتراک/سرویس‌های بدون رکورد مالی هنوز نیازمند منبع درآمد قطعی هستند
- ✅ مدیریت محتوا (content pages/promotions/ads) + تنظیمات سیستم

### ۵.۶ UI/UX
- 🎨 کل این بخش وظیفه‌ی طراح/frontend است (Design System، Wireframe، Mockup، Responsive)

---

## الزامات غیرکارکردی (NFR) — کیفیت تحویل
- ✅ امنیت: JWT، RBAC، هش OTP، rate-limit، عدم ذخیره‌ی اطلاعات پرداخت
- 🟡 OWASP Top 10 (XSS/SQLi/CSRF): ORM + ValidationPipe و **Helmet** فعال است؛ ممیزی route-by-route، سیاست Origin/CSRF متناسب با Bearer JWT و benchmark کامل باقی است
- 🔒 HTTPS/TLS 1.3: در استقرار (reverse proxy) — کد آماده است
- 🟡 عملکرد API < ۲۰۰ms: benchmark قابل‌تکرار روی ۶ endpoint پرترافیک عمومی با ۱۰۰ درخواست و concurrency=10 اجرا شد؛ p95ها: `/health`=36ms، `/health/ready`=111ms، `/gold-pricing/status`=55ms، `/products/home`=105ms، `/products`=70ms، `/pricing/current`=30ms (همه زیر ۲۰۰ms). ممیزی کامل ایندکس/N+1 و benchmark endpointهای احراز‌شده باقی است.
- ⬜ در دسترس‌پذیری ۹۹.۹٪ + مانیتورینگ کامل (Prometheus/Grafana/ELK)
- ✅ observability پایه: AuditLogger مالی + `/metrics` + لاگ ساختاریافته
- 🟡 معماری: مسیر Modular-Monolith → Microservice (فاز بعد) — لایه‌بندی Hexagonal کامل نشده
- ⬜ Event Bus / WebSocket برای رویدادها (لازم برای مزایده‌ی فاز ۳)

---

## فاز ۲ — تجربه و دارایی (خارج از MVP؛ کد اولیه موجود)
- ⬜ **AR Try-On** (WebView + WebAR: 8th Wall/MediaPipe؛ ≥۲۵fps، شروع <۳s) — 🎨 عمدتاً frontend/mobile؛ backend: ar-models/previews موجود
- ✅ **Smart Vault** (Digital Twin، ارزش لحظه‌ای، سود/زیان با کل مبلغ پرداختی، نمودار روند، هشدار قیمت) — محاسبه‌ی live، snapshot زمان‌بندی‌شده، نمودار چنددارایی و lifecycle کامل هشدار شامل ساخت/غیرفعال‌سازی/reset پیاده شد
- 🟡 **Custom Jewelry Builder** (انتخاب پایه/وزن/عیار/سنگ، پیش‌نمایش سه‌بعدی، قیمت لحظه‌ای <۲۰۰ms، ذخیره/بازیابی، مرحله‌ی ساخت) — backend موجود
- 🟡 **پنل مدیریت v2** (صف سفارش سفارشی، API مرحله‌های ساخت، upload امن تصویر/GLB/glTF و workflow UI پیاده شد؛ گزارش تفصیلی و مدیریت فایل در object storage هنوز باقی است)

## فاز ۳ — اکوسیستم و جامعه (خارج از MVP؛ کد اولیه موجود)
- 🟡 **بازار دست‌دوم + مزایده C2C** (ثبت آگهی یک‌کلیک از صندوقچه، فروش مستقیم/مزایده، بالاترین پیشنهاد، **Escrow**، تأیید کارشناس، انتقال مالکیت و امتیازدهی) — ثبت آگهی از Smart Vault، خرید مستقیم با کمیسیون قابل‌تنظیم، escrow با lifecycle کامل `held → shipped → released`، WebSocket، cron lifecycle، distributed lock، moderation ادمین، انتقال مالکیت به Smart Vault و امتیازدهی مبتنی بر معامله پیاده شده؛ payout بانکی provider-backed و الزامات حقوقی/عملیاتی باقی است
- 🟡 **خرید گروهی** (سرگروه، دعوت با لینک/کد، سهم هر نفر، تخفیف گروهی، پرداخت یکجا/جداگانه، پنل سرگروه) — route و UI، انتخاب محصول از کاتالوگ، احراز مالکیت JWT، ایجاد گروه، join، پرداخت سهم، نهایی‌سازی اتمیک سفارش/قفل موجودی، لغو گروه و refund سهم‌ها و رهگیری امن سفارش گروهی (وضعیت، شرکت حمل، کد رهگیری و تاریخچه برای رهبر/اعضا/ادمین) پیاده شد؛ اتصال provider حمل‌ونقل و SLA عملیاتی باقی است
- 🟡 **موتور AI** (پیش‌بینی قیمت، توصیه‌گر طراحی، Matching خریدار/فروشنده) — artifactهای قابل‌آموزش برای رگرسیون قیمت، popularity/collaborative baseline و matcher اضافه شد؛ workspace برای کاربر عادی از `/me` و برای مدیر از گزارش‌های مدیریتی استفاده می‌کند؛ اتصال داده‌های واقعی، آموزش دوره‌ای production و providerهای پیشرفته هنوز باقی است
- 🟡 **جامعه + چالش‌های طراحی** (صفحه‌ی عمومی، لایک/کامنت/ذخیره، چالش ماهانه، رأی‌گیری، جوایز/نشان خودکار) — feed عمومی، انتشار طرح، like، comment، ذخیره/حذف ذخیره با کنترل مالکیت و نمایش چالش‌ها به frontend متصل شد؛ moderation و چرخه‌ی کامل نشان/جوایز هنوز باقی است

---

## مدل درآمدی (باید در پنل ادمین قابل ردیابی باشد)
- 🟡 کارمزد خرید/فروش · اسپرد · اشتراک ویژه · کمیسیون C2C/مزایده · کارمزد خرید گروهی · خدمات AR · سرویس‌های AI · تبلیغات
  → اسپرد در کیف پول اعمال می‌شود؛ گزارش پنل فعلاً فقط درآمدهایی را نشان می‌دهد که در ledger/escrow/auction رکورد قطعی دارند.

## ریسک‌ها/ابهامات باز (از PRD؛ تصمیم کسب‌وکار/حقوقی — 🔒)
1. محل نگهداری فیزیکی طلا / پشتوانه؟  2. چارچوب حقوقی Escrow؟  3. رگولاتوری C2C؟  4. مدل درآمد AR/AI؟  5. مسئولیت اختلاف خریدار/فروشنده؟

---

## اقلام باقی‌مانده‌ی backendِ قابل‌اقدام (اولویت‌بندی‌شده)
1. ✅ تنظیم آستانه‌ی نوسان قیمت به **۲٪** (طبق AC دقیق PRD)
2. ✅ سخت‌گیری آپلود تصویر به **< ۲۰۰KB** (فشرده‌سازی هدفمند WebP و رد خروجی بزرگ‌تر)
3. ✅ **گزارش تفکیکی درآمد** در پنل ادمین برای کمیسیون‌های قطعی؛ ثبت جداگانه‌ی اسپرد/اشتراک/AI/AR برای حسابداری کامل باقی است.
4. 🟡 **refund آنلاین واقعی** — قرارداد endpoint/provider و credential زرین‌پال باید در محیط sandbox/production تأیید شود؛ در کد، وضعیت `refund_pending`، قفل تراکنش و rollback امن اضافه شده و refund جعلی ممنوع است.
5. 🟡 **payout بانکی واقعی** — چرخه‌ی reserve/approve/processing/paid/reject و ثبت `providerReference` پیاده شده؛ اتصال API بانکی و reconciliation بیرونی باقی است.
6. 🟡 ممیزی **RBAC روی همه‌ی routeهای کاربر** (داده‌های مالی، escrow، wallet، group buying، community و liquidity mutationها enforce شده؛ saved designهای community نیز مالک‌محور و تست‌شده‌اند؛ ممیزی route-by-route سایر ماژول‌ها باقی است)
7. 🟡 ممیزی **OWASP** — Helmet و headers پایه انجام شد؛ بررسی CSRF/Origin متناسب با Bearer JWT، بنچمارک < ۲۰۰ms و ممیزی ایندکس/N+1 باقی است
8. ✅ **هشدار به ادمین** هنگام قطع منبع قیمت (audit + notification)
9. ✅ «محصولات مشابه» در نتیجه‌ی خالی جستجو
10. 🟡 CI/CD (GitHub Actions) + Docker Compose production-like پیاده شده؛ deploy مقصد باقی است
9. 🔒 اتصال‌های واقعی: زرین‌پال (Merchant ID)، tgju (`GOLD_PRICE_SOURCE=tgju`)، Redis (بالا آوردن سرور)
10. ✅ اجرای E2E واقعی با PostgreSQL و Redis ایزوله — ۴ suite و ۱۵ تست سبز
11. ⏸️ (عمدی) OpenAPI/حذف normalizer (frontend)، بازآرایی کامل Hexagonal
