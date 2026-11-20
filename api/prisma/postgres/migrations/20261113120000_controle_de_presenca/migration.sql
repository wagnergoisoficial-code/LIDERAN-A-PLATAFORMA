-- CreateTable
CREATE TABLE "roll_calls" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "churchId" TEXT NOT NULL,

    CONSTRAINT "roll_calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roll_call_presences" (
    "rollCallId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "roll_call_presences_pkey" PRIMARY KEY ("rollCallId","userId")
);

-- CreateIndex
CREATE INDEX "roll_calls_churchId_date_idx" ON "roll_calls"("churchId", "date");

-- CreateIndex
CREATE INDEX "roll_call_presences_userId_idx" ON "roll_call_presences"("userId");

-- AddForeignKey
ALTER TABLE "roll_calls" ADD CONSTRAINT "roll_calls_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roll_call_presences" ADD CONSTRAINT "roll_call_presences_rollCallId_fkey" FOREIGN KEY ("rollCallId") REFERENCES "roll_calls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roll_call_presences" ADD CONSTRAINT "roll_call_presences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

