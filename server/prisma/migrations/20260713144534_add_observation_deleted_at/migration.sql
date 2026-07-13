/*
  Warnings:

  - You are about to drop the column `addressLine3` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Challenge" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" DROP COLUMN "addressLine3";

-- AlterTable
ALTER TABLE "observations" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "observations_deletedAt_idx" ON "observations"("deletedAt");
