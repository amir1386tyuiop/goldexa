# Changelog

## Runtime and E2E hardening

- Fixed the isolated E2E migration image path (`dist/src/data-source.js`) and exported `EscrowService` so the production-shaped Nest container starts successfully.
- Catalog responses now calculate `finalPrice` from the live 18k price used by checkout, preventing a displayed-price/order-price mismatch.
- Added validation metadata to group-buying DTOs and aligned E2E auth clients with the real rate-limit boundary.
- Aligned PostgreSQL `TEXT[]` image columns with TypeORM entities for products, marketplace listings, and Smart Vault assets.
- Completed escrow shipping lifecycle: `held → shipped → released`, with tracking persistence, shipment order status, and disputes during shipping.
- Verified the isolated real-PostgreSQL/Redis E2E stack: 4 suites and 15 tests passed.

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
- Real PostgreSQL/Redis E2E: passed with 2 suites and 11 tests in the isolated Docker stack.

## Important release notes

- Do not run `database/seed.sql` against production.
- Set `POSTGRES_PASSWORD`, `JWT_SECRET`, RabbitMQ credentials, and application URLs outside git.
- Refund bounds now include pending refunds, preventing cumulative over-refunds.
- The production backend image and TypeORM migration path now target the actual Nest build output (`dist/src`).

## Backend/frontend contract hardening

- Checkout now creates server-validated pricing quotes before creating an order and starts the online payment request for non-wallet checkout.
- Quote IDs are validated from Redis/memory cache and their totals must match the authoritative order total, including shipping where applicable.
- Cart reservations, product pricing, wallet holds, escrow transitions, and refunds use transactional/pessimistic locking paths to prevent races and forged client totals.
- Payment transaction and order-tracking reads are JWT-scoped; notification, smart-vault, custom-builder, subscription, audit, and public user-registration routes no longer trust arbitrary user IDs or roles from request bodies/paths.
- Legacy cart price/name fields remain accepted for client compatibility but are ignored by the backend.
- Reinstalled dependencies from clean lockfiles and verified zero vulnerabilities with npm audit for runtime and full dependency trees.
## Security hardening

- Added Helmet to the NestJS bootstrap while preserving Goldexa's explicit CSP and production HSTS policy.
- Security regression suite remains green: 2 suites, 22 tests.
- AI workspace now reads user-owned predictions and recommendations through `/me` endpoints; admin-only matches, metrics, and model reruns are no longer requested by regular users.
- Smart Vault alerts can now be reset safely by their owner, and the dashboard chart loads snapshots for every asset instead of only the first asset.
- Saved community designs are now protected by JWT ownership checks; security regression coverage is 23 tests.
