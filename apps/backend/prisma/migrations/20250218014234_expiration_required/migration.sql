/*
  Warnings:

  - Made the column `expiresAt` on table `urls` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "urls" ALTER COLUMN "expiresAt" SET NOT NULL;

-- CreateIndex
CREATE INDEX "urls_visits_idx" ON "urls"("visits");
