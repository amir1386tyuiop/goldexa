import { MigrationInterface, QueryRunner } from 'typeorm'

export class GroupBuyingWalletLedger1782863700000 implements MigrationInterface {
  name = 'GroupBuyingWalletLedger1782863700000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "wallet_transactions" ADD COLUMN IF NOT EXISTS "group_buying_member_id" UUID`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_wallet_transactions_group_buying_member" ON "wallet_transactions" ("group_buying_member_id")`)
    await queryRunner.query(`DO $$ BEGIN ALTER TYPE "wallet_transactions_type_enum" ADD VALUE IF NOT EXISTS 'group_buying_payment'; EXCEPTION WHEN undefined_object THEN NULL; END $$`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_wallet_transactions_group_buying_member"`)
    await queryRunner.query(`ALTER TABLE "wallet_transactions" DROP COLUMN IF EXISTS "group_buying_member_id"`)
  }
}
