import { MigrationInterface, QueryRunner } from 'typeorm'

export class EscrowOwnership1782863500000 implements MigrationInterface {
  name = 'EscrowOwnership1782863500000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "smart_vault_assets" ADD COLUMN IF NOT EXISTS "source_escrow_id" UUID`)
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_smart_vault_assets_source_escrow" ON "smart_vault_assets" ("source_escrow_id") WHERE "source_escrow_id" IS NOT NULL`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_smart_vault_assets_source_escrow"`)
    await queryRunner.query(`ALTER TABLE "smart_vault_assets" DROP COLUMN IF EXISTS "source_escrow_id"`)
  }
}
