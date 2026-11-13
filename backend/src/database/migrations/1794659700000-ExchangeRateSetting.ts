import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExchangeRateSetting1794659700000 implements MigrationInterface {
  name = 'ExchangeRateSetting1794659700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO "settings" ("key", "value", "description") VALUES ('BOB_PER_USD', '6.96', 'Bolivianos por dólar para cobrar en USD por PayPal') ON CONFLICT ("key") DO NOTHING`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "settings" WHERE "key" = 'BOB_PER_USD'`,
    );
  }
}
