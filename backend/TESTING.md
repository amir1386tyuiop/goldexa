# راهنمای تست Backend

## Unit

```powershell
cd backend
npm test -- --runInBand
```

این suite فرمول pricing، mock gateway زرین‌پال و رفتار پایه‌ی JWT/owner/admin guardها را پوشش می‌دهد.

## Security policy

برای enforce کردن ماتریس guardهای endpointهای حساس:

```powershell
$env:ENFORCE_SECURITY_TESTS = '1'
npm run test:security
```

این gate باید بدون finding پاس شود. مسیر callback زرین‌پال عمداً عمومی است، اما مسیر direct verification نیازمند JWT است.

## E2E checkout/refund

The full E2E suite uses isolated PostgreSQL and Redis services. It does not use
`database/seed.sql`, the development compose database, or a production URL.
The compose file mounts `database/schema.sql` only; the schema contains no
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

`wallet checkout contract` is skipped unless the isolated database fixture
environment is explicitly enabled. A skipped suite is not a production signoff.

The isolated stack was verified on 2026-08-29 with both PostgreSQL and Redis:
2 suites and 11 tests passed, including checkout, wallet payment, refund
ownership, over-refund rejection, idempotency, and quote/cache behavior.

The current backend contract hardening also verifies that checkout carries quote
IDs into order validation, online checkout requests a gateway transaction, and
cart price/name values cannot override the locked product row.

## Dependency audit

After a clean `npm ci`, verify the runtime dependency tree with:

```powershell
npm audit --omit=dev --offline --json
```

The current backend lockfile reports zero vulnerabilities. Run the same audit
without `--omit=dev` before shipping development tooling changes.

## E2E smoke

backend را روی test database اجرا کنید و سپس:

```powershell
$env:E2E_BASE_URL = 'http://localhost:3001'
npm run test:e2e
```

تست‌ها دسترسی anonymous به orders، cart، wallet، payment transactions، direct payment verification، pricing rule mutation، checkout، wallet payment و refund را بررسی می‌کنند. بدون `E2E_BASE_URL` این suite skip می‌شود.

`database/seed.sql` فقط برای development است و تست‌ها نباید روی production database اجرا شوند.
