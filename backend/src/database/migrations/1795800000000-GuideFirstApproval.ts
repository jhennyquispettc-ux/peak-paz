import { MigrationInterface, QueryRunner } from 'typeorm';

export class GuideFirstApproval1795800000000 implements MigrationInterface {
  name = 'GuideFirstApproval1795800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "guide_profiles" ADD "first_approved_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `UPDATE "guide_profiles" SET "first_approved_at" = COALESCE("verified_at", now()) WHERE "verification_status" = 'APPROVED'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "guide_profiles" DROP COLUMN "first_approved_at"`,
    );
  }
}
