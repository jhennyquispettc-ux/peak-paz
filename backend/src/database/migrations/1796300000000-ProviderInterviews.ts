import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProviderInterviews1796300000000 implements MigrationInterface {
  name = 'ProviderInterviews1796300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "guide_profiles" ADD "credential_type" character varying(10)`,
    );
    await queryRunner.query(
      `ALTER TABLE "guide_profiles" ADD CONSTRAINT "CHK_guide_profiles_credential_type" CHECK ("credential_type" IS NULL OR "credential_type" IN ('SIRETUR', 'FEBOGUIT'))`,
    );
    await queryRunner.query(
      `CREATE TABLE "provider_interviews" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "subject_type" character varying(10) NOT NULL,
        "subject_id" uuid NOT NULL,
        "scheduled_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "modality" character varying(10) NOT NULL,
        "location" character varying(300) NOT NULL,
        "status" character varying(10) NOT NULL DEFAULT 'SCHEDULED',
        "notes" text,
        "premises_visited" boolean,
        "scheduled_by" uuid,
        "recorded_by" uuid,
        "recorded_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT clock_timestamp(),
        CONSTRAINT "PK_provider_interviews" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_provider_interviews_subject" CHECK ("subject_type" IN ('GUIDE', 'AGENCY')),
        CONSTRAINT "CHK_provider_interviews_modality" CHECK ("modality" IN ('IN_PERSON', 'VIRTUAL')),
        CONSTRAINT "CHK_provider_interviews_status" CHECK ("status" IN ('SCHEDULED', 'PASSED', 'FAILED', 'CANCELLED')),
        CONSTRAINT "FK_provider_interviews_scheduled_by" FOREIGN KEY ("scheduled_by") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_provider_interviews_recorded_by" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE SET NULL
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_provider_interviews_subject" ON "provider_interviews" ("subject_type", "subject_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_provider_interviews_open" ON "provider_interviews" ("subject_type", "subject_id") WHERE "status" = 'SCHEDULED'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "provider_interviews"`);
    await queryRunner.query(
      `ALTER TABLE "guide_profiles" DROP CONSTRAINT "CHK_guide_profiles_credential_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "guide_profiles" DROP COLUMN "credential_type"`,
    );
  }
}
