import { MigrationInterface, QueryRunner } from 'typeorm'

export class PaymentRefundPending1782864200000 implements MigrationInterface {
  name = 'PaymentRefundPending1782864200000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DO $$ BEGIN ALTER TYPE "payment_transactions_status_enum" ADD VALUE IF NOT EXISTS 'refund_pending'; EXCEPTION WHEN undefined_object THEN NULL; END $$`)
  }

  async down(): Promise<void> {
    // PostgreSQL enum values cannot be removed safely without recreating the type.
  }
}
