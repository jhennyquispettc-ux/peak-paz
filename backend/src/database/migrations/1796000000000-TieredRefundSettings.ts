import { MigrationInterface, QueryRunner } from 'typeorm';

export class TieredRefundSettings1796000000000 implements MigrationInterface {
  name = 'TieredRefundSettings1796000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO "settings" ("key", "value", "description") VALUES
        ('REFUND_PARTIAL_MIN_DAYS', '3', 'Días mínimos de anticipación para tener reembolso parcial'),
        ('REFUND_PARTIAL_PERCENT', '50', 'Porcentaje del reembolso parcial')
        ON CONFLICT ("key") DO NOTHING`,
    );
    await queryRunner.query(
      `UPDATE "settings" SET "description" = 'Días mínimos de anticipación para tener reembolso del 100%' WHERE "key" = 'REFUND_MIN_DAYS'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "settings" WHERE "key" IN ('REFUND_PARTIAL_MIN_DAYS', 'REFUND_PARTIAL_PERCENT')`,
    );
    await queryRunner.query(
      `UPDATE "settings" SET "description" = 'Días mínimos de anticipación para tener reembolso' WHERE "key" = 'REFUND_MIN_DAYS'`,
    );
  }
}
