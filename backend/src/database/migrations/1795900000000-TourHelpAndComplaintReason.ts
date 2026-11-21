import { MigrationInterface, QueryRunner } from 'typeorm';

export class TourHelpAndComplaintReason1795900000000 implements MigrationInterface {
  name = 'TourHelpAndComplaintReason1795900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "complaint_reason" AS ENUM ('GENERAL', 'NO_SHOW')`,
    );
    await queryRunner.query(
      `ALTER TABLE "complaints" ADD "reason" "complaint_reason" NOT NULL DEFAULT 'GENERAL'`,
    );
    await queryRunner.query(
      `CREATE TYPE "tour_help_status" AS ENUM ('OPEN', 'ATTENDED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "tour_help_requests" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "booking_id" uuid NOT NULL,
        "description" text NOT NULL,
        "status" "tour_help_status" NOT NULL DEFAULT 'OPEN',
        "admin_note" text,
        "attended_by" uuid,
        "attended_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tour_help_requests" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tour_help_booking" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_tour_help_admin" FOREIGN KEY ("attended_by") REFERENCES "users"("id") ON DELETE SET NULL
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tour_help_status" ON "tour_help_requests" ("status", "created_at")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_tour_help_open" ON "tour_help_requests" ("booking_id") WHERE "status" = 'OPEN'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "tour_help_requests"`);
    await queryRunner.query(`DROP TYPE "tour_help_status"`);
    await queryRunner.query(`ALTER TABLE "complaints" DROP COLUMN "reason"`);
    await queryRunner.query(`DROP TYPE "complaint_reason"`);
  }
}
