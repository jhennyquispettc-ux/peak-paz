import { MigrationInterface, QueryRunner } from 'typeorm';

export class GuideAvailabilityModes1794573301843 implements MigrationInterface {
  name = 'GuideAvailabilityModes1794573301843';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO "settings" ("key", "value", "description") VALUES ('SCHEDULE_BUFFER_MIN', '120', 'Minutos libres que el guía necesita antes y después de cada compromiso') ON CONFLICT ("key") DO NOTHING`,
    );
    await queryRunner.query(`DROP TABLE "guide_blocked_dates"`);
    await queryRunner.query(
      `CREATE TABLE "guide_available_dates" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "guide_profile_id" uuid NOT NULL, "date" date NOT NULL, "time_from" TIME NOT NULL, "time_to" TIME NOT NULL, CONSTRAINT "CHK_guide_available_dates_time_range" CHECK ("time_from" < "time_to"), CONSTRAINT "PK_6d807b6bcd5322af0dafcfecb7c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_guide_available_dates_guide_date" ON "guide_available_dates"  ("guide_profile_id", "date") `,
    );
    await queryRunner.query(
      `CREATE TABLE "guide_commitments" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "guide_profile_id" uuid NOT NULL, "title" character varying(120) NOT NULL, "starts_at" TIMESTAMP WITH TIME ZONE NOT NULL, "ends_at" TIMESTAMP WITH TIME ZONE NOT NULL, "notes" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_guide_commitments_range" CHECK ("starts_at" < "ends_at"), CONSTRAINT "PK_2e25353c460fd243ac5e4ee0ee1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_guide_commitments_guide_starts" ON "guide_commitments"  ("guide_profile_id", "starts_at") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."guide_availability_mode" AS ENUM('WEEKLY', 'BY_DATE')`,
    );
    await queryRunner.query(
      `ALTER TABLE "guide_profiles" ADD "availability_mode" "public"."guide_availability_mode" NOT NULL DEFAULT 'WEEKLY'`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD "ends_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "guide_available_dates" ADD CONSTRAINT "FK_061ea7a7474f5251ffa39941ba7" FOREIGN KEY ("guide_profile_id") REFERENCES "guide_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "guide_commitments" ADD CONSTRAINT "FK_aedf4614ee184623f8d73ca3abf" FOREIGN KEY ("guide_profile_id") REFERENCES "guide_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "settings" WHERE "key" = 'SCHEDULE_BUFFER_MIN'`,
    );
    await queryRunner.query(
      `ALTER TABLE "guide_commitments" DROP CONSTRAINT "FK_aedf4614ee184623f8d73ca3abf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "guide_available_dates" DROP CONSTRAINT "FK_061ea7a7474f5251ffa39941ba7"`,
    );
    await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN "ends_at"`);
    await queryRunner.query(
      `ALTER TABLE "guide_profiles" DROP COLUMN "availability_mode"`,
    );
    await queryRunner.query(`DROP TYPE "public"."guide_availability_mode"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_guide_commitments_guide_starts"`,
    );
    await queryRunner.query(`DROP TABLE "guide_commitments"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_guide_available_dates_guide_date"`,
    );
    await queryRunner.query(`DROP TABLE "guide_available_dates"`);
    await queryRunner.query(
      `CREATE TABLE "guide_blocked_dates" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "guide_profile_id" uuid NOT NULL, "date_from" date NOT NULL, "date_to" date NOT NULL, "reason" character varying(200), CONSTRAINT "CHK_guide_blocked_dates_range" CHECK ("date_from" <= "date_to"), CONSTRAINT "PK_7b0cfa4c57bbc8a06f35a8627a1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "guide_blocked_dates" ADD CONSTRAINT "FK_2946fb74bf7baa6a064d131e02e" FOREIGN KEY ("guide_profile_id") REFERENCES "guide_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
