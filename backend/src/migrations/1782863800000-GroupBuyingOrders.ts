import { MigrationInterface, QueryRunner } from 'typeorm'

export class GroupBuyingOrders1782863800000 implements MigrationInterface {
  name = 'GroupBuyingOrders1782863800000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "group_buying_groups" ADD COLUMN IF NOT EXISTS "order_id" UUID')
    await queryRunner.query('CREATE UNIQUE INDEX IF NOT EXISTS "IDX_group_buying_groups_order_id" ON "group_buying_groups" ("order_id") WHERE "order_id" IS NOT NULL')
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_group_buying_groups_order_id"')
    await queryRunner.query('ALTER TABLE "group_buying_groups" DROP COLUMN IF EXISTS "order_id"')
  }
}
