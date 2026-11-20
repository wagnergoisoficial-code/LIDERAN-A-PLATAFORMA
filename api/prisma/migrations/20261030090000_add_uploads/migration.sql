-- CreateTable
CREATE TABLE "uploads" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "data" BLOB NOT NULL,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "uploads_userId_idx" ON "uploads"("userId");

