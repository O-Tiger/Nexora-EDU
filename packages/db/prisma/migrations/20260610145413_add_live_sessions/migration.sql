-- CreateEnum
CREATE TYPE "LiveStatus" AS ENUM ('SCHEDULED', 'LIVE', 'ENDED', 'CANCELLED');

-- CreateTable
CREATE TABLE "LiveSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "meetingUrl" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "durationMin" INTEGER NOT NULL DEFAULT 60,
    "status" "LiveStatus" NOT NULL DEFAULT 'SCHEDULED',
    "recordingUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiveSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveAttendance" (
    "id" TEXT NOT NULL,
    "liveSessionId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "LiveAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LiveSession_lessonId_key" ON "LiveSession"("lessonId");

-- CreateIndex
CREATE INDEX "LiveSession_tenantId_startAt_idx" ON "LiveSession"("tenantId", "startAt");

-- CreateIndex
CREATE INDEX "LiveSession_tenantId_status_idx" ON "LiveSession"("tenantId", "status");

-- CreateIndex
CREATE INDEX "LiveAttendance_liveSessionId_idx" ON "LiveAttendance"("liveSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "LiveAttendance_liveSessionId_enrollmentId_key" ON "LiveAttendance"("liveSessionId", "enrollmentId");

-- AddForeignKey
ALTER TABLE "LiveSession" ADD CONSTRAINT "LiveSession_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveAttendance" ADD CONSTRAINT "LiveAttendance_liveSessionId_fkey" FOREIGN KEY ("liveSessionId") REFERENCES "LiveSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
