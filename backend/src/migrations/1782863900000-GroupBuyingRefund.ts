import { MigrationInterface, QueryRunner } from 'typeorm'

export class GroupBuyingRefund1782863900000 implements MigrationInterface {
  name = 'GroupBuyingRefund1782863900000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DO $$ BEGIN ALTER TYPE "wallet_transactions_type_enum" ADD VALUE IF NOT EXISTS 'group_buying_refund'; EXCEPTION WHEN undefined_object THEN NULL; END $$`)
  }

  public async down(): Promise<void> {
    // PostgreSQL enum values cannot be removed safely without rebuilding the type.
  }
}
