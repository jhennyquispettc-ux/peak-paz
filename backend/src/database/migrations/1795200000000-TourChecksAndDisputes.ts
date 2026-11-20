import { MigrationInterface, QueryRunner } from 'typeorm';

export class TourChecksAndDisputes1795200000000 implements MigrationInterface {
  name = 'TourChecksAndDisputes1795200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD "reconfirmed_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD "guide_started_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD "guide_start_latitude" numeric(9,6)`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD "guide_start_longitude" numeric(9,6)`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD "guide_start_distance_m" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD "tourist_started_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD CONSTRAINT "CHK_bookings_guide_start" CHECK (("guide_started_at" IS NULL AND "guide_start_latitude" IS NULL AND "guide_start_longitude" IS NULL AND "guide_start_distance_m" IS NULL) OR ("guide_started_at" IS NOT NULL AND "guide_start_latitude" BETWEEN -90 AND 90 AND "guide_start_longitude" BETWEEN -180 AND 180 AND "guide_start_distance_m" >= 0))`,
    );
    await queryRunner.query(
      `ALTER TABLE "strikes" ADD "weight" smallint NOT NULL DEFAULT '1'`,
    );
    await queryRunner.query(
      `ALTER TABLE "strikes" ADD CONSTRAINT "CHK_strikes_weight" CHECK ("weight" BETWEEN 1 AND 2)`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."dispute_reason" AS ENUM('GUIDE_NO_SHOW', 'START_MISMATCH')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."dispute_party" AS ENUM('TOURIST', 'SYSTEM')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."dispute_status" AS ENUM('OPEN', 'RESOLVED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."dispute_decision" AS ENUM('TOUR_HAPPENED', 'GUIDE_NO_SHOW')`,
    );
    await queryRunner.query(
      `CREATE TABLE "disputes" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "booking_id" uuid NOT NULL, "reason" "public"."dispute_reason" NOT NULL, "opened_by" "public"."dispute_party" NOT NULL, "description" text, "status" "public"."dispute_status" NOT NULL DEFAULT 'OPEN', "decision" "public"."dispute_decision", "resolution" text, "resolved_by" uuid, "resolved_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_disputes_booking" UNIQUE ("booking_id"), CONSTRAINT "CHK_disputes_resolved" CHECK (("status" = 'RESOLVED') = ("decision" IS NOT NULL AND "resolved_at" IS NOT NULL)), CONSTRAINT "PK_disputes" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_disputes_status" ON "disputes" ("status", "created_at")`,
    );
    await queryRunner.query(
      `ALTER TABLE "disputes" ADD CONSTRAINT "FK_disputes_booking" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "disputes" ADD CONSTRAINT "FK_disputes_resolved_by" FOREIGN KEY ("resolved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `INSERT INTO "settings" ("key", "value", "description") VALUES ('RECONFIRM_OPEN_HOURS', '72', 'Horas antes del inicio desde las que el guía puede reconfirmar'), ('RECONFIRM_DEADLINE_HOURS', '24', 'Horas antes del inicio en que vence la reconfirmación del guía'), ('START_EARLY_MIN', '60', 'Minutos antes del inicio desde los que se puede marcar el tour como iniciado'), ('NO_SHOW_TOLERANCE_MIN', '30', 'Minutos de espera antes de reportar que el guía no llegó'), ('START_CONFIRM_GRACE_HOURS', '24', 'Horas después del fin del tour que tiene el turista para confirmar el inicio') ON CONFLICT ("key") DO NOTHING`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "settings" WHERE "key" IN ('RECONFIRM_OPEN_HOURS', 'RECONFIRM_DEADLINE_HOURS', 'START_EARLY_MIN', 'NO_SHOW_TOLERANCE_MIN', 'START_CONFIRM_GRACE_HOURS')`,
    );
    await queryRunner.query(
      `ALTER TABLE "disputes" DROP CONSTRAINT "FK_disputes_resolved_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "disputes" DROP CONSTRAINT "FK_disputes_booking"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_disputes_status"`);
    await queryRunner.query(`DROP TABLE "disputes"`);
    await queryRunner.query(`DROP TYPE "public"."dispute_decision"`);
    await queryRunner.query(`DROP TYPE "public"."dispute_status"`);
    await queryRunner.query(`DROP TYPE "public"."dispute_party"`);
    await queryRunner.query(`DROP TYPE "public"."dispute_reason"`);
    await queryRunner.query(
      `ALTER TABLE "strikes" DROP CONSTRAINT "CHK_strikes_weight"`,
    );
    await queryRunner.query(`ALTER TABLE "strikes" DROP COLUMN "weight"`);
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP CONSTRAINT "CHK_bookings_guide_start"`,
    );
    for (const column of [
      'tourist_started_at',
      'guide_start_distance_m',
      'guide_start_longitude',
      'guide_start_latitude',
      'guide_started_at',
      'reconfirmed_at',
    ]) {
      await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN "${column}"`);
    }
  }
}
