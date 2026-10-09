-- Rename table: daily_student_balance_snapshots -> daily_student_snapshots
ALTER TABLE "daily_student_balance_snapshots" RENAME TO "daily_student_snapshots";

-- Rename primary key constraint
ALTER TABLE "daily_student_snapshots"
  RENAME CONSTRAINT "daily_student_balance_snapshots_pkey" TO "daily_student_snapshots_pkey";

-- Rename unique constraint
ALTER TABLE "daily_student_snapshots"
  RENAME CONSTRAINT "daily_snapshots_unique" TO "daily_student_snapshots_student_id_snapshot_date_key";

-- Rename foreign key constraint
ALTER TABLE "daily_student_snapshots"
  RENAME CONSTRAINT "snapshots_student_fkey" TO "daily_student_snapshots_student_id_fkey";

-- Drop the old balance check constraint (it will be re-added if desired, but is not in the Prisma model)
ALTER TABLE "daily_student_snapshots"
  DROP CONSTRAINT IF EXISTS "daily_student_balance_snapshots_balance_check";

-- Add new columns: school_rank (required) and class_rank (nullable)
ALTER TABLE "daily_student_snapshots"
  ADD COLUMN "school_rank" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "class_rank" INTEGER;

-- Remove the DEFAULT 0 from school_rank now that existing rows are populated
ALTER TABLE "daily_student_snapshots"
  ALTER COLUMN "school_rank" DROP DEFAULT;
