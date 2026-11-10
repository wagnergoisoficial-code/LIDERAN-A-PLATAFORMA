-- AlterTable
ALTER TABLE "users" ADD COLUMN "birthdayNoticeYear" INTEGER;
ALTER TABLE "users" ADD COLUMN "cargo" TEXT;

-- CreateTable
CREATE TABLE "finance_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "description" TEXT,
    "memberId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "churchId" TEXT NOT NULL,
    CONSTRAINT "finance_entries_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "church_documents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" DATETIME,
    "memberId" TEXT,
    "notes" TEXT,
    "mimeType" TEXT,
    "size" INTEGER,
    "data" BLOB,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "churchId" TEXT NOT NULL,
    CONSTRAINT "church_documents_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "songs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "artist" TEXT,
    "musicKey" TEXT,
    "link" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "churchId" TEXT NOT NULL,
    CONSTRAINT "songs_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "finance_entries_churchId_date_idx" ON "finance_entries"("churchId", "date");

-- CreateIndex
CREATE INDEX "church_documents_churchId_idx" ON "church_documents"("churchId");

-- CreateIndex
CREATE INDEX "songs_churchId_idx" ON "songs"("churchId");

