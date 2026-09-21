# راهنمای تست Backend

## Unit

```powershell
cd backend
npm test -- --runInBand
```

این suite فرمول pricing، mock gateway زرین‌پال و رفتار پایه‌ی JWT/owner/admin guardها را پوشش می‌دهد.

## Security policy

برای اجرای ماتریس guardهای endpointهای حساس:

```powershell
npm run test:security
```

این gate همیشه فعال است و باید بدون finding پاس شود؛ مسیر callback زرین‌پال عمداً عمومی است، اما مسیر direct verification نیازمند JWT است.

## E2E checkout/refund

The full E2E suite uses isolated PostgreSQL and Redis services. It does not use
`database/seed.sql`, the development compose database, or a production URL.
The compose file mounts `database/schema.sql` and runs the versioned migrations
through a dedicated one-shot migration service before the backend starts; the schema contains no
user credentials or OTP fixtures. The wallet suite uses direct SQL fixtures
only when `E2E_ALLOW_DB_FIXTURES=1` and `DB_DATABASE` contains `test` or `e2e`.

Start the isolated stack from `backend`:

```powershell
docker compose -f test/docker-compose.e2e.yml up -d --build
$env:E2E_BASE_URL = 'http://localhost:3011'
$env:E2E_ALLOW_DB_FIXTURES = '1'
$env:DB_HOST = 'localhost'
$env:DB_PORT = '55432'
$env:DB_USERNAME = 'goldeksa_e2e'
$env:DB_PASSWORD = 'goldeksa_e2e_only'
$env:DB_DATABASE = 'goldeksa_e2e'
npm run test:e2e -- --runInBand
docker compose -f test/docker-compose.e2e.yml down -v
```

On Windows hosts where Docker reserves port `56379`, add the local override
file to the compose command. It removes the optional Redis host mapping while
keeping the backend-to-Redis connection on the isolated Docker network:

```powershell
docker compose -f test/docker-compose.e2e.yml -f test/docker-compose.e2e.override.yml up -d --build
```

The E2E backend uses `CACHE_DRIVER=redis` and the dedicated Redis service on
the internal compose network. The host mapping `56379` is available for
optional cache inspection and does not share the development Redis instance.

The wallet fixture is deliberately refused for `goldeksa` or production-like
database names. Use a fresh E2E volume for repeatable runs.

The suite covers:

- OTP authentication and user isolation;
- cart creation, reservation and cross-user access denial;
- authoritative order totals from product data;
- mock ZarinPal request, idempotency and verification;
- refund ownership, amount bounds and refund listing;
- wallet minting protection and wallet checkout debit contract.
- group creation, live-priced product selection, atomic share payment, inventory
  locking and final paid-order checkout.

`wallet checkout contract` is skipped unless the isolated database fixture
environment is explicitly enabled. A skipped suite is not a production signoff.

The isolated stack was re-verified with both PostgreSQL and Redis: 4 suites and
15 tests passed, including checkout, wallet payment, refund ownership,
over-refund rejection, idempotency, quote/cache behavior, group buying, and
marketplace/escrow.

The current backend contract hardening also verifies that checkout carries quote
IDs into order validation, online checkout requests a gateway transaction, and
cart price/name values cannot override the locked product row.

## Phase 2 MVP: Builder, Smart Vault and AR

Custom Builder creates user-owned drafts and derives quote amounts from the
persisted design. Quote expiry defaults to 30 minutes; only admins can approve
designs or manage gemstones. Smart Vault exposes an authenticated `/summary`
endpoint and enforces asset/snapshot/alert ownership. AR catalog reads are
feature-gated with `AR_ENABLED=false` by default; model writes require admin
access and previews require authentication, while public reads expose shared
previews only. Set `AR_ENABLED=true` only after the external WebAR/model
service is configured.

## Dependency audit

After a clean `npm ci`, verify the runtime dependency tree with:

```powershell
npm audit --omit=dev --offline --json
```

The current backend lockfile has no high or critical production findings, but
the upstream NestJS 10 dependency line still reports 11 lower-severity findings
(1 low and 10 moderate) in the current npm advisory database. The CI gate fails
on high/critical findings; upgrade to the NestJS 12 line requires a separate
compatibility migration and must not be applied blindly. Run the same audit
without `--omit=dev` before shipping development tooling changes.

## Runtime security configuration

Production and test startup require an explicit `JWT_SECRET` with at least 32
characters. Production also requires HTTPS origins in `FRONTEND_URL`; wildcard
CORS is rejected. The security configuration tests cover these fail-closed
rules and origin normalization.

The API applies baseline security headers in `src/main.ts`. Verify them against
a running instance with:

```powershell
curl.exe -I http://localhost:3001/health
```

Expected headers include `X-Content-Type-Options`, `X-Frame-Options`,
`Referrer-Policy`, `Permissions-Policy`, and `Content-Security-Policy`.

## CI gate

GitHub Actions runs backend lint/build/unit tests, the always-on security regression suite,
production dependency audits, frontend
lint/build/audit, compose validation, Docker image builds, and the isolated E2E
suite with real PostgreSQL and Redis. The E2E job waits for `/health` before
running and always tears down its dedicated stack; it must never point to a
production database.

## E2E smoke

backend را روی test database اجرا کنید و سپس:

```powershell
$env:E2E_BASE_URL = 'http://localhost:3001'
npm run test:e2e
```

تست‌ها دسترسی anonymous به orders، cart، wallet، payment transactions، direct payment verification، pricing rule mutation، checkout، wallet payment و refund را بررسی می‌کنند. بدون `E2E_BASE_URL` این suite skip می‌شود.

`database/seed.sql` فقط برای development است و تست‌ها نباید روی production database اجرا شوند.

## AI Engine integration

`AI_ENGINE_ENABLED` باید صریحاً `true` باشد. مسیرهای کاربری به JWT نیاز دارند و
شناسه کاربر را فقط از `sub` توکن می‌گیرند؛ `userId` ارسالی در body مبنای مالکیت
نیست. مسیرهای زیر برای اتصال UI هستند:

- `GET /ai-engine/providers` برای فهرست capabilityها (بدون secret)
- `GET /ai-engine/providers/status` برای admin با permission `VIEW_REPORTS`
- `GET /ai-engine/predictions/me` و `POST /ai-engine/predictions/execute`
- `GET /ai-engine/recommendations/me` و `POST /ai-engine/recommendations/execute`
- `POST /ai-engine/matches/execute` برای admin با permission `VIEW_REPORTS`

`AI_LOCAL_URL` سرویس اختیاری local AI است. با `AI_PREFER_LOCAL=true` ابتدا
local استفاده می‌شود و در صورت خطای آن، فقط اگر `OPENROUTER_API_KEY` تنظیم باشد
به OpenRouter fallback می‌شود. اگر هیچ provider آماده نباشد یا خروجی ساختاریافته
نامعتبر باشد، درخواست خطا می‌دهد و نتیجه‌ی ساختگی ذخیره نمی‌شود. timeoutها با
`AI_LOCAL_TIMEOUT_MS` (پیش‌فرض ۸ ثانیه) و `AI_OPENROUTER_TIMEOUT_MS` قابل تنظیم
هستند؛ کلید API هرگز در response status/config یا لاگ metric قرار نمی‌گیرد.

تست‌های unit قرارداد اجرای local، fallback و رد خروجی غیر JSON را پوشش می‌دهند:

```powershell
npm test -- --runInBand ai-engine.service.spec.ts
npm run build
```
