import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1794306300283 implements MigrationInterface {
  name = 'InitialSchema1794306300283';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."language" AS ENUM('es', 'en')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."user_role" AS ENUM('TOURIST', 'GUIDE', 'AGENCY', 'ADMIN')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."user_status" AS ENUM('ACTIVE', 'SUSPENDED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "email" character varying(160) NOT NULL, "password_hash" character varying(255) NOT NULL, "first_name" character varying(80) NOT NULL, "last_name" character varying(80) NOT NULL, "phone" character varying(20), "country" character(2), "language" "public"."language" NOT NULL DEFAULT 'es', "role" "public"."user_role" NOT NULL DEFAULT 'TOURIST', "status" "public"."user_status" NOT NULL DEFAULT 'ACTIVE', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."agency_verification_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "agencies" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "legal_name" character varying(160) NOT NULL, "tax_id" character varying(20) NOT NULL, "operator_license" character varying(40) NOT NULL, "association" character varying(120) NOT NULL, "address" character varying(200) NOT NULL, "description_es" text, "description_en" text, "verification_status" "public"."agency_verification_status" NOT NULL DEFAULT 'PENDING', "rejection_reason" text, "verified_by" uuid, "verified_at" TIMESTAMP WITH TIME ZONE, "rating_average" numeric(2,1) NOT NULL DEFAULT '0', "reviews_count" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_383a88dcb60099ab871914ce034" UNIQUE ("tax_id"), CONSTRAINT "REL_cc83bd7f85841212760a1d87f2" UNIQUE ("user_id"), CONSTRAINT "PK_8ab1f1f53f56c8255b0d7e68b28" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."agency_document_type" AS ENUM('TAX_ID', 'OPERATOR_LICENSE', 'ASSOCIATION_CERTIFICATE', 'REPRESENTATIVE_ID')`,
    );
    await queryRunner.query(
      `CREATE TABLE "agency_documents" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "url" character varying(500) NOT NULL, "public_id" character varying(200) NOT NULL, "expires_at" date, "uploaded_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "agency_id" uuid NOT NULL, "type" "public"."agency_document_type" NOT NULL, CONSTRAINT "PK_9d8047ade6670132cf20c4e993f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."gear_category" AS ENUM('FOOD', 'WATER', 'CLOTHING', 'EQUIPMENT', 'FIRST_AID')`,
    );
    await queryRunner.query(
      `CREATE TABLE "gear_recommendations" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "route_id" uuid NOT NULL, "category" "public"."gear_category" NOT NULL, "description_es" character varying(200) NOT NULL, "description_en" character varying(200) NOT NULL, "estimated_weight_g" integer, "is_required" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_2e4b44d8c1598032c12c21338a2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."point_of_interest_type" AS ENUM('START', 'END', 'CAMPSITE', 'SHELTER', 'WATER', 'VIEWPOINT', 'DANGER', 'RUINS', 'TRANSPORT')`,
    );
    await queryRunner.query(`CREATE TABLE "points_of_interest" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "route_id" uuid NOT NULL, "type" "public"."point_of_interest_type" NOT NULL, "name_es" character varying(120) NOT NULL, "name_en" character varying(120) NOT NULL, "description_es" text, "description_en" text, "latitude" numeric(9,6) NOT NULL, "longitude" numeric(9,6) NOT NULL, "altitude_m" integer, "is_itinerary_stop" boolean NOT NULL DEFAULT false, "stage_order" smallint, "day_number" smallint, "minutes_from_previous" integer, "is_overnight" boolean NOT NULL DEFAULT false, CONSTRAINT "CHK_points_of_interest_minutes" CHECK ("minutes_from_previous" IS NULL OR "minutes_from_previous" >= 0), CONSTRAINT "CHK_points_of_interest_itinerary_stop" CHECK (("is_itinerary_stop" AND "stage_order" IS NOT NULL AND "day_number" IS NOT NULL AND "minutes_from_previous" IS NOT NULL)
   OR (NOT "is_itinerary_stop" AND "stage_order" IS NULL AND "day_number" IS NULL AND "minutes_from_previous" IS NULL)), CONSTRAINT "PK_b7286f625bfdbf54c83d726f4ff" PRIMARY KEY ("id"))`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_points_of_interest_route_stage_order" ON "points_of_interest"  ("route_id", "stage_order") WHERE "stage_order" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "route_photos" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "route_id" uuid NOT NULL, "url" character varying(500) NOT NULL, "public_id" character varying(200) NOT NULL, "credit" character varying(120), "sort_order" smallint NOT NULL DEFAULT '0', CONSTRAINT "PK_30a7bbe967292f906118054a6ef" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."species_kind" AS ENUM('FLORA', 'FAUNA')`,
    );
    await queryRunner.query(
      `CREATE TABLE "species" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "common_name_es" character varying(120) NOT NULL, "common_name_en" character varying(120) NOT NULL, "scientific_name" character varying(160), "kind" "public"."species_kind" NOT NULL, "photo_url" character varying(500), CONSTRAINT "PK_ae6a87f2423ba6c25dc43c32770" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."difficulty" AS ENUM('EASY', 'MODERATE', 'HARD')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."autonomy_level" AS ENUM('SELF_GUIDED', 'GUIDE_RECOMMENDED', 'GUIDE_REQUIRED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "routes" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "slug" character varying(120) NOT NULL, "name_es" character varying(120) NOT NULL, "name_en" character varying(120) NOT NULL, "description_es" text NOT NULL, "description_en" text NOT NULL, "difficulty" "public"."difficulty" NOT NULL, "autonomy_level" "public"."autonomy_level" NOT NULL, "days" smallint NOT NULL, "distance_km" numeric(5,1) NOT NULL, "elevation_gain_m" integer NOT NULL, "elevation_loss_m" integer NOT NULL, "max_altitude_m" integer NOT NULL, "start_time_from" TIME NOT NULL, "start_time_to" TIME NOT NULL, "how_to_get_there_es" text NOT NULL, "how_to_get_there_en" text NOT NULL, "best_season_es" text, "best_season_en" text, "emergency_contacts" text NOT NULL, "start_latitude" numeric(9,6) NOT NULL, "start_longitude" numeric(9,6) NOT NULL, "track" jsonb, "private_price" numeric(10,2) NOT NULL, "private_max_people" smallint NOT NULL DEFAULT '5', "group_min_price" numeric(10,2) NOT NULL, "group_max_people" smallint NOT NULL, "is_published" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_6f526fff54d3871572b3a6031d6" UNIQUE ("slug"), CONSTRAINT "CHK_routes_prices" CHECK ("private_price" > 0 AND "group_min_price" > 0), CONSTRAINT "CHK_routes_group_max_people" CHECK ("group_max_people" >= 1), CONSTRAINT "CHK_routes_private_max_people" CHECK ("private_max_people" >= 1), CONSTRAINT "CHK_routes_start_window" CHECK ("start_time_from" < "start_time_to"), CONSTRAINT "CHK_routes_distance" CHECK ("distance_km" > 0), CONSTRAINT "CHK_routes_days" CHECK ("days" >= 1), CONSTRAINT "PK_76100511cdfa1d013c859f01d8b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."group_departure_status" AS ENUM('PUBLISHED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED_MIN_NOT_REACHED', 'CANCELLED_BY_AGENCY', 'CANCELLED_WEATHER')`,
    );
    await queryRunner.query(
      `CREATE TABLE "group_departures" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "agency_id" uuid NOT NULL, "route_id" uuid NOT NULL, "departure_date" date NOT NULL, "meeting_time" TIME NOT NULL, "meeting_point" character varying(200) NOT NULL, "price_per_person" numeric(10,2) NOT NULL, "min_people" smallint NOT NULL DEFAULT '3', "max_people" smallint NOT NULL, "guide_name" character varying(120) NOT NULL, "status" "public"."group_departure_status" NOT NULL DEFAULT 'PUBLISHED', "closes_at" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_group_departures_price" CHECK ("price_per_person" > 0), CONSTRAINT "CHK_group_departures_people" CHECK ("min_people" >= 1 AND "min_people" <= "max_people"), CONSTRAINT "PK_cb63620206fda961032aff12c19" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_group_departures_route_date" ON "group_departures"  ("route_id", "departure_date") `,
    );
    await queryRunner.query(
      `CREATE TABLE "guide_availabilities" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "guide_profile_id" uuid NOT NULL, "weekday" smallint NOT NULL, "time_from" TIME NOT NULL, "time_to" TIME NOT NULL, CONSTRAINT "CHK_guide_availabilities_time_range" CHECK ("time_from" < "time_to"), CONSTRAINT "CHK_guide_availabilities_weekday" CHECK ("weekday" BETWEEN 0 AND 6), CONSTRAINT "PK_d77a786599995010e33969c9022" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "guide_blocked_dates" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "guide_profile_id" uuid NOT NULL, "date_from" date NOT NULL, "date_to" date NOT NULL, "reason" character varying(200), CONSTRAINT "CHK_guide_blocked_dates_range" CHECK ("date_from" <= "date_to"), CONSTRAINT "PK_7b0cfa4c57bbc8a06f35a8627a1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."guide_document_type" AS ENUM('NATIONAL_ID', 'GUIDE_CREDENTIAL', 'FIRST_AID')`,
    );
    await queryRunner.query(
      `CREATE TABLE "guide_documents" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "url" character varying(500) NOT NULL, "public_id" character varying(200) NOT NULL, "expires_at" date, "uploaded_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "guide_profile_id" uuid NOT NULL, "type" "public"."guide_document_type" NOT NULL, CONSTRAINT "PK_731ba37a0a8b2cd18b6c0895685" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."guide_route_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "guide_routes" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "guide_profile_id" uuid NOT NULL, "route_id" uuid NOT NULL, "status" "public"."guide_route_status" NOT NULL DEFAULT 'PENDING', "reviewed_by" uuid, "reviewed_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_guide_routes_guide_route" UNIQUE ("guide_profile_id", "route_id"), CONSTRAINT "PK_40fc317dba4117472a993a72b6b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."guide_verification_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "guide_profiles" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "national_id" character varying(20) NOT NULL, "bio_es" text, "bio_en" text, "languages" text array NOT NULL DEFAULT '{}', "years_experience" smallint NOT NULL DEFAULT '0', "verification_status" "public"."guide_verification_status" NOT NULL DEFAULT 'PENDING', "rejection_reason" text, "verified_by" uuid, "verified_at" TIMESTAMP WITH TIME ZONE, "rating_average" numeric(2,1) NOT NULL DEFAULT '0', "reviews_count" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "REL_26bca9bc178f83eca250d60887" UNIQUE ("user_id"), CONSTRAINT "CHK_guide_profiles_years_experience" CHECK ("years_experience" >= 0), CONSTRAINT "PK_07a297ea8ea5a90cf7bbbe9b412" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."booking_type" AS ENUM('PRIVATE', 'GROUP')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."booking_source" AS ENUM('WEB', 'MANUAL')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."booking_status" AS ENUM('REQUESTED', 'ACCEPTED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'EXPIRED', 'CANCELLED_BY_TOURIST', 'CANCELLED_BY_PROVIDER', 'CANCELLED_WEATHER')`,
    );
    await queryRunner.query(`CREATE TABLE "bookings" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "code" character varying(12) NOT NULL, "type" "public"."booking_type" NOT NULL, "source" "public"."booking_source" NOT NULL DEFAULT 'WEB', "tourist_id" uuid, "guide_profile_id" uuid, "group_departure_id" uuid, "route_id" uuid, "tour_date" date, "start_time" TIME, "people_count" smallint NOT NULL, "manual_contact" character varying(200), "total_amount" numeric(10,2) NOT NULL, "status" "public"."booking_status" NOT NULL DEFAULT 'REQUESTED', "respond_by" TIMESTAMP WITH TIME ZONE, "pay_by" TIMESTAMP WITH TIME ZONE, "accepted_at" TIMESTAMP WITH TIME ZONE, "confirmed_at" TIMESTAMP WITH TIME ZONE, "cancelled_at" TIMESTAMP WITH TIME ZONE, "cancellation_reason" text, "terms_version" character varying(20), "terms_accepted_at" TIMESTAMP WITH TIME ZONE, "terms_accepted_ip" character varying(45), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_9add00bfd42ae2bbe830bab9aa2" UNIQUE ("code"), CONSTRAINT "CHK_bookings_total_amount" CHECK ("total_amount" >= 0), CONSTRAINT "CHK_bookings_people_count" CHECK ("people_count" >= 1), CONSTRAINT "CHK_bookings_source" CHECK (("source" = 'WEB' AND "tourist_id" IS NOT NULL)
   OR ("source" = 'MANUAL' AND "tourist_id" IS NULL AND "manual_contact" IS NOT NULL)), CONSTRAINT "CHK_bookings_group" CHECK ("type" <> 'GROUP' OR (
     "group_departure_id" IS NOT NULL AND "guide_profile_id" IS NULL
     AND "route_id" IS NULL AND "tour_date" IS NULL AND "start_time" IS NULL
   )), CONSTRAINT "CHK_bookings_private" CHECK ("type" <> 'PRIVATE' OR (
     "guide_profile_id" IS NOT NULL AND "route_id" IS NOT NULL
     AND "tour_date" IS NOT NULL AND "start_time" IS NOT NULL
     AND "group_departure_id" IS NULL AND "source" = 'WEB'
   )), CONSTRAINT "PK_bee6805982cc1e248e94ce94957" PRIMARY KEY ("id"))`);
    await queryRunner.query(
      `CREATE INDEX "IDX_bookings_tourist" ON "bookings"  ("tourist_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bookings_group_departure" ON "bookings"  ("group_departure_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bookings_guide_date" ON "bookings"  ("guide_profile_id", "tour_date") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."reschedule_response" AS ENUM('PENDING', 'ACCEPTED', 'REJECTED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "reschedules" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "booking_id" uuid NOT NULL, "previous_date" date NOT NULL, "new_date" date NOT NULL, "reason" character varying(200) NOT NULL, "response" "public"."reschedule_response" NOT NULL DEFAULT 'PENDING', "responded_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_reschedules_dates" CHECK ("previous_date" <> "new_date"), CONSTRAINT "PK_7a029e6737a31ca7428e1e8ad42" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."payment_status" AS ENUM('PENDING', 'AUTHORIZED', 'CAPTURED', 'VOIDED', 'REFUNDED', 'FAILED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "payments" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "booking_id" uuid NOT NULL, "provider" character varying(30) NOT NULL DEFAULT 'PAYPAL', "external_order_id" character varying(100), "external_authorization_id" character varying(100), "external_capture_id" character varying(100), "amount_bob" numeric(10,2) NOT NULL, "charge_currency" character(3) NOT NULL DEFAULT 'USD', "exchange_rate" numeric(10,4), "charged_amount" numeric(10,2), "provider_fee" numeric(10,2), "status" "public"."payment_status" NOT NULL DEFAULT 'PENDING', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_payments_amount_bob" CHECK ("amount_bob" > 0), CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notification_status" AS ENUM('PENDING', 'SENT', 'FAILED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "notifications" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "type" character varying(60) NOT NULL, "subject" character varying(200) NOT NULL, "status" "public"."notification_status" NOT NULL DEFAULT 'PENDING', "sent_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."payout_status" AS ENUM('PENDING', 'PAID')`,
    );
    await queryRunner.query(
      `CREATE TABLE "payouts" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "booking_id" uuid NOT NULL, "gross_amount" numeric(10,2) NOT NULL, "commission_rate" numeric(5,2) NOT NULL, "commission_amount" numeric(10,2) NOT NULL, "penalty_deduction" numeric(10,2) NOT NULL DEFAULT '0', "net_amount" numeric(10,2) NOT NULL, "status" "public"."payout_status" NOT NULL DEFAULT 'PENDING', "paid_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "REL_56631fedc454f0ccd943132b35" UNIQUE ("booking_id"), CONSTRAINT "PK_76855dc4f0a6c18c72eea302e87" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."refund_reason" AS ENUM('TOURIST_CANCELLATION', 'PROVIDER_CANCELLATION', 'WEATHER', 'RESCHEDULE_REJECTED', 'COMPLAINT')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."refund_status" AS ENUM('PENDING', 'COMPLETED', 'FAILED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "refunds" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "payment_id" uuid NOT NULL, "amount" numeric(10,2) NOT NULL, "reason" "public"."refund_reason" NOT NULL, "external_refund_id" character varying(100), "status" "public"."refund_status" NOT NULL DEFAULT 'PENDING', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_refunds_amount" CHECK ("amount" > 0), CONSTRAINT "PK_5106efb01eeda7e49a78b869738" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "reviews" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "booking_id" uuid NOT NULL, "rating" smallint NOT NULL, "comment" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "REL_bbd6ac6e3e6a8f8c6e0e8692d6" UNIQUE ("booking_id"), CONSTRAINT "CHK_reviews_rating" CHECK ("rating" BETWEEN 1 AND 5), CONSTRAINT "PK_231ae565c273ee700b283f15c1d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "settings" ("key" character varying(60) NOT NULL, "value" character varying(200) NOT NULL, "description" character varying(255) NOT NULL, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_c8639b7626fa94ba8265628f214" PRIMARY KEY ("key"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."complaint_status" AS ENUM('OPEN', 'ACCEPTED', 'REJECTED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "complaints" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "booking_id" uuid NOT NULL, "description" text NOT NULL, "status" "public"."complaint_status" NOT NULL DEFAULT 'OPEN', "resolved_by" uuid, "resolution" text, "resolved_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_4b7566a2a489c2cc7c12ed076ad" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_complaints_booking" ON "complaints"  ("booking_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."strike_reason" AS ENUM('CANCELLED_WITHOUT_WEATHER', 'NO_SHOW', 'COMPLAINT')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."strike_status" AS ENUM('ACTIVE', 'REVERTED', 'EXPIRED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "strikes" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "booking_id" uuid NOT NULL, "reason" "public"."strike_reason" NOT NULL, "status" "public"."strike_status" NOT NULL DEFAULT 'ACTIVE', "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "assigned_by" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_99327114d7cadcfd184ea78095a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_strikes_booking" ON "strikes"  ("booking_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "route_species" ("route_id" uuid NOT NULL, "species_id" uuid NOT NULL, CONSTRAINT "PK_d8160753a54f3876b351d28f82d" PRIMARY KEY ("route_id", "species_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4839fe1d634abd1067619a5807" ON "route_species"  ("route_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ab25f6d85573a2cb31b85fd99c" ON "route_species"  ("species_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "agencies" ADD CONSTRAINT "FK_cc83bd7f85841212760a1d87f27" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "agencies" ADD CONSTRAINT "FK_1aa157500e730fcd85b17ad9e17" FOREIGN KEY ("verified_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "agency_documents" ADD CONSTRAINT "FK_26e1c281f2e2c443f210b686754" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "gear_recommendations" ADD CONSTRAINT "FK_cb49a8197327ed348b6695320cb" FOREIGN KEY ("route_id") REFERENCES "routes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "points_of_interest" ADD CONSTRAINT "FK_445f159939b59e060f17d319a29" FOREIGN KEY ("route_id") REFERENCES "routes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "route_photos" ADD CONSTRAINT "FK_4916c264848a07df3926af538fa" FOREIGN KEY ("route_id") REFERENCES "routes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "group_departures" ADD CONSTRAINT "FK_cd31f89760cbad2f944d97c56ff" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "group_departures" ADD CONSTRAINT "FK_2c6e73d9d3babd4d0cc15d3339f" FOREIGN KEY ("route_id") REFERENCES "routes"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "guide_availabilities" ADD CONSTRAINT "FK_4b9d4f2f4aabbf3f5ef98b08ec2" FOREIGN KEY ("guide_profile_id") REFERENCES "guide_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "guide_blocked_dates" ADD CONSTRAINT "FK_2946fb74bf7baa6a064d131e02e" FOREIGN KEY ("guide_profile_id") REFERENCES "guide_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "guide_documents" ADD CONSTRAINT "FK_9c9454eb3b00e5fc2685c762e72" FOREIGN KEY ("guide_profile_id") REFERENCES "guide_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "guide_routes" ADD CONSTRAINT "FK_5a006bed64403cdd28c44ad0a3d" FOREIGN KEY ("guide_profile_id") REFERENCES "guide_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "guide_routes" ADD CONSTRAINT "FK_0e03a65472bc8194a9e16544040" FOREIGN KEY ("route_id") REFERENCES "routes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "guide_routes" ADD CONSTRAINT "FK_1fb9737228a3ff2e0441686063e" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "guide_profiles" ADD CONSTRAINT "FK_26bca9bc178f83eca250d60887f" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "guide_profiles" ADD CONSTRAINT "FK_6c11f54908a388fb48f594621e2" FOREIGN KEY ("verified_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD CONSTRAINT "FK_cd13efafd638ca6e0b9ce2d3aec" FOREIGN KEY ("tourist_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD CONSTRAINT "FK_a4f01dbbf55fc4babe3da468d25" FOREIGN KEY ("guide_profile_id") REFERENCES "guide_profiles"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD CONSTRAINT "FK_962d8d3c5c4d26ea6fb5c09f7d1" FOREIGN KEY ("group_departure_id") REFERENCES "group_departures"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD CONSTRAINT "FK_e92e06072b1e3bde5ec25be8784" FOREIGN KEY ("route_id") REFERENCES "routes"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reschedules" ADD CONSTRAINT "FK_3a72ff8b88149f775bb029c8532" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD CONSTRAINT "FK_e86edf76dc2424f123b9023a2b2" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_9a8a82462cab47c73d25f49261f" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payouts" ADD CONSTRAINT "FK_56631fedc454f0ccd943132b357" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "refunds" ADD CONSTRAINT "FK_7f48aa5d56c42aeb495db016683" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD CONSTRAINT "FK_bbd6ac6e3e6a8f8c6e0e8692d63" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "complaints" ADD CONSTRAINT "FK_a56fb6611928c35f52a13bd4751" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "complaints" ADD CONSTRAINT "FK_def5ac72e7422d0e09a8cd6ce7d" FOREIGN KEY ("resolved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "strikes" ADD CONSTRAINT "FK_812f135103b36f314cd33c2a608" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "strikes" ADD CONSTRAINT "FK_91ec2312104646e8dcf5cf35972" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "route_species" ADD CONSTRAINT "FK_4839fe1d634abd1067619a5807b" FOREIGN KEY ("route_id") REFERENCES "routes"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "route_species" ADD CONSTRAINT "FK_ab25f6d85573a2cb31b85fd99c9" FOREIGN KEY ("species_id") REFERENCES "species"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "route_species" DROP CONSTRAINT "FK_ab25f6d85573a2cb31b85fd99c9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "route_species" DROP CONSTRAINT "FK_4839fe1d634abd1067619a5807b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "strikes" DROP CONSTRAINT "FK_91ec2312104646e8dcf5cf35972"`,
    );
    await queryRunner.query(
      `ALTER TABLE "strikes" DROP CONSTRAINT "FK_812f135103b36f314cd33c2a608"`,
    );
    await queryRunner.query(
      `ALTER TABLE "complaints" DROP CONSTRAINT "FK_def5ac72e7422d0e09a8cd6ce7d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "complaints" DROP CONSTRAINT "FK_a56fb6611928c35f52a13bd4751"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" DROP CONSTRAINT "FK_bbd6ac6e3e6a8f8c6e0e8692d63"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refunds" DROP CONSTRAINT "FK_7f48aa5d56c42aeb495db016683"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payouts" DROP CONSTRAINT "FK_56631fedc454f0ccd943132b357"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "FK_9a8a82462cab47c73d25f49261f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP CONSTRAINT "FK_e86edf76dc2424f123b9023a2b2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reschedules" DROP CONSTRAINT "FK_3a72ff8b88149f775bb029c8532"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP CONSTRAINT "FK_e92e06072b1e3bde5ec25be8784"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP CONSTRAINT "FK_962d8d3c5c4d26ea6fb5c09f7d1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP CONSTRAINT "FK_a4f01dbbf55fc4babe3da468d25"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP CONSTRAINT "FK_cd13efafd638ca6e0b9ce2d3aec"`,
    );
    await queryRunner.query(
      `ALTER TABLE "guide_profiles" DROP CONSTRAINT "FK_6c11f54908a388fb48f594621e2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "guide_profiles" DROP CONSTRAINT "FK_26bca9bc178f83eca250d60887f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "guide_routes" DROP CONSTRAINT "FK_1fb9737228a3ff2e0441686063e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "guide_routes" DROP CONSTRAINT "FK_0e03a65472bc8194a9e16544040"`,
    );
    await queryRunner.query(
      `ALTER TABLE "guide_routes" DROP CONSTRAINT "FK_5a006bed64403cdd28c44ad0a3d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "guide_documents" DROP CONSTRAINT "FK_9c9454eb3b00e5fc2685c762e72"`,
    );
    await queryRunner.query(
      `ALTER TABLE "guide_blocked_dates" DROP CONSTRAINT "FK_2946fb74bf7baa6a064d131e02e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "guide_availabilities" DROP CONSTRAINT "FK_4b9d4f2f4aabbf3f5ef98b08ec2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "group_departures" DROP CONSTRAINT "FK_2c6e73d9d3babd4d0cc15d3339f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "group_departures" DROP CONSTRAINT "FK_cd31f89760cbad2f944d97c56ff"`,
    );
    await queryRunner.query(
      `ALTER TABLE "route_photos" DROP CONSTRAINT "FK_4916c264848a07df3926af538fa"`,
    );
    await queryRunner.query(
      `ALTER TABLE "points_of_interest" DROP CONSTRAINT "FK_445f159939b59e060f17d319a29"`,
    );
    await queryRunner.query(
      `ALTER TABLE "gear_recommendations" DROP CONSTRAINT "FK_cb49a8197327ed348b6695320cb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agency_documents" DROP CONSTRAINT "FK_26e1c281f2e2c443f210b686754"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agencies" DROP CONSTRAINT "FK_1aa157500e730fcd85b17ad9e17"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agencies" DROP CONSTRAINT "FK_cc83bd7f85841212760a1d87f27"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ab25f6d85573a2cb31b85fd99c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4839fe1d634abd1067619a5807"`,
    );
    await queryRunner.query(`DROP TABLE "route_species"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_strikes_booking"`);
    await queryRunner.query(`DROP TABLE "strikes"`);
    await queryRunner.query(`DROP TYPE "public"."strike_status"`);
    await queryRunner.query(`DROP TYPE "public"."strike_reason"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_complaints_booking"`);
    await queryRunner.query(`DROP TABLE "complaints"`);
    await queryRunner.query(`DROP TYPE "public"."complaint_status"`);
    await queryRunner.query(`DROP TABLE "settings"`);
    await queryRunner.query(`DROP TABLE "reviews"`);
    await queryRunner.query(`DROP TABLE "refunds"`);
    await queryRunner.query(`DROP TYPE "public"."refund_status"`);
    await queryRunner.query(`DROP TYPE "public"."refund_reason"`);
    await queryRunner.query(`DROP TABLE "payouts"`);
    await queryRunner.query(`DROP TYPE "public"."payout_status"`);
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP TYPE "public"."notification_status"`);
    await queryRunner.query(`DROP TABLE "payments"`);
    await queryRunner.query(`DROP TYPE "public"."payment_status"`);
    await queryRunner.query(`DROP TABLE "reschedules"`);
    await queryRunner.query(`DROP TYPE "public"."reschedule_response"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_bookings_guide_date"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_bookings_group_departure"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_bookings_tourist"`);
    await queryRunner.query(`DROP TABLE "bookings"`);
    await queryRunner.query(`DROP TYPE "public"."booking_status"`);
    await queryRunner.query(`DROP TYPE "public"."booking_source"`);
    await queryRunner.query(`DROP TYPE "public"."booking_type"`);
    await queryRunner.query(`DROP TABLE "guide_profiles"`);
    await queryRunner.query(`DROP TYPE "public"."guide_verification_status"`);
    await queryRunner.query(`DROP TABLE "guide_routes"`);
    await queryRunner.query(`DROP TYPE "public"."guide_route_status"`);
    await queryRunner.query(`DROP TABLE "guide_documents"`);
    await queryRunner.query(`DROP TYPE "public"."guide_document_type"`);
    await queryRunner.query(`DROP TABLE "guide_blocked_dates"`);
    await queryRunner.query(`DROP TABLE "guide_availabilities"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_group_departures_route_date"`,
    );
    await queryRunner.query(`DROP TABLE "group_departures"`);
    await queryRunner.query(`DROP TYPE "public"."group_departure_status"`);
    await queryRunner.query(`DROP TABLE "routes"`);
    await queryRunner.query(`DROP TYPE "public"."autonomy_level"`);
    await queryRunner.query(`DROP TYPE "public"."difficulty"`);
    await queryRunner.query(`DROP TABLE "species"`);
    await queryRunner.query(`DROP TYPE "public"."species_kind"`);
    await queryRunner.query(`DROP TABLE "route_photos"`);
    await queryRunner.query(
      `DROP INDEX "public"."UQ_points_of_interest_route_stage_order"`,
    );
    await queryRunner.query(`DROP TABLE "points_of_interest"`);
    await queryRunner.query(`DROP TYPE "public"."point_of_interest_type"`);
    await queryRunner.query(`DROP TABLE "gear_recommendations"`);
    await queryRunner.query(`DROP TYPE "public"."gear_category"`);
    await queryRunner.query(`DROP TABLE "agency_documents"`);
    await queryRunner.query(`DROP TYPE "public"."agency_document_type"`);
    await queryRunner.query(`DROP TABLE "agencies"`);
    await queryRunner.query(`DROP TYPE "public"."agency_verification_status"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."user_status"`);
    await queryRunner.query(`DROP TYPE "public"."user_role"`);
    await queryRunner.query(`DROP TYPE "public"."language"`);
  }
}
