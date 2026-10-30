-- Clean up previously soft-deleted categories and cards
DELETE FROM "guidance_cards" WHERE "status" = 'REMOVED';
DELETE FROM "guidance_categories" WHERE "status" = 'REMOVED';

-- AlterTable
ALTER TABLE "guidance_cards" DROP COLUMN "status";

-- AlterTable
ALTER TABLE "guidance_categories" DROP COLUMN "status";

-- DropEnum
DROP TYPE "GuidanceCardStatus";
