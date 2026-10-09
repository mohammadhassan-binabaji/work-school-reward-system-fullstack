-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'TEACHER', 'STUDENT');
CREATE TYPE "AccountState" AS ENUM ('ACTIVE', 'INACTIVE', 'DEACTIVATED', 'DEPARTED');
CREATE TYPE "AssignmentStatus" AS ENUM ('ACTIVE', 'REMOVED');
CREATE TYPE "ActorRole" AS ENUM ('ADMIN', 'TEACHER', 'STUDENT', 'SYSTEM');
CREATE TYPE "SourceType" AS ENUM ('SYSTEM_POOL', 'TEACHER', 'STUDENT_CURRENT', 'STUDENT_RESERVED');
CREATE TYPE "RecipientType" AS ENUM ('TEACHER', 'STUDENT_CURRENT', 'STUDENT_RESERVED', 'SYSTEM_POOL', 'NONE');
CREATE TYPE "ActionType" AS ENUM ('POOL_FUND_TEACHER', 'TEACHER_AWARD_STUDENT', 'ADMIN_ADJUST_STUDENT', 'REWARD_RESERVE_POINTS', 'REWARD_DECLINE_RETURN', 'REWARD_REMOVE_RETURN', 'REWARD_RECEIVE_COMPLETE', 'CHALLENGE_AWARD_STUDENT', 'PROPOSAL_AWARD_STUDENT', 'STUDENT_DEPARTURE_DEDUCT');
CREATE TYPE "RewardStatus" AS ENUM ('ACTIVE', 'REMOVED');
CREATE TYPE "RewardRequestStatus" AS ENUM ('PENDING_TO_APPROVE', 'PENDING_TO_RECEIVE', 'COMPLETED', 'DECLINED');
CREATE TYPE "ActivityType" AS ENUM ('CHALLENGE', 'MISSION');
CREATE TYPE "ActivityStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'REMOVED');
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');
CREATE TYPE "ProposalStatus" AS ENUM ('PENDING_TO_APPROVE', 'READY_TO_DO', 'COMPLETED', 'DECLINED', 'CANCELED');
CREATE TYPE "GuidanceCardStatus" AS ENUM ('ACTIVE', 'REMOVED');

-- CreateTable users
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "national_id" VARCHAR(10) NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "Role" NOT NULL,
    "account_state" "AccountState" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "users_national_id_check" CHECK (national_id ~ '^[0-9]{10}$')
);

CREATE UNIQUE INDEX "users_national_id_key" ON "users"("national_id");
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateTable teacher_profiles
CREATE TABLE "teacher_profiles" (
    "id" UUID NOT NULL,
    "point_balance" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "teacher_profiles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "teacher_profiles_point_balance_check" CHECK (point_balance >= 0),
    CONSTRAINT "teacher_profiles_user_fkey" FOREIGN KEY ("id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable student_profiles
CREATE TABLE "student_profiles" (
    "id" UUID NOT NULL,
    "class_id" UUID,
    "current_balance" INTEGER NOT NULL DEFAULT 0,
    "reserved_balance" INTEGER NOT NULL DEFAULT 0,
    "highest_balance" INTEGER NOT NULL DEFAULT 0,
    "current_tier_id" UUID,
    CONSTRAINT "student_profiles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "student_profiles_current_balance_check" CHECK (current_balance >= 0),
    CONSTRAINT "student_profiles_reserved_balance_check" CHECK (reserved_balance >= 0),
    CONSTRAINT "student_profiles_highest_balance_check" CHECK (highest_balance >= 0),
    CONSTRAINT "student_profiles_user_fkey" FOREIGN KEY ("id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable classes
CREATE TABLE "classes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "grade_level" VARCHAR(50),
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "classes_name_key" ON "classes"("name");

-- CreateTable subjects
CREATE TABLE "subjects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "subjects_name_key" ON "subjects"("name");

-- CreateTable teacher_class_subject_assignments
CREATE TABLE "teacher_class_subject_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "teacher_id" UUID NOT NULL,
    "class_id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "teacher_class_subject_assignments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "teacher_assignments_unique_triplet" UNIQUE ("teacher_id", "class_id", "subject_id"),
    CONSTRAINT "assignment_teacher_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "assignment_class_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "assignment_subject_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable system_point_pools
CREATE TABLE "system_point_pools" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "balance" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "system_point_pools_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "system_point_pools_balance_check" CHECK (balance >= 0)
);

-- CreateTable point_transfer_tasks
CREATE TABLE "point_transfer_tasks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "point_transfer_tasks_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "point_transfer_tasks_name_key" ON "point_transfer_tasks"("name");

-- CreateTable point_task_options
CREATE TABLE "point_task_options" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "task_id" UUID NOT NULL,
    "points" INTEGER NOT NULL,
    "label" VARCHAR(100),
    CONSTRAINT "point_task_options_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "point_task_options_points_check" CHECK (points > 0),
    CONSTRAINT "point_task_options_task_fkey" FOREIGN KEY ("task_id") REFERENCES "point_transfer_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable point_audit_logs
CREATE TABLE "point_audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "correlation_id" VARCHAR(64) NOT NULL,
    "actor_id" UUID,
    "actor_role" "ActorRole" NOT NULL,
    "source_type" "SourceType" NOT NULL,
    "source_id" UUID,
    "recipient_type" "RecipientType" NOT NULL,
    "recipient_id" UUID,
    "amount" INTEGER NOT NULL,
    "action_type" "ActionType" NOT NULL,
    "task_or_reason" TEXT NOT NULL,
    "related_entity_type" VARCHAR(50),
    "related_entity_id" UUID,
    "resulting_source_balance" INTEGER,
    "resulting_recipient_balance" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "point_audit_logs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "point_audit_logs_amount_check" CHECK (amount > 0),
    CONSTRAINT "point_audit_logs_actor_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable rewards
CREATE TABLE "rewards" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT NOT NULL,
    "image_url" VARCHAR(500),
    "point_price" INTEGER NOT NULL,
    "requires_approval" BOOLEAN NOT NULL,
    "inventory_quantity" INTEGER,
    "status" "RewardStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "rewards_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "rewards_point_price_check" CHECK (point_price > 0),
    CONSTRAINT "rewards_inventory_quantity_check" CHECK (inventory_quantity IS NULL OR inventory_quantity >= 0)
);

-- CreateTable reward_requests
CREATE TABLE "reward_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "student_id" UUID NOT NULL,
    "reward_id" UUID NOT NULL,
    "price_at_request" INTEGER NOT NULL,
    "requires_approval" BOOLEAN NOT NULL,
    "status" "RewardRequestStatus" NOT NULL,
    "reserved_amount" INTEGER NOT NULL DEFAULT 0,
    "decline_reason" TEXT,
    "reviewed_by_admin_id" UUID,
    "reviewed_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reward_requests_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "reward_requests_student_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "reward_requests_reward_fkey" FOREIGN KEY ("reward_id") REFERENCES "rewards"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "reward_requests_admin_fkey" FOREIGN KEY ("reviewed_by_admin_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable activities
CREATE TABLE "activities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" "ActivityType" NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "description" TEXT NOT NULL,
    "point_value" INTEGER NOT NULL,
    "completion_limit" INTEGER NOT NULL,
    "status" "ActivityStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "activities_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "activities_point_value_check" CHECK (point_value > 0),
    CONSTRAINT "activities_completion_limit_check" CHECK (completion_limit > 0)
);

-- CreateTable verification_requests
CREATE TABLE "verification_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "student_id" UUID NOT NULL,
    "activity_id" UUID NOT NULL,
    "text_description" TEXT NOT NULL,
    "file_attachment_url" VARCHAR(500),
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "rejection_reason" TEXT,
    "reviewed_by_admin_id" UUID,
    "reviewed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "verification_requests_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "verification_requests_student_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "verification_requests_activity_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "verification_requests_admin_fkey" FOREIGN KEY ("reviewed_by_admin_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable student_activity_progress
CREATE TABLE "student_activity_progress" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "student_id" UUID NOT NULL,
    "activity_id" UUID NOT NULL,
    "completion_count" INTEGER NOT NULL DEFAULT 0,
    "rejection_count" INTEGER NOT NULL DEFAULT 0,
    "banned_until" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "student_activity_progress_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "student_activity_progress_unique" UNIQUE ("student_id", "activity_id"),
    CONSTRAINT "progress_student_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "progress_activity_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable student_task_proposals
CREATE TABLE "student_task_proposals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "student_id" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ProposalStatus" NOT NULL DEFAULT 'PENDING_TO_APPROVE',
    "assigned_point_value" INTEGER,
    "decline_reason" TEXT,
    "reviewed_by_admin_id" UUID,
    "approved_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "student_task_proposals_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "student_task_proposals_assigned_point_value_check" CHECK (assigned_point_value IS NULL OR assigned_point_value > 0),
    CONSTRAINT "proposals_student_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "proposals_admin_fkey" FOREIGN KEY ("reviewed_by_admin_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable task_proposal_messages
CREATE TABLE "task_proposal_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "proposal_id" UUID NOT NULL,
    "sender_id" UUID,
    "sender_role" "Role" NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "task_proposal_messages_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "messages_proposal_fkey" FOREIGN KEY ("proposal_id") REFERENCES "student_task_proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "messages_sender_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable tier_configurations
CREATE TABLE "tier_configurations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tier_number" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "min_points_threshold" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tier_configurations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tier_configurations_tier_number_check" CHECK (tier_number BETWEEN 1 AND 5),
    CONSTRAINT "tier_configurations_min_points_threshold_check" CHECK (min_points_threshold >= 0)
);
CREATE UNIQUE INDEX "tier_configurations_tier_number_key" ON "tier_configurations"("tier_number");

-- Foreign key student_profiles to classes & tier_configurations
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_class_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_tier_fkey" FOREIGN KEY ("current_tier_id") REFERENCES "tier_configurations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable daily_student_balance_snapshots
CREATE TABLE "daily_student_balance_snapshots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "student_id" UUID NOT NULL,
    "balance" INTEGER NOT NULL,
    "snapshot_date" DATE NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "daily_student_balance_snapshots_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "daily_student_balance_snapshots_balance_check" CHECK (balance >= 0),
    CONSTRAINT "daily_snapshots_unique" UNIQUE ("student_id", "snapshot_date"),
    CONSTRAINT "snapshots_student_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable guidance_cards
CREATE TABLE "guidance_cards" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" VARCHAR(150) NOT NULL,
    "description" TEXT NOT NULL,
    "logo_key" VARCHAR(100) NOT NULL,
    "point_range_label" VARCHAR(100) NOT NULL,
    "status" "GuidanceCardStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "guidance_cards_pkey" PRIMARY KEY ("id")
);
