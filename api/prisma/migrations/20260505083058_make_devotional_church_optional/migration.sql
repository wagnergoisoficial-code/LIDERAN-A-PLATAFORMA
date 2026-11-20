-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_devotionals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "verse" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "activatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    "churchId" TEXT,
    CONSTRAINT "devotionals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "devotionals_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_devotionals" ("activatedAt", "churchId", "content", "createdAt", "id", "isActive", "title", "updatedAt", "userId", "verse") SELECT "activatedAt", "churchId", "content", "createdAt", "id", "isActive", "title", "updatedAt", "userId", "verse" FROM "devotionals";
DROP TABLE "devotionals";
ALTER TABLE "new_devotionals" RENAME TO "devotionals";
CREATE INDEX "devotionals_userId_idx" ON "devotionals"("userId");
CREATE INDEX "devotionals_churchId_idx" ON "devotionals"("churchId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
