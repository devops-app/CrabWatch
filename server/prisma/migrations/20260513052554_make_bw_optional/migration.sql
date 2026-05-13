-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'RESEARCHER', 'ADMIN');

-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('MALE', 'FEMALE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "MaturationStatus" AS ENUM ('MATURE', 'IMMATURE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "LocationMethod" AS ENUM ('GPS', 'MANUAL');

-- CreateEnum
CREATE TYPE "ObservationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "avatar" TEXT,
    "password" TEXT,
    "firebaseUid" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FcmToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FcmToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "species" (
    "id" TEXT NOT NULL,
    "scientificName" TEXT NOT NULL,
    "commonName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "keyFeatures" JSONB NOT NULL,
    "images" JSONB NOT NULL,
    "distributionZones" JSONB NOT NULL,

    CONSTRAINT "species_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "observations" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "speciesId" TEXT NOT NULL,
    "cw" DOUBLE PRECISION NOT NULL,
    "bw" DOUBLE PRECISION,
    "sex" "Sex" NOT NULL,
    "maturationStatus" "MaturationStatus" NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "locationMethod" "LocationMethod" NOT NULL,
    "photos" JSONB NOT NULL,
    "notes" TEXT,
    "status" "ObservationStatus" NOT NULL DEFAULT 'PENDING',
    "validatedBy" UUID,
    "validatedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "observations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_firebaseUid_key" ON "User"("firebaseUid");

-- CreateIndex
CREATE UNIQUE INDEX "FcmToken_userId_key" ON "FcmToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "species_scientificName_key" ON "species"("scientificName");

-- CreateIndex
CREATE INDEX "observations_userId_idx" ON "observations"("userId");

-- CreateIndex
CREATE INDEX "observations_speciesId_idx" ON "observations"("speciesId");

-- CreateIndex
CREATE INDEX "observations_status_idx" ON "observations"("status");

-- CreateIndex
CREATE INDEX "observations_createdAt_idx" ON "observations"("createdAt");

-- CreateIndex
CREATE INDEX "observations_validatedBy_idx" ON "observations"("validatedBy");

-- CreateIndex
CREATE INDEX "observations_status_speciesId_idx" ON "observations"("status", "speciesId");

-- CreateIndex
CREATE INDEX "observations_status_createdAt_idx" ON "observations"("status", "createdAt");

-- CreateIndex
CREATE INDEX "observations_speciesId_status_idx" ON "observations"("speciesId", "status");

-- AddForeignKey
ALTER TABLE "FcmToken" ADD CONSTRAINT "FcmToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observations" ADD CONSTRAINT "observations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observations" ADD CONSTRAINT "observations_validatedBy_fkey" FOREIGN KEY ("validatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observations" ADD CONSTRAINT "observations_speciesId_fkey" FOREIGN KEY ("speciesId") REFERENCES "species"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
