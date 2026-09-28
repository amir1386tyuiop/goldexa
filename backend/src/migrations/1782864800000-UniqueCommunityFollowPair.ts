import { MigrationInterface, QueryRunner } from 'typeorm'

/** Prevent duplicate relationships when follow requests race. */
export class UniqueCommunityFollowPair1782864800000 implements MigrationInterface {
  name = 'UniqueCommunityFollowPair1782864800000'

  async up(queryRunner: QueryRunner): Promise<void> {
    // Keep the oldest row for an identical relationship before creating the
    // constraint. No user-visible relationship is lost by this deduplication.
    await queryRunner.query(`
      DELETE FROM "user_follows" duplicate
      USING "user_follows" keeper
      WHERE duplicate."follower_id" = keeper."follower_id"
        AND duplicate."following_id" = keeper."following_id"
        AND duplicate."id" > keeper."id"
    `)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_user_follows_pair_unique"
      ON "user_follows" ("follower_id", "following_id")
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_follows_pair_unique"`)
  }
}
