import type { MigrationInterface, QueryRunner } from 'typeorm';

export class EmailVerification1795200100000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query('ALTER TABLE users ADD email_verified_at timestamptz');
    // Administrative seed accounts and agencies retain their existing access.
    // Existing tourists and guides must verify; no identity is silently approved.
    await q.query(
      "UPDATE users SET email_verified_at = now() WHERE role IN ('ADMIN', 'AGENCY')",
    );
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query('ALTER TABLE users DROP COLUMN email_verified_at');
  }
}
