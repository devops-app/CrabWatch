/*
  Warnings:

  - You are about to drop the column `address` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "address",
DROP COLUMN "phone",
ADD COLUMN     "addressLine1" TEXT,
ADD COLUMN     "addressLine2" TEXT,
ADD COLUMN     "addressLine3" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "phoneCode" TEXT,
ADD COLUMN     "phoneNumber" TEXT,
ADD COLUMN     "postcode" TEXT,
ADD COLUMN     "state" TEXT;
