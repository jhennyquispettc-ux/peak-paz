import { MigrationInterface, QueryRunner } from 'typeorm';

export class AgencySanctions1795300000000 implements MigrationInterface {
  name = 'AgencySanctions1795300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cancellation_reviews" ALTER COLUMN "booking_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "cancellation_reviews" ADD "group_departure_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "cancellation_reviews" ADD "reason" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "cancellation_reviews" ADD "fine_base_amount" numeric(10,2) NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `UPDATE "cancellation_reviews" review SET "fine_base_amount" = booking."total_amount" FROM "bookings" booking WHERE booking."id" = review."booking_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cancellation_reviews" ADD CONSTRAINT "UQ_cancellation_reviews_departure" UNIQUE ("group_departure_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "cancellation_reviews" ADD CONSTRAINT "CHK_cancellation_reviews_subject" CHECK (num_nonnulls("booking_id", "group_departure_id") = 1)`,
    );
    await queryRunner.query(
      `ALTER TABLE "cancellation_reviews" ADD CONSTRAINT "CHK_cancellation_reviews_fine_base" CHECK ("fine_base_amount" >= 0)`,
    );
    await queryRunner.query(
      `ALTER TABLE "cancellation_reviews" ADD CONSTRAINT "FK_cancellation_reviews_departure" FOREIGN KEY ("group_departure_id") REFERENCES "group_departures"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "strikes" ALTER COLUMN "booking_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "strikes" ADD "group_departure_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "strikes" ADD CONSTRAINT "CHK_strikes_subject" CHECK (num_nonnulls("booking_id", "group_departure_id") = 1)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_strikes_departure" ON "strikes" ("group_departure_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "strikes" ADD CONSTRAINT "FK_strikes_departure" FOREIGN KEY ("group_departure_id") REFERENCES "group_departures"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "agencies" ADD "hidden_until" TIMESTAMP WITH TIME ZONE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "agencies" DROP COLUMN "hidden_until"`,
    );
    await queryRunner.query(
      `ALTER TABLE "strikes" DROP CONSTRAINT "FK_strikes_departure"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_strikes_departure"`);
    await queryRunner.query(
      `ALTER TABLE "strikes" DROP CONSTRAINT "CHK_strikes_subject"`,
    );
    await queryRunner.query(`DELETE FROM "strikes" WHERE "booking_id" IS NULL`);
    await queryRunner.query(
      `ALTER TABLE "strikes" DROP COLUMN "group_departure_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "strikes" ALTER COLUMN "booking_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "cancellation_reviews" DROP CONSTRAINT "FK_cancellation_reviews_departure"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cancellation_reviews" DROP CONSTRAINT "CHK_cancellation_reviews_fine_base"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cancellation_reviews" DROP CONSTRAINT "CHK_cancellation_reviews_subject"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cancellation_reviews" DROP CONSTRAINT "UQ_cancellation_reviews_departure"`,
    );
    await queryRunner.query(
      `DELETE FROM "cancellation_reviews" WHERE "booking_id" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "cancellation_reviews" DROP COLUMN "fine_base_amount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cancellation_reviews" DROP COLUMN "reason"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cancellation_reviews" DROP COLUMN "group_departure_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cancellation_reviews" ALTER COLUMN "booking_id" SET NOT NULL`,
    );
  }
}
