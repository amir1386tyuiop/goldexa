import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Baseline migration for the MVP backend.
 *
 * The original schema lives in `database/schema.sql`. This migration records
 * the schema additions made while hardening the MVP (financial ledger, payment
 * idempotency, user blocking, price history) in an idempotent way, so it is
 * safe to run on both the existing database and a freshly-created one. It also
 * establishes the `migrations` table so all future schema changes are applied
 * through version-controlled migrations instead of ad-hoc SQL — which is what
 * previously caused entity/DB drift and runtime bugs.
 */
export class BaselineMvpSchema1782863100000 implements MigrationInterface {
  name = 'BaselineMvpSchema1782863100000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Wallet ledger: signed gold leg so balances reconcile against the ledger.
    await queryRunner.query(
      `ALTER TABLE "wallet_transactions" ADD COLUMN IF NOT EXISTS "amount_grams" DECIMAL(15,4) DEFAULT 0`,
    )

    // One wallet per user.
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wallets_user_id_key') THEN
          ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_key" UNIQUE ("user_id");
        END IF;
      END $$;
    `)

    // Payment idempotency (no double charge on retried callbacks).
    await queryRunner.query(
      `ALTER TABLE "payment_transactions" ADD COLUMN IF NOT EXISTS "idempotency_key" VARCHAR(80)`,
    )
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "idx_payment_idempotency" ON "payment_transactions" ("idempotency_key") WHERE "idempotency_key" IS NOT NULL`,
    )

    // User blocking.
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_blocked" BOOLEAN DEFAULT false`)

    // Append-only price history.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "price_history" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "type" VARCHAR(20) NOT NULL,
        "value" DECIMAL(15,2) NOT NULL,
        "change" DECIMAL(10,2) DEFAULT 0,
        "change_percent" DECIMAL(5,2) DEFAULT 0,
        "source" VARCHAR(40) DEFAULT 'system',
        "recorded_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_price_history_type_time" ON "price_history" ("type", "recorded_at" DESC)`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_price_history_type_time"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "price_history"`)
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "is_blocked"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_payment_idempotency"`)
    await queryRunner.query(`ALTER TABLE "payment_transactions" DROP COLUMN IF EXISTS "idempotency_key"`)
    await queryRunner.query(`ALTER TABLE "wallets" DROP CONSTRAINT IF EXISTS "wallets_user_id_key"`)
    await queryRunner.query(`ALTER TABLE "wallet_transactions" DROP COLUMN IF EXISTS "amount_grams"`)
  }
}
