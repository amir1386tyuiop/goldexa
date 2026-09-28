import { MigrationInterface, QueryRunner } from 'typeorm'

/** Cover the high-volume list and lifecycle queries used by the MVP surfaces. */
export class PerformanceIndexes1782864700000 implements MigrationInterface {
  name = 'PerformanceIndexes1782864700000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_orders_user_created_at" ON "orders" ("user_id", "created_at" DESC)')
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_wallet_transactions_user_created_at" ON "wallet_transactions" ("user_id", "created_at" DESC)')
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_used_gold_listings_status_created_at" ON "used_gold_listings" ("status", "created_at" DESC)')
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_auctions_status_ends_at" ON "auctions" ("status", "ends_at" ASC)')
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_auction_bids_auction_created_at" ON "auction_bids" ("auction_id", "created_at" DESC)')
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_design_posts_status_created_at" ON "design_posts" ("status", "created_at" DESC)')
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_design_posts_status_created_at"')
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_auction_bids_auction_created_at"')
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_auctions_status_ends_at"')
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_used_gold_listings_status_created_at"')
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_wallet_transactions_user_created_at"')
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_orders_user_created_at"')
  }
}
