-- Create temporary table with churchId nullable
PRAGMA foreign_keys=OFF;

-- Update User table to make churchId optional
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "age" INTEGER,
    "bio" TEXT,
    "skills" TEXT,
    "profileImage" TEXT,
    "backgroundTheme" TEXT NOT NULL DEFAULT 'light',
    "location" TEXT,
    "title" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "churchId" TEXT,
    CONSTRAINT "users_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_users" SELECT * FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_churchId_idx" ON "users"("churchId");

-- Update Church table to add new fields
ALTER TABLE "churches" ADD COLUMN "title" TEXT;
ALTER TABLE "churches" ADD COLUMN "description" TEXT;
ALTER TABLE "churches" ADD COLUMN "imageUrl" TEXT;
ALTER TABLE "churches" ADD COLUMN "cultosDias" TEXT;
ALTER TABLE "churches" ADD COLUMN "leaderID" TEXT;

PRAGMA foreign_keys=ON;
