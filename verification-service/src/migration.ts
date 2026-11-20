import type { MigrationInterface, QueryRunner } from 'typeorm';

export class VerificationSchema1795200000000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE verification_cases (
      "userId" uuid PRIMARY KEY, email varchar(160) NOT NULL, "firstName" varchar(80) NOT NULL,
      role varchar(10) NOT NULL CHECK (role IN ('TOURIST', 'GUIDE')),
      "emailVerifiedAt" timestamptz, "tokenHash" varchar(64) UNIQUE, "tokenNonce" varchar(64),
      "tokenExpiresAt" timestamptz, "nextResendAt" timestamptz NOT NULL,
      "emailSentAt" timestamptz, "createdAt" timestamptz NOT NULL DEFAULT now())`);
    await q.query(`CREATE TABLE credential_reviews (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "userId" uuid NOT NULL,
      fingerprint varchar(64) NOT NULL, snapshot jsonb NOT NULL,
      status varchar(10) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED')),
      reason varchar(500), "reviewerId" uuid, "decidedAt" timestamptz,
      "createdAt" timestamptz NOT NULL DEFAULT now())`);
    await q.query(
      'CREATE INDEX ON credential_reviews ("userId", "createdAt" DESC)',
    );
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query('DROP TABLE credential_reviews');
    await q.query('DROP TABLE verification_cases');
  }
}
