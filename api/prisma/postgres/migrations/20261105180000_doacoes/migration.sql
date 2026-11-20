-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "donatedAt" TIMESTAMP(3),
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "longitude" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "posts_type_idx" ON "posts"("type");

