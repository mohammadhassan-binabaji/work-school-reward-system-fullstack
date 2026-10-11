-- CreateEnum
CREATE TYPE "NotificationReadStatus" AS ENUM ('UNREAD', 'READ');

-- CreateEnum
CREATE TYPE "OriginatingEntityType" AS ENUM ('REWARD_REQUEST', 'TASK_PROPOSAL', 'PROPOSAL_MESSAGE', 'CHALLENGE_VERIFICATION', 'POINT_ALLOCATION', 'POINT_AWARD', 'POINT_ADJUSTMENT', 'ACTIVITY_BAN', 'ACTIVITY_UNBLOCK');

-- CreateTable notifications
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "recipient_id" UUID NOT NULL,
    "subject" VARCHAR(200) NOT NULL,
    "body" TEXT NOT NULL,
    "read_status" "NotificationReadStatus" NOT NULL DEFAULT 'UNREAD',
    "read_at" TIMESTAMPTZ,
    "originating_entity_type" "OriginatingEntityType" NOT NULL,
    "originating_entity_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "notifications_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "notifications_recipient_id_created_at_id_idx" ON "notifications"("recipient_id", "created_at" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "notifications_recipient_id_read_status_idx" ON "notifications"("recipient_id", "read_status");
