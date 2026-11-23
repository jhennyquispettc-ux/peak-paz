import { MigrationInterface, QueryRunner } from 'typeorm';

export class DocumentReviews1796200000000 implements MigrationInterface {
  name = 'DocumentReviews1796200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "agency_document_type" ADD VALUE IF NOT EXISTS 'COMMERCE_REGISTRATION'`,
    );
    await queryRunner.query(
      `ALTER TYPE "agency_document_type" ADD VALUE IF NOT EXISTS 'MUNICIPAL_LICENSE'`,
    );
    await queryRunner.query(
      `ALTER TABLE "agencies" ALTER COLUMN "operator_license" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "agencies" ALTER COLUMN "association" DROP NOT NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "document_reviews" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "subject_type" character varying(10) NOT NULL,
        "subject_id" uuid NOT NULL,
        "status" character varying(10) NOT NULL DEFAULT 'PENDING',
        "recommendation" character varying(20),
        "requested" jsonb NOT NULL,
        "findings" jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT clock_timestamp(),
        "completed_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_document_reviews" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_document_reviews_subject" CHECK ("subject_type" IN ('GUIDE', 'AGENCY')),
        CONSTRAINT "CHK_document_reviews_status" CHECK ("status" IN ('PENDING', 'COMPLETED', 'FAILED'))
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_document_reviews_subject" ON "document_reviews" ("subject_type", "subject_id", "created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "document_reviews"`);
    await queryRunner.query(
      `UPDATE "agencies" SET "operator_license" = COALESCE("operator_license", ''), "association" = COALESCE("association", '')`,
    );
    await queryRunner.query(
      `ALTER TABLE "agencies" ALTER COLUMN "association" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "agencies" ALTER COLUMN "operator_license" SET NOT NULL`,
    );
  }
}
