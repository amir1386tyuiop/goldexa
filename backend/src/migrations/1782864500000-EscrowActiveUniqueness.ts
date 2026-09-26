import { MigrationInterface, QueryRunner } from 'typeorm'

export class EscrowActiveUniqueness1782864500000 implements MigrationInterface {
  name = 'EscrowActiveUniqueness1782864500000'

  async up(queryRunner: QueryRunner): Promise<void> {
    // Initiated escrow has not reserved funds yet. Keep the oldest request and
    // remove only later duplicates before adding the database invariant.
    await queryRunner.query(`
      DELETE FROM "escrow_payments" duplicate
      USING (
        SELECT id,
          ROW_NUMBER() OVER (PARTITION BY listing_id, buyer_id ORDER BY created_at ASC, id ASC) AS row_number
        FROM "escrow_payments"
        WHERE status = 'initiated' AND listing_id IS NOT NULL
      ) ranked
      WHERE duplicate.id = ranked.id AND ranked.row_number > 1
    `)
    await queryRunner.query(`
      DELETE FROM "escrow_payments" duplicate
      USING (
        SELECT id,
          ROW_NUMBER() OVER (PARTITION BY auction_id, buyer_id ORDER BY created_at ASC, id ASC) AS row_number
        FROM "escrow_payments"
        WHERE status = 'initiated' AND auction_id IS NOT NULL
      ) ranked
      WHERE duplicate.id = ranked.id AND ranked.row_number > 1
    `)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_escrow_active_listing_buyer_unique"
      ON "escrow_payments" ("listing_id", "buyer_id")
      WHERE "listing_id" IS NOT NULL AND "status" = 'initiated'
    `)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_escrow_active_auction_buyer_unique"
      ON "escrow_payments" ("auction_id", "buyer_id")
      WHERE "auction_id" IS NOT NULL AND "status" = 'initiated'
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "idx_escrow_active_auction_buyer_unique"')
    await queryRunner.query('DROP INDEX IF EXISTS "idx_escrow_active_listing_buyer_unique"')
  }
}
