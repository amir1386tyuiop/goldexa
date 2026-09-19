import { MigrationInterface, QueryRunner } from 'typeorm'

export class MarketplaceVaultAssets1782863600000 implements MigrationInterface {
  name = 'MarketplaceVaultAssets1782863600000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "used_gold_listings" ADD COLUMN IF NOT EXISTS "vault_asset_id" UUID`)
    await queryRunner.query(`ALTER TABLE "smart_vault_assets" ADD COLUMN IF NOT EXISTS "last_transfer_escrow_id" UUID`)
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_smart_vault_assets_last_transfer_escrow" ON "smart_vault_assets" ("last_transfer_escrow_id") WHERE "last_transfer_escrow_id" IS NOT NULL`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_used_gold_listings_vault_asset" ON "used_gold_listings" ("vault_asset_id")`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_used_gold_listings_vault_asset"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_smart_vault_assets_last_transfer_escrow"`)
    await queryRunner.query(`ALTER TABLE "smart_vault_assets" DROP COLUMN IF EXISTS "last_transfer_escrow_id"`)
    await queryRunner.query(`ALTER TABLE "used_gold_listings" DROP COLUMN IF EXISTS "vault_asset_id"`)
  }
}
