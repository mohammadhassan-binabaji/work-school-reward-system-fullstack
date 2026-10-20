-- AlterTable
ALTER TABLE "point_audit_logs" RENAME COLUMN "task_or_reason" TO "reason_detail";
ALTER TABLE "point_audit_logs" ALTER COLUMN "reason_detail" DROP NOT NULL;
