-- AlterTable
ALTER TABLE "point_audit_logs" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
