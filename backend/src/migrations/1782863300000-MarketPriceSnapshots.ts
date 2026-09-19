import { MigrationInterface, QueryRunner } from 'typeorm'

export class MarketPriceSnapshots1782863300000 implements MigrationInterface {
  name = 'MarketPriceSnapshots1782863300000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "used_gold_listings" ADD COLUMN IF NOT EXISTS "gold18_price_snapshot" NUMERIC(15,2)`)
    await queryRunner.query(`ALTER TABLE "used_gold_listings" ADD COLUMN IF NOT EXISTS "intrinsic_gold_value" NUMERIC(15,2)`)
    await queryRunner.query(`ALTER TABLE "used_gold_listings" ADD COLUMN IF NOT EXISTS "price_snapshot_at" TIMESTAMP`)
    await queryRunner.query(`ALTER TABLE "auctions" ADD COLUMN IF NOT EXISTS "gold18_price_snapshot" NUMERIC(15,2)`)
    await queryRunner.query(`ALTER TABLE "auctions" ADD COLUMN IF NOT EXISTS "intrinsic_gold_value" NUMERIC(15,2)`)
    await queryRunner.query(`ALTER TABLE "auctions" ADD COLUMN IF NOT EXISTS "price_snapshot_at" TIMESTAMP`)
    await queryRunner.query(`ALTER TABLE "escrow_payments" ADD COLUMN IF NOT EXISTS "idempotency_key" VARCHAR(100)`)
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_escrow_payments_idempotency_key" ON "escrow_payments" ("idempotency_key") WHERE "idempotency_key" IS NOT NULL`)
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_marketplace_ratings_trade_reviewer" ON "marketplace_ratings" ("reviewer_id", "reviewee_id", COALESCE("listing_id", '00000000-0000-0000-0000-000000000000'::uuid), COALESCE("order_id", '00000000-0000-0000-0000-000000000000'::uuid))`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "auctions" DROP COLUMN IF EXISTS "price_snapshot_at"`)
    await queryRunner.query(`ALTER TABLE "auctions" DROP COLUMN IF EXISTS "intrinsic_gold_value"`)
    await queryRunner.query(`ALTER TABLE "auctions" DROP COLUMN IF EXISTS "gold18_price_snapshot"`)
    await queryRunner.query(`ALTER TABLE "used_gold_listings" DROP COLUMN IF EXISTS "price_snapshot_at"`)
    await queryRunner.query(`ALTER TABLE "used_gold_listings" DROP COLUMN IF EXISTS "intrinsic_gold_value"`)
    await queryRunner.query(`ALTER TABLE "used_gold_listings" DROP COLUMN IF EXISTS "gold18_price_snapshot"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_escrow_payments_idempotency_key"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_marketplace_ratings_trade_reviewer"`)
    await queryRunner.query(`ALTER TABLE "escrow_payments" DROP COLUMN IF EXISTS "idempotency_key"`)
  }
}
