import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Keep the catalog identity stable across the schema fixtures and development seed.
 * Both are intentionally present in local development, so the database must be the
 * final guard against duplicate product records.
 */
export class ProductIdentityUniqueness1782864400000 implements MigrationInterface {
  name = 'ProductIdentityUniqueness1782864400000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      DECLARE
        duplicate_row RECORD;
        keep_id uuid;
      BEGIN
        FOR duplicate_row IN
          SELECT id, name, category, weight, karat
          FROM products p
          WHERE p.id NOT IN (
            SELECT DISTINCT ON (name, category, weight, karat) id
            FROM products
            ORDER BY name, category, weight, karat, created_at ASC, id ASC
          )
          ORDER BY name, category, weight, karat, created_at ASC, id ASC
        LOOP
          SELECT p.id INTO keep_id
          FROM products p
          WHERE p.name = duplicate_row.name
            AND p.category = duplicate_row.category
            AND p.weight = duplicate_row.weight
            AND p.karat = duplicate_row.karat
          ORDER BY p.created_at ASC, p.id ASC
          LIMIT 1;

          UPDATE auctions SET product_id = keep_id WHERE product_id = duplicate_row.id;
          UPDATE used_gold_listings SET product_id = keep_id WHERE product_id = duplicate_row.id;
          UPDATE smart_vault_assets SET product_id = keep_id WHERE product_id = duplicate_row.id;
          UPDATE group_buying_items SET product_id = keep_id WHERE product_id = duplicate_row.id;
          UPDATE product_media SET product_id = keep_id WHERE product_id = duplicate_row.id;
          UPDATE product_stones SET product_id = keep_id WHERE product_id = duplicate_row.id;
          UPDATE inventories SET product_id = keep_id WHERE product_id = duplicate_row.id;
          UPDATE cart_items SET product_id = keep_id WHERE product_id = duplicate_row.id;
          UPDATE ar_models SET product_id = keep_id WHERE product_id = duplicate_row.id;

          DELETE FROM products WHERE id = duplicate_row.id;
        END LOOP;
      END $$;
    `)

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_products_identity_unique"
      ON "products" ("name", "category", "weight", "karat")
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "idx_products_identity_unique"')
  }
}
