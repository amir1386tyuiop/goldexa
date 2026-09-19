import { MigrationInterface, QueryRunner } from 'typeorm'

export class EscrowDisputeFields1782863200000 implements MigrationInterface {
  name = 'EscrowDisputeFields1782863200000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "escrow_payments" ADD COLUMN IF NOT EXISTS "dispute_reason" TEXT`)
    await queryRunner.query(`ALTER TABLE "escrow_payments" ADD COLUMN IF NOT EXISTS "disputed_by" UUID`)
    await queryRunner.query(`ALTER TABLE "escrow_payments" ADD COLUMN IF NOT EXISTS "disputed_at" TIMESTAMP`)
    await queryRunner.query(`ALTER TABLE "escrow_payments" ADD COLUMN IF NOT EXISTS "resolution_note" TEXT`)
    await queryRunner.query(`ALTER TABLE "escrow_payments" ADD COLUMN IF NOT EXISTS "resolved_at" TIMESTAMP`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "escrow_payments" DROP COLUMN IF EXISTS "resolved_at"`)
    await queryRunner.query(`ALTER TABLE "escrow_payments" DROP COLUMN IF EXISTS "resolution_note"`)
    await queryRunner.query(`ALTER TABLE "escrow_payments" DROP COLUMN IF EXISTS "disputed_at"`)
    await queryRunner.query(`ALTER TABLE "escrow_payments" DROP COLUMN IF EXISTS "disputed_by"`)
    await queryRunner.query(`ALTER TABLE "escrow_payments" DROP COLUMN IF EXISTS "dispute_reason"`)
  }
}
