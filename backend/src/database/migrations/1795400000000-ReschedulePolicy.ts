import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReschedulePolicy1795400000000 implements MigrationInterface {
  name = 'ReschedulePolicy1795400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."reschedule_response" ADD VALUE IF NOT EXISTS 'EXPIRED'`,
    );
    await queryRunner.query(
      `ALTER TABLE "reschedules" ADD "respond_by" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `UPDATE "reschedules" SET "respond_by" = "created_at" WHERE "respond_by" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "reschedules" ALTER COLUMN "respond_by" SET NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_reschedules_pending" ON "reschedules" ("booking_id") WHERE "response" = 'PENDING'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_reschedules_respond_by" ON "reschedules" ("respond_by")`,
    );
    await queryRunner.query(
      `INSERT INTO "settings" ("key", "value", "description") VALUES ('RESCHEDULE_DEADLINE_HOURS', '24', 'Horas antes del inicio en que vence la respuesta a un cambio de fecha') ON CONFLICT ("key") DO NOTHING`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "settings" WHERE "key" = 'RESCHEDULE_DEADLINE_HOURS'`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_reschedules_respond_by"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_reschedules_pending"`);
    await queryRunner.query(
      `ALTER TABLE "reschedules" DROP COLUMN "respond_by"`,
    );
    await queryRunner.query(
      `UPDATE "reschedules" SET "response" = 'REJECTED' WHERE "response" = 'EXPIRED'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."reschedule_response" RENAME TO "reschedule_response_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."reschedule_response" AS ENUM('PENDING', 'ACCEPTED', 'REJECTED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "reschedules" ALTER COLUMN "response" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "reschedules" ALTER COLUMN "response" TYPE "public"."reschedule_response" USING "response"::text::"public"."reschedule_response"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reschedules" ALTER COLUMN "response" SET DEFAULT 'PENDING'`,
    );
    await queryRunner.query(`DROP TYPE "public"."reschedule_response_old"`);
  }
}
