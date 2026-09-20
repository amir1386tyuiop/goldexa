import { MigrationInterface, QueryRunner } from 'typeorm'

export class OrderCancellationIntegrity1782864000000 implements MigrationInterface {
  name = 'OrderCancellationIntegrity1782864000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "group_buying_id" UUID')
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_orders_group_buying_id" ON "orders" ("group_buying_id")')
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_orders_group_buying_id"')
    await queryRunner.query('ALTER TABLE "orders" DROP COLUMN IF EXISTS "group_buying_id"')
  }
}
