import { MigrationInterface, QueryRunner } from 'typeorm';

export class GroupRefundReason1794666000000 implements MigrationInterface {
  name = 'GroupRefundReason1794666000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."refund_reason" ADD VALUE IF NOT EXISTS 'MINIMUM_NOT_REACHED'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."refund_reason" RENAME TO "refund_reason_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."refund_reason" AS ENUM('TOURIST_CANCELLATION', 'PROVIDER_CANCELLATION', 'WEATHER', 'RESCHEDULE_REJECTED', 'COMPLAINT')`,
    );
    await queryRunner.query(
      `ALTER TABLE "refunds" ALTER COLUMN "reason" TYPE "public"."refund_reason" USING "reason"::text::"public"."refund_reason"`,
    );
    await queryRunner.query(`DROP TYPE "public"."refund_reason_old"`);
  }
}
