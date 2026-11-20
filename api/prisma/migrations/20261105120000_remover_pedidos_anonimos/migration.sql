-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_prayer_requests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isAnswered" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    CONSTRAINT "prayer_requests_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_prayer_requests" ("churchId", "content", "createdAt", "id", "isAnswered", "title", "updatedAt", "userId") SELECT "churchId", "content", "createdAt", "id", "isAnswered", "title", "updatedAt", "userId" FROM "prayer_requests";
DROP TABLE "prayer_requests";
ALTER TABLE "new_prayer_requests" RENAME TO "prayer_requests";
CREATE INDEX "prayer_requests_churchId_idx" ON "prayer_requests"("churchId");
CREATE INDEX "prayer_requests_userId_idx" ON "prayer_requests"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

