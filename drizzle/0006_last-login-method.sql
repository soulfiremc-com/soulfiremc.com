ALTER TABLE "two_factor" ADD COLUMN "failed_verification_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "two_factor" ADD COLUMN "locked_until" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "last_login_method" text;