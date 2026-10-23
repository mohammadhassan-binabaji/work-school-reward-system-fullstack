-- AlterTable
ALTER TABLE "tier_configurations" ADD COLUMN IF NOT EXISTS "theme_id" VARCHAR(50) NOT NULL DEFAULT 'bronze_ember';
ALTER TABLE "tier_configurations" ADD COLUMN IF NOT EXISTS "motivational_messages" TEXT[] NOT NULL DEFAULT '{}';
