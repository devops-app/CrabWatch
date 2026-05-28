-- AlterTable
ALTER TABLE "User" ADD COLUMN     "preferredLocale" TEXT DEFAULT 'en';

-- CreateTable
CREATE TABLE "Translation" (
    "id" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Translation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Translation_locale_resourceType_resourceId_idx" ON "Translation"("locale", "resourceType", "resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "Translation_locale_resourceType_resourceId_field_key" ON "Translation"("locale", "resourceType", "resourceId", "field");
