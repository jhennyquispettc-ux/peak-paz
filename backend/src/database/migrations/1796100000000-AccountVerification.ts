import { MigrationInterface, QueryRunner } from 'typeorm';

export class AccountVerification1796100000000 implements MigrationInterface {
  name = 'AccountVerification1796100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "email_verifications" (
        "user_id" uuid NOT NULL,
        "email" character varying(160) NOT NULL,
        "token_hash" character varying(64),
        "token_nonce" character varying(64),
        "token_expires_at" TIMESTAMP WITH TIME ZONE,
        "next_resend_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "email_sent_at" TIMESTAMP WITH TIME ZONE,
        "email_failed_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_email_verifications" PRIMARY KEY ("user_id"),
        CONSTRAINT "UQ_email_verifications_token" UNIQUE ("token_hash"),
        CONSTRAINT "FK_email_verifications_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )`,
    );
    await queryRunner.query(
      `CREATE TABLE "credential_reviews" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "fingerprint" character varying(64) NOT NULL,
        "snapshot" jsonb NOT NULL,
        "status" character varying(10) NOT NULL DEFAULT 'PENDING',
        "reason" character varying(500),
        "reviewer_id" uuid,
        "decided_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT clock_timestamp(),
        CONSTRAINT "PK_credential_reviews" PRIMARY KEY ("id"),
        CONSTRAINT "FK_credential_reviews_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_credential_reviews_reviewer" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_credential_reviews_user" ON "credential_reviews" ("user_id", "created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "credential_reviews"`);
    await queryRunner.query(`DROP TABLE "email_verifications"`);
  }
}
