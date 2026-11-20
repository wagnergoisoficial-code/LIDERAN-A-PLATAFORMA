-- AlterTable
ALTER TABLE "messages" ADD COLUMN "hiddenAt" DATETIME;
ALTER TABLE "messages" ADD COLUMN "hiddenById" TEXT;

-- CreateTable
CREATE TABLE "guardianships" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "relationship" TEXT,
    "authorizedAt" DATETIME,
    "authorizationMethod" TEXT,
    "authorizedById" TEXT,
    "proofUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guardianId" TEXT NOT NULL,
    "minorId" TEXT NOT NULL,
    CONSTRAINT "guardianships_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "guardianships_minorId_fkey" FOREIGN KEY ("minorId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMessageAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "churchId" TEXT NOT NULL,
    CONSTRAINT "conversations_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "conversation_participants" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lastReadAt" DATETIME,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "conversation_participants_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "conversation_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "direct_messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    CONSTRAINT "direct_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "direct_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT 'quick',
    "details" TEXT,
    "snapshot" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "resolution" TEXT,
    "resolvedById" TEXT,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "churchId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "targetUserId" TEXT,
    CONSTRAINT "reports_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "reports_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "moderation_actions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "until" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "churchId" TEXT,
    "userId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "reportId" TEXT
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "age" INTEGER,
    "birthDate" DATETIME,
    "bio" TEXT,
    "skills" TEXT,
    "profileImage" TEXT,
    "backgroundTheme" TEXT NOT NULL DEFAULT 'light',
    "location" TEXT,
    "title" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "churchId" TEXT,
    "leaderId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "suspendedUntil" DATETIME,
    "statusReason" TEXT,
    CONSTRAINT "users_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_users" ("age", "backgroundTheme", "bio", "birthDate", "churchId", "createdAt", "email", "id", "leaderId", "location", "name", "password", "profileImage", "role", "skills", "title", "updatedAt") SELECT "age", "backgroundTheme", "bio", "birthDate", "churchId", "createdAt", "email", "id", "leaderId", "location", "name", "password", "profileImage", "role", "skills", "title", "updatedAt" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_churchId_idx" ON "users"("churchId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "guardianships_minorId_idx" ON "guardianships"("minorId");

-- CreateIndex
CREATE UNIQUE INDEX "guardianships_guardianId_minorId_key" ON "guardianships"("guardianId", "minorId");

-- CreateIndex
CREATE INDEX "conversations_churchId_idx" ON "conversations"("churchId");

-- CreateIndex
CREATE INDEX "conversation_participants_userId_idx" ON "conversation_participants"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_participants_conversationId_userId_key" ON "conversation_participants"("conversationId", "userId");

-- CreateIndex
CREATE INDEX "direct_messages_conversationId_createdAt_idx" ON "direct_messages"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "reports_churchId_status_idx" ON "reports"("churchId", "status");

-- CreateIndex
CREATE INDEX "moderation_actions_userId_idx" ON "moderation_actions"("userId");

-- CreateIndex
CREATE INDEX "moderation_actions_churchId_idx" ON "moderation_actions"("churchId");

