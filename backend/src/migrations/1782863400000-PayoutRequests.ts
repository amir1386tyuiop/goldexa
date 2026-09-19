import { MigrationInterface, QueryRunner } from 'typeorm'

export class PayoutRequests1782863400000 implements MigrationInterface {
  name = 'PayoutRequests1782863400000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "wallet_transactions" ADD COLUMN IF NOT EXISTS "payout_request_id" UUID`)
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "payout_requests" (
      "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
      "user_id" UUID NOT NULL,
      "bank_account_id" UUID NOT NULL,
      "amount" NUMERIC(15,2) NOT NULL,
      "status" VARCHAR(30) NOT NULL DEFAULT 'pending',
      "idempotency_key" VARCHAR(100) NOT NULL,
      "provider_reference" VARCHAR(255),
      "failure_reason" VARCHAR(255),
      "reviewed_by" UUID,
      "reviewed_at" TIMESTAMP,
      "paid_at" TIMESTAMP,
      "created_at" TIMESTAMP NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_payout_requests_id" PRIMARY KEY ("id")
    )`)
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_payout_requests_idempotency_key" ON "payout_requests" ("idempotency_key")`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_payout_requests_user_id" ON "payout_requests" ("user_id", "created_at" DESC)`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_payout_requests_user_id"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_payout_requests_idempotency_key"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "payout_requests"`)
    await queryRunner.query(`ALTER TABLE "wallet_transactions" DROP COLUMN IF EXISTS "payout_request_id"`)
  }
}
