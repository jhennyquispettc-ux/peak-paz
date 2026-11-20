import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProviderSanctions1795100000000 implements MigrationInterface {
  name = 'ProviderSanctions1795100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."cancellation_review_status" AS ENUM('PENDING', 'RESOLVED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."cancellation_decision" AS ENUM('NO_SANCTION', 'STRIKE', 'STRIKE_AND_FINE')`,
    );
    await queryRunner.query(
      `CREATE TABLE "cancellation_reviews" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "booking_id" uuid NOT NULL, "evidence_url" character varying(500), "evidence_public_id" character varying(200), "status" "public"."cancellation_review_status" NOT NULL DEFAULT 'PENDING', "decision" "public"."cancellation_decision", "fine_amount" numeric(10,2) NOT NULL DEFAULT '0', "fine_settled" numeric(10,2) NOT NULL DEFAULT '0', "resolution" text, "resolved_by" uuid, "resolved_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_cancellation_reviews_booking" UNIQUE ("booking_id"), CONSTRAINT "CHK_cancellation_reviews_evidence" CHECK (("evidence_url" IS NULL) = ("evidence_public_id" IS NULL)), CONSTRAINT "CHK_cancellation_reviews_fine" CHECK ("fine_amount" >= 0 AND "fine_settled" >= 0 AND "fine_settled" <= "fine_amount"), CONSTRAINT "CHK_cancellation_reviews_resolved" CHECK (("status" = 'RESOLVED') = ("decision" IS NOT NULL AND "resolved_at" IS NOT NULL)), CONSTRAINT "CHK_cancellation_reviews_fine_decision" CHECK ("fine_amount" = 0 OR "decision" = 'STRIKE_AND_FINE'), CONSTRAINT "PK_cancellation_reviews" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cancellation_reviews_status" ON "cancellation_reviews" ("status", "created_at")`,
    );
    await queryRunner.query(
      `ALTER TABLE "cancellation_reviews" ADD CONSTRAINT "FK_cancellation_reviews_booking" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cancellation_reviews" ADD CONSTRAINT "FK_cancellation_reviews_resolved_by" FOREIGN KEY ("resolved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "guide_profiles" ADD "hidden_until" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `INSERT INTO "settings" ("key", "value", "description") VALUES ('MAX_FINE_PERCENT', '20', 'Multa máxima por cancelación del guía, en porcentaje de la reserva'), ('STRIKES_TO_HIDE', '2', 'Strikes activos con los que el guía queda oculto'), ('STRIKES_TO_SUSPEND', '3', 'Strikes activos con los que el guía queda suspendido de forma permanente') ON CONFLICT ("key") DO NOTHING`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "settings" WHERE "key" IN ('MAX_FINE_PERCENT', 'STRIKES_TO_HIDE', 'STRIKES_TO_SUSPEND')`,
    );
    await queryRunner.query(
      `ALTER TABLE "guide_profiles" DROP COLUMN "hidden_until"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cancellation_reviews" DROP CONSTRAINT "FK_cancellation_reviews_resolved_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cancellation_reviews" DROP CONSTRAINT "FK_cancellation_reviews_booking"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_cancellation_reviews_status"`,
    );
    await queryRunner.query(`DROP TABLE "cancellation_reviews"`);
    await queryRunner.query(`DROP TYPE "public"."cancellation_decision"`);
    await queryRunner.query(`DROP TYPE "public"."cancellation_review_status"`);
  }
}
