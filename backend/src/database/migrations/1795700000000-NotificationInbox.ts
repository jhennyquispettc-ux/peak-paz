import { MigrationInterface, QueryRunner } from 'typeorm';

export class NotificationInbox1795700000000 implements MigrationInterface {
  name = 'NotificationInbox1795700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD "body" text NOT NULL DEFAULT ''`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD "link" character varying(300)`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD "read_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD "last_error" text`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_user_created" ON "notifications" ("user_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_unread" ON "notifications" ("user_id") WHERE "read_at" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD "reconfirmation_alerted_at" TIMESTAMP WITH TIME ZONE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP COLUMN "reconfirmation_alerted_at"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_notifications_unread"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_notifications_user_created"`,
    );
    for (const column of ['last_error', 'read_at', 'link', 'body']) {
      await queryRunner.query(
        `ALTER TABLE "notifications" DROP COLUMN "${column}"`,
      );
    }
  }
}
