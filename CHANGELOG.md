# Changelog

## MVP hardening

- Prevented direct wallet minting: deposits and generic ledger entries are admin-only.
- Added wallet-backed order payment with pessimistic wallet/inventory locks, rollback, and idempotency.
- Added wallet refund primitive and overdraw protection.
- Moved five-minute pricing quotes to the cache abstraction with Redis TTL and memory fallback.
- Added auction authentication, seller ownership, server-side bidder identity, and state validation.
- Protected catalog mutations, marketplace listing mutations, and escrow status mutations.
- Added checkout/refund E2E suites and an isolated PostgreSQL/Redis test compose file.
- Added security, wallet, order, payment, cache, and pricing tests.
- Removed frontend runtime mock data and added domain API facades with route-level lazy loading.
- Escrow seller identity and payable amount are now reconciled against active listings or winning auctions.
- Production now fails closed when the payment gateway or gold-price source is not configured.
- E2E compose now includes an isolated Redis service and runs with `CACHE_DRIVER=redis`.

## Verification status

- Backend build: passing.
- Frontend lint/build: passing.
- Backend unit/security suites: passing locally.
- Real PostgreSQL/Redis E2E: requires Docker Desktop or an equivalent test environment and `E2E_BASE_URL`; skipped when unavailable.

## Important release notes

- Do not run `database/seed.sql` against production.
- Set `POSTGRES_PASSWORD`, `JWT_SECRET`, RabbitMQ credentials, and application URLs outside git.
- Full refund settlement still requires a successful run of the isolated PostgreSQL/Redis E2E stack before handling real funds.
