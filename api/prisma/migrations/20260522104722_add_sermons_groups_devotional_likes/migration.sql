-- AlterTable
ALTER TABLE "users" ADD COLUMN "birthDate" DATETIME;

-- CreateTable
CREATE TABLE "sermon_notes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "speaker" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "scriptureRef" TEXT,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "churchId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    CONSTRAINT "sermon_notes_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "sermon_notes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "groups" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'celula',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "churchId" TEXT NOT NULL,
    "leaderId" TEXT NOT NULL,
    CONSTRAINT "groups_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "groups_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "group_members" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "role" TEXT NOT NULL DEFAULT 'member',
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "group_members_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "group_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "devotional_likes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "devotionalId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "devotional_likes_devotionalId_fkey" FOREIGN KEY ("devotionalId") REFERENCES "devotionals" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "devotional_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "sermon_notes_churchId_idx" ON "sermon_notes"("churchId");

-- CreateIndex
CREATE INDEX "groups_churchId_idx" ON "groups"("churchId");

-- CreateIndex
CREATE INDEX "group_members_groupId_idx" ON "group_members"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "group_members_groupId_userId_key" ON "group_members"("groupId", "userId");

-- CreateIndex
CREATE INDEX "devotional_likes_devotionalId_idx" ON "devotional_likes"("devotionalId");

-- CreateIndex
CREATE UNIQUE INDEX "devotional_likes_devotionalId_userId_key" ON "devotional_likes"("devotionalId", "userId");
