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

-- AlterTable
ALTER TABLE "guidance_cards" ADD COLUMN     "category_id" UUID NOT NULL,
ADD COLUMN     "sort_order" INTEGER NOT NULL DEFAULT 0;

-- AddForeignKey
ALTER TABLE "guidance_cards" ADD CONSTRAINT "guidance_cards_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "guidance_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
