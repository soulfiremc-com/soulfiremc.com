DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM "account"
		WHERE "provider_id" NOT IN ('credential', 'discord', 'github', 'google')
	) THEN
		RAISE EXCEPTION 'Cannot backfill account issuer: unsupported provider type found';
	END IF;
END $$;
--> statement-breakpoint
UPDATE "account"
SET
	"issuer" = CASE "provider_id"
		WHEN 'credential' THEN 'local:credential'
		WHEN 'discord' THEN 'local:oauth:discord'
		WHEN 'github' THEN 'local:oauth:github'
		WHEN 'google' THEN 'https://accounts.google.com'
	END,
	"account_id" = CASE
		WHEN "provider_id" = 'credential' THEN "user_id"::text
		ELSE "account_id"
	END;
--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM "account" WHERE "issuer" IS NULL) THEN
		RAISE EXCEPTION 'Cannot enforce account issuer: null issuer remains after backfill';
	END IF;

	IF EXISTS (
		SELECT 1
		FROM "account"
		GROUP BY "issuer", "account_id"
		HAVING count(*) > 1
	) THEN
		RAISE EXCEPTION 'Cannot enforce account identity: duplicate issuer and account_id found';
	END IF;
END $$;
