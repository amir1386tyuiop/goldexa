import { MigrationInterface, QueryRunner } from 'typeorm'

export class CommunityRewardsWallet1782864000000 implements MigrationInterface {
  name = 'CommunityRewardsWallet1782864000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "wallet_transactions" ADD COLUMN IF NOT EXISTS "reward_id" UUID`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_wallet_transactions_reward" ON "wallet_transactions" ("reward_id")`)
    await queryRunner.query(`DO $$ BEGIN ALTER TYPE "wallet_transactions_type_enum" ADD VALUE IF NOT EXISTS 'community_reward'; EXCEPTION WHEN undefined_object THEN NULL; END $$`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_wallet_transactions_reward"`)
    await queryRunner.query(`ALTER TABLE "wallet_transactions" DROP COLUMN IF EXISTS "reward_id"`)
  }
}
