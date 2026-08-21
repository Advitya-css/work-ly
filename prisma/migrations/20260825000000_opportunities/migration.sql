-- CreateEnum
CREATE TYPE "OpportunityStatus" AS ENUM ('DISCOVERED', 'PREPARING', 'APPLIED');

-- CreateTable
CREATE TABLE "opportunities" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "jobAnalysisId" TEXT,
    "fitScore" INTEGER NOT NULL,
    "recommendation" "RecommendationType" NOT NULL,
    "competitiveness" TEXT NOT NULL,
    "priorityScore" INTEGER NOT NULL,
    "priorityBreakdown" JSONB NOT NULL DEFAULT '{}',
    "isSaved" BOOLEAN NOT NULL DEFAULT false,
    "status" "OpportunityStatus" NOT NULL DEFAULT 'DISCOVERED',
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAnalyzedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "opportunities_jobId_key" ON "opportunities"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "opportunities_jobAnalysisId_key" ON "opportunities"("jobAnalysisId");

-- CreateIndex
CREATE INDEX "opportunities_userId_idx" ON "opportunities"("userId");

-- CreateIndex
CREATE INDEX "opportunities_userId_status_idx" ON "opportunities"("userId", "status");

-- CreateIndex
CREATE INDEX "opportunities_userId_isSaved_idx" ON "opportunities"("userId", "isSaved");

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_jobAnalysisId_fkey" FOREIGN KEY ("jobAnalysisId") REFERENCES "job_analyses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
