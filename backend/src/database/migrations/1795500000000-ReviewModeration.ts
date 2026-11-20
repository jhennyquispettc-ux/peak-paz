import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReviewModeration1795500000000 implements MigrationInterface {
  name = 'ReviewModeration1795500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD "hidden_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(`ALTER TABLE "reviews" ADD "hidden_by" uuid`);
    await queryRunner.query(`ALTER TABLE "reviews" ADD "hidden_reason" text`);
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD CONSTRAINT "CHK_reviews_hidden" CHECK (("hidden_at" IS NULL) = ("hidden_reason" IS NULL))`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD CONSTRAINT "FK_reviews_hidden_by" FOREIGN KEY ("hidden_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_reviews_created" ON "reviews" ("created_at")`,
    );
    await queryRunner.query(
      `INSERT INTO "settings" ("key", "value", "description") VALUES ('REVIEW_WINDOW_DAYS', '30', 'Días después del tour en que el turista puede dejar su reseña') ON CONFLICT ("key") DO NOTHING`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "settings" WHERE "key" = 'REVIEW_WINDOW_DAYS'`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_reviews_created"`);
    await queryRunner.query(
      `ALTER TABLE "reviews" DROP CONSTRAINT "FK_reviews_hidden_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" DROP CONSTRAINT "CHK_reviews_hidden"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" DROP COLUMN "hidden_reason"`,
    );
    await queryRunner.query(`ALTER TABLE "reviews" DROP COLUMN "hidden_by"`);
    await queryRunner.query(`ALTER TABLE "reviews" DROP COLUMN "hidden_at"`);
  }
}
