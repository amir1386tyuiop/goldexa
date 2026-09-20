import { MigrationInterface, QueryRunner } from 'typeorm'

export class AuctionInventoryReservation1782864100000 implements MigrationInterface {
  name = 'AuctionInventoryReservation1782864100000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "auctions" ADD COLUMN IF NOT EXISTS "inventory_reserved" BOOLEAN NOT NULL DEFAULT false')
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "auctions" DROP COLUMN IF EXISTS "inventory_reserved"')
  }
}
