CREATE TYPE "public"."category" AS ENUM('sale', 'rent_long', 'rent_short');--> statement-breakpoint
CREATE TYPE "public"."channel" AS ENUM('email', 'webhook');--> statement-breakpoint
CREATE TYPE "public"."ref_type" AS ENUM('listing', 'job');--> statement-breakpoint
CREATE TYPE "public"."score_status" AS ENUM('pending', 'scored', 'failed');--> statement-breakpoint
CREATE TYPE "public"."watch_type" AS ENUM('listing', 'job');--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text NOT NULL,
	"url" text NOT NULL,
	"title" text NOT NULL,
	"company" text,
	"location" text,
	"salary_min" numeric(10, 2),
	"salary_max" numeric(10, 2),
	"currency" text DEFAULT 'PLN',
	"employment_type" text,
	"tech_stack" text[],
	"remote" boolean,
	"description" text,
	"ai_score" integer,
	"score_status" "score_status" DEFAULT 'pending' NOT NULL,
	"scored_at" timestamp with time zone,
	"embedding" vector(768),
	"content_hash" text NOT NULL,
	"scraped_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" "category" NOT NULL,
	"source" text NOT NULL,
	"url" text NOT NULL,
	"title" text NOT NULL,
	"price" numeric(12, 2),
	"currency" text DEFAULT 'PLN',
	"area_m2" numeric(8, 2),
	"rooms" integer,
	"location" text,
	"lat" numeric(10, 7),
	"lng" numeric(10, 7),
	"description" text,
	"images" text[],
	"ai_score" integer,
	"score_status" "score_status" DEFAULT 'pending' NOT NULL,
	"scored_at" timestamp with time zone,
	"embedding" vector(768),
	"content_hash" text NOT NULL,
	"scraped_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"watch_id" uuid NOT NULL,
	"ref_id" uuid NOT NULL,
	"ref_type" "ref_type" NOT NULL,
	"channel" "channel" NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "score_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ref_id" uuid NOT NULL,
	"ref_type" "ref_type" NOT NULL,
	"criteria_hash" text NOT NULL,
	"model" text NOT NULL,
	"score" integer NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ref_id" uuid NOT NULL,
	"ref_type" "ref_type" NOT NULL,
	"diff" jsonb NOT NULL,
	"snapped_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "watches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "watch_type" NOT NULL,
	"filters" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"criteria" text,
	"criteria_embedding" vector(768),
	"min_score" integer DEFAULT 70 NOT NULL,
	"notify_email" text,
	"notify_webhook" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notification_log" ADD CONSTRAINT "notification_log_watch_id_watches_id_fk" FOREIGN KEY ("watch_id") REFERENCES "public"."watches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "jobs_url_idx" ON "jobs" USING btree ("url");--> statement-breakpoint
CREATE INDEX "jobs_source_idx" ON "jobs" USING btree ("source");--> statement-breakpoint
CREATE INDEX "jobs_ai_score_idx" ON "jobs" USING btree ("ai_score");--> statement-breakpoint
CREATE INDEX "jobs_score_status_idx" ON "jobs" USING btree ("score_status");--> statement-breakpoint
CREATE INDEX "jobs_location_idx" ON "jobs" USING btree ("location");--> statement-breakpoint
CREATE INDEX "jobs_scraped_at_idx" ON "jobs" USING btree ("scraped_at");--> statement-breakpoint
CREATE UNIQUE INDEX "listings_url_idx" ON "listings" USING btree ("url");--> statement-breakpoint
CREATE INDEX "listings_category_scraped_idx" ON "listings" USING btree ("category","scraped_at");--> statement-breakpoint
CREATE INDEX "listings_source_idx" ON "listings" USING btree ("source");--> statement-breakpoint
CREATE INDEX "listings_ai_score_idx" ON "listings" USING btree ("ai_score");--> statement-breakpoint
CREATE INDEX "listings_score_status_idx" ON "listings" USING btree ("score_status");--> statement-breakpoint
CREATE INDEX "listings_location_idx" ON "listings" USING btree ("location");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_log_unique_watch_ref_idx" ON "notification_log" USING btree ("watch_id","ref_id");--> statement-breakpoint
CREATE INDEX "notification_log_sent_at_idx" ON "notification_log" USING btree ("sent_at");--> statement-breakpoint
CREATE UNIQUE INDEX "score_cache_unique_idx" ON "score_cache" USING btree ("ref_id","ref_type","criteria_hash");--> statement-breakpoint
CREATE INDEX "snapshots_ref_idx" ON "snapshots" USING btree ("ref_id","ref_type");--> statement-breakpoint
CREATE INDEX "snapshots_snapped_at_idx" ON "snapshots" USING btree ("snapped_at");