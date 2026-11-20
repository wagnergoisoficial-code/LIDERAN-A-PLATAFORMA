-- AlterTable
ALTER TABLE "churches" ADD COLUMN "inviteCode" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN "leaderVerifiedAt" DATETIME;

-- CreateTable
CREATE TABLE "leader_verifications" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" DATETIME,
    "reviewedById" TEXT,
    CONSTRAINT "leader_verifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "leader_documents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "verificationId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BLOB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "leader_documents_verificationId_fkey" FOREIGN KEY ("verificationId") REFERENCES "leader_verifications" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "leader_verifications_userId_key" ON "leader_verifications"("userId");

-- CreateIndex
CREATE INDEX "leader_verifications_status_idx" ON "leader_verifications"("status");

-- CreateIndex
CREATE INDEX "leader_documents_verificationId_idx" ON "leader_documents"("verificationId");

-- CreateIndex
CREATE UNIQUE INDEX "churches_inviteCode_key" ON "churches"("inviteCode");


-- Líderes que já têm comunidade ficam verificados (as datas no SQLite são milissegundos)
UPDATE "users" SET "leaderVerifiedAt" = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE "role" = 'leader' AND "id" IN (SELECT "leaderID" FROM "churches" WHERE "leaderID" IS NOT NULL);
