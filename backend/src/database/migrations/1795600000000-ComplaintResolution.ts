import { MigrationInterface, QueryRunner } from 'typeorm';

export class ComplaintResolution1795600000000 implements MigrationInterface {
  name = 'ComplaintResolution1795600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "complaints" ADD CONSTRAINT "UQ_complaints_booking" UNIQUE ("booking_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "complaints" ADD "refund_percent" smallint`,
    );
    await queryRunner.query(
      `ALTER TABLE "complaints" ADD "deduction_amount" numeric(10,2) NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "complaints" ADD "deduction_settled" numeric(10,2) NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "complaints" ADD CONSTRAINT "CHK_complaints_refund" CHECK ("refund_percent" IS NULL OR "refund_percent" BETWEEN 0 AND 100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "complaints" ADD CONSTRAINT "CHK_complaints_deduction" CHECK ("deduction_amount" >= 0 AND "deduction_settled" >= 0 AND "deduction_settled" <= "deduction_amount")`,
    );
    await queryRunner.query(
      `ALTER TABLE "complaints" ADD CONSTRAINT "CHK_complaints_resolved" CHECK (("status" = 'OPEN') = ("resolved_at" IS NULL))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_complaints_status" ON "complaints" ("status", "created_at")`,
    );
    await queryRunner.query(
      `INSERT INTO "settings" ("key", "value", "description") VALUES ('COMPLAINT_WINDOW_HOURS', '72', 'Horas después del fin del tour en que el turista puede reclamar') ON CONFLICT ("key") DO NOTHING`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "settings" WHERE "key" = 'COMPLAINT_WINDOW_HOURS'`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_complaints_status"`);
    for (const constraint of [
      'CHK_complaints_resolved',
      'CHK_complaints_deduction',
      'CHK_complaints_refund',
      'UQ_complaints_booking',
    ]) {
      await queryRunner.query(
        `ALTER TABLE "complaints" DROP CONSTRAINT "${constraint}"`,
      );
    }
    for (const column of [
      'deduction_settled',
      'deduction_amount',
      'refund_percent',
    ]) {
      await queryRunner.query(
        `ALTER TABLE "complaints" DROP COLUMN "${column}"`,
      );
    }
  }
}
