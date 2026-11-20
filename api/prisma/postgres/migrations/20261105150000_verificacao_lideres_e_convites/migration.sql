-- AlterTable
ALTER TABLE "churches" ADD COLUMN     "inviteCode" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "leaderVerifiedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "leader_verifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "churchName" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reason" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,

    CONSTRAINT "leader_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leader_documents" (
    "id" TEXT NOT NULL,
    "verificationId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leader_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "leader_verifications_userId_key" ON "leader_verifications"("userId");

-- CreateIndex
CREATE INDEX "leader_verifications_status_idx" ON "leader_verifications"("status");

-- CreateIndex
CREATE INDEX "leader_documents_verificationId_idx" ON "leader_documents"("verificationId");

-- CreateIndex
CREATE UNIQUE INDEX "churches_inviteCode_key" ON "churches"("inviteCode");

-- AddForeignKey
ALTER TABLE "leader_verifications" ADD CONSTRAINT "leader_verifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leader_documents" ADD CONSTRAINT "leader_documents_verificationId_fkey" FOREIGN KEY ("verificationId") REFERENCES "leader_verifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Líderes que já têm comunidade ficam verificados
UPDATE "users" SET "leaderVerifiedAt" = CURRENT_TIMESTAMP
WHERE "role" = 'leader' AND "id" IN (SELECT "leaderID" FROM "churches" WHERE "leaderID" IS NOT NULL);
