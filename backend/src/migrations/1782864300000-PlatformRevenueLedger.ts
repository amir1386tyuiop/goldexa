import { MigrationInterface, QueryRunner } from 'typeorm'

export class PlatformRevenueLedger1782864300000 implements MigrationInterface {
  name = 'PlatformRevenueLedger1782864300000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "platform_revenue" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "source_type" character varying(50) NOT NULL, "source_id" uuid NOT NULL, "amount" numeric(15,2) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_platform_revenue_id" PRIMARY KEY ("id"))`)
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "idx_platform_revenue_source_unique" ON "platform_revenue" ("source_type", "source_id")`)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_platform_revenue_source_unique"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "platform_revenue"`)
  }
}
