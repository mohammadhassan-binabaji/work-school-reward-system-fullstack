-- CreateTable
CREATE TABLE "guidance_categories" (
    "id" UUID NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "icon_key" VARCHAR(100),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" "GuidanceCardStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guidance_categories_pkey" PRIMARY KEY ("id")
);

-- Insert fallback category for existing cards if any exist
INSERT INTO "guidance_categories" ("id", "title", "icon_key", "sort_order", "status")
VALUES ('00000000-0000-0000-0000-000000000001', 'عمومی', 'graduation-cap', 0, 'ACTIVE')
ON CONFLICT ("id") DO NOTHING;

-- AlterTable: Add columns (category_id nullable initially)
ALTER TABLE "guidance_cards" ADD COLUMN     "category_id" UUID,
ADD COLUMN     "sort_order" INTEGER NOT NULL DEFAULT 0;

-- Backfill existing guidance cards
UPDATE "guidance_cards" SET "category_id" = '00000000-0000-0000-0000-000000000001' WHERE "category_id" IS NULL;

-- Enforce NOT NULL constraint
ALTER TABLE "guidance_cards" ALTER COLUMN "category_id" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "guidance_cards" ADD CONSTRAINT "guidance_cards_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "guidance_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
