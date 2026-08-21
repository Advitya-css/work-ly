-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('SAVED', 'PREPARING', 'APPLIED', 'ASSESSMENT', 'INTERVIEW', 'FINAL_INTERVIEW', 'OFFER', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "ApplicationOutcome" AS ENUM ('PENDING', 'REJECTED', 'OFFER', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "opportunityId" TEXT,
    "jobId" TEXT,
    "jobAnalysisId" TEXT,
    "roleTitle" TEXT NOT NULL,
    "company" TEXT,
    "industry" TEXT,
    "location" TEXT,
    "country" TEXT,
    "fitScoreAtApply" INTEGER,
    "priorityScoreAtApply" INTEGER,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'APPLIED',
    "outcome" "ApplicationOutcome" NOT NULL DEFAULT 'PENDING',
    "dateApplied" TIMESTAMP(3),
    "reachedAssessmentAt" TIMESTAMP(3),
    "reachedInterviewAt" TIMESTAMP(3),
    "reachedOfferAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "cvVersion" TEXT,
    "coverLetter" TEXT,
    "notes" TEXT,
    "contacts" JSONB NOT NULL DEFAULT '[]',
    "interviews" JSONB NOT NULL DEFAULT '[]',
    "salaryOffered" INTEGER,
    "salaryCurrency" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "applications_opportunityId_key" ON "applications"("opportunityId");

-- CreateIndex
CREATE INDEX "applications_userId_idx" ON "applications"("userId");

-- CreateIndex
CREATE INDEX "applications_userId_status_idx" ON "applications"("userId", "status");

-- CreateIndex
CREATE INDEX "applications_userId_outcome_idx" ON "applications"("userId", "outcome");

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_jobAnalysisId_fkey" FOREIGN KEY ("jobAnalysisId") REFERENCES "job_analyses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
