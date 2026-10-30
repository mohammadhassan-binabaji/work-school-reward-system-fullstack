-- AlterTable
ALTER TABLE "activities" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "classes" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "daily_student_snapshots" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "guidance_cards" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "notifications" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "point_audit_logs" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "point_task_options" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "point_transfer_tasks" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "reward_requests" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "rewards" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "student_activity_progress" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "student_task_proposals" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "subjects" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "system_point_pools" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "task_proposal_messages" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "teacher_class_subject_assignments" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tier_configurations" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "verification_requests" ALTER COLUMN "id" DROP DEFAULT;

-- RenameForeignKey
ALTER TABLE "point_audit_logs" RENAME CONSTRAINT "point_audit_logs_actor_fkey" TO "point_audit_logs_actor_id_fkey";

-- RenameForeignKey
ALTER TABLE "point_task_options" RENAME CONSTRAINT "point_task_options_task_fkey" TO "point_task_options_task_id_fkey";

-- RenameForeignKey
ALTER TABLE "reward_requests" RENAME CONSTRAINT "reward_requests_admin_fkey" TO "reward_requests_reviewed_by_admin_id_fkey";

-- RenameForeignKey
ALTER TABLE "reward_requests" RENAME CONSTRAINT "reward_requests_reward_fkey" TO "reward_requests_reward_id_fkey";

-- RenameForeignKey
ALTER TABLE "reward_requests" RENAME CONSTRAINT "reward_requests_student_fkey" TO "reward_requests_student_id_fkey";

-- RenameForeignKey
ALTER TABLE "student_activity_progress" RENAME CONSTRAINT "progress_activity_fkey" TO "student_activity_progress_activity_id_fkey";

-- RenameForeignKey
ALTER TABLE "student_activity_progress" RENAME CONSTRAINT "progress_student_fkey" TO "student_activity_progress_student_id_fkey";

-- RenameForeignKey
ALTER TABLE "student_profiles" RENAME CONSTRAINT "student_profiles_class_fkey" TO "student_profiles_class_id_fkey";

-- RenameForeignKey
ALTER TABLE "student_profiles" RENAME CONSTRAINT "student_profiles_tier_fkey" TO "student_profiles_current_tier_id_fkey";

-- RenameForeignKey
ALTER TABLE "student_profiles" RENAME CONSTRAINT "student_profiles_user_fkey" TO "student_profiles_id_fkey";

-- RenameForeignKey
ALTER TABLE "student_task_proposals" RENAME CONSTRAINT "proposals_admin_fkey" TO "student_task_proposals_reviewed_by_admin_id_fkey";

-- RenameForeignKey
ALTER TABLE "student_task_proposals" RENAME CONSTRAINT "proposals_student_fkey" TO "student_task_proposals_student_id_fkey";

-- RenameForeignKey
ALTER TABLE "task_proposal_messages" RENAME CONSTRAINT "messages_proposal_fkey" TO "task_proposal_messages_proposal_id_fkey";

-- RenameForeignKey
ALTER TABLE "task_proposal_messages" RENAME CONSTRAINT "messages_sender_fkey" TO "task_proposal_messages_sender_id_fkey";

-- RenameForeignKey
ALTER TABLE "teacher_class_subject_assignments" RENAME CONSTRAINT "assignment_class_fkey" TO "teacher_class_subject_assignments_class_id_fkey";

-- RenameForeignKey
ALTER TABLE "teacher_class_subject_assignments" RENAME CONSTRAINT "assignment_subject_fkey" TO "teacher_class_subject_assignments_subject_id_fkey";

-- RenameForeignKey
ALTER TABLE "teacher_class_subject_assignments" RENAME CONSTRAINT "assignment_teacher_fkey" TO "teacher_class_subject_assignments_teacher_id_fkey";

-- RenameForeignKey
ALTER TABLE "teacher_profiles" RENAME CONSTRAINT "teacher_profiles_user_fkey" TO "teacher_profiles_id_fkey";

-- RenameForeignKey
ALTER TABLE "verification_requests" RENAME CONSTRAINT "verification_requests_activity_fkey" TO "verification_requests_activity_id_fkey";

-- RenameForeignKey
ALTER TABLE "verification_requests" RENAME CONSTRAINT "verification_requests_admin_fkey" TO "verification_requests_reviewed_by_admin_id_fkey";

-- RenameForeignKey
ALTER TABLE "verification_requests" RENAME CONSTRAINT "verification_requests_student_fkey" TO "verification_requests_student_id_fkey";
