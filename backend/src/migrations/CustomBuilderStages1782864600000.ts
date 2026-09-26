import { MigrationInterface, QueryRunner } from 'typeorm'

export class CustomBuilderStages1782864600000 implements MigrationInterface {
  name = 'CustomBuilderStages1782864600000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "jewelry_design_stages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "design_id" uuid NOT NULL, "title" character varying(160) NOT NULL, "status" character varying(30) NOT NULL DEFAULT 'planned', "note" text, "image_url" character varying, "model_url" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_jewelry_design_stages_id" PRIMARY KEY ("id"), CONSTRAINT "FK_jewelry_design_stages_design" FOREIGN KEY ("design_id") REFERENCES "jewelry_designs"("id") ON DELETE CASCADE)`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_jewelry_design_stages_design_id" ON "jewelry_design_stages" ("design_id")`)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_jewelry_design_stages_design_id"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "jewelry_design_stages"`)
  }
}
