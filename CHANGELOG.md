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

## Verification status

- Backend build: passing.
- Frontend lint/build: passing.
- Backend unit/security suites: passing locally.
- Real PostgreSQL/Redis E2E: requires Docker Desktop or an equivalent test environment and `E2E_BASE_URL`; skipped when unavailable.

## Important release notes

- Do not run `database/seed.sql` against production.
- Set `POSTGRES_PASSWORD`, `JWT_SECRET`, RabbitMQ credentials, and application URLs outside git.
- Escrow seller/listing/order reconciliation and full refund settlement still require a real integration test before handling real funds.
