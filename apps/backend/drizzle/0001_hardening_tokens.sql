ALTER TABLE "urls" ADD COLUMN "stats_token" varchar(64) NOT NULL DEFAULT 'bootstrap-stats-token';
ALTER TABLE "urls" ALTER COLUMN "stats_token" DROP DEFAULT;
