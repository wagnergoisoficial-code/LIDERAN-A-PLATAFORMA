-- AlterTable
ALTER TABLE "posts" ADD COLUMN "donatedAt" DATETIME;
ALTER TABLE "posts" ADD COLUMN "latitude" REAL;
ALTER TABLE "posts" ADD COLUMN "location" TEXT;
ALTER TABLE "posts" ADD COLUMN "longitude" REAL;

-- CreateIndex
CREATE INDEX "posts_type_idx" ON "posts"("type");

