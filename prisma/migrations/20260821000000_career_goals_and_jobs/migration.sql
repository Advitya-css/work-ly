-- CreateEnum
CREATE TYPE "WorkMode" AS ENUM ('REMOTE', 'HYBRID', 'ONSITE');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'FREELANCE');

-- CreateEnum
CREATE TYPE "SeniorityLevel" AS ENUM ('ENTRY', 'JUNIOR', 'MID', 'SENIOR', 'LEAD', 'PRINCIPAL', 'EXECUTIVE');

-- CreateEnum
CREATE TYPE "JobInputMethod" AS ENUM ('PASTED_TEXT', 'URL');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PARSING', 'PARSED', 'FAILED');

-- CreateEnum
CREATE TYPE "RecommendationType" AS ENUM ('APPLY_NOW', 'APPLY', 'STRETCH', 'LOW_PRIORITY', 'SKIP');

-- CreateEnum
CREATE TYPE "GapType" AS ENUM ('SKILL_GAP', 'EXPERIENCE_GAP', 'EVIDENCE_GAP', 'PORTFOLIO_GAP', 'CREDENTIAL_GAP', 'SENIORITY_GAP', 'POSITIONING_GAP');

-- AlterTable: expand career_goals with Phase 3 structured targeting fields
ALTER TABLE "career_goals"
  ADD COLUMN "primaryTargetRole" TEXT,
  ADD COLUMN "secondaryTargetRoles" TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN "industries" TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN "preferredLocations" TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN "countries" TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN "workModes" "WorkMode"[] NOT NULL DEFAULT '{}',
  ADD COLUMN "employmentTypes" "EmploymentType"[] NOT NULL DEFAULT '{}',
  ADD COLUMN "seniority" "SeniorityLevel",
  ADD COLUMN "salaryMin" INTEGER,
  ADD COLUMN "salaryMax" INTEGER,
  ADD COLUMN "salaryCurrency" TEXT DEFAULT 'USD',
  ADD COLUMN "isUncertain" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "inputMethod" "JobInputMethod" NOT NULL,
    "url" TEXT,
    "rawInput" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PARSING',
    "errorMessage" TEXT,
    "title" TEXT,
    "company" TEXT,
    "location" TEXT,
    "country" TEXT,
    "salaryMin" INTEGER,
    "salaryMax" INTEGER,
    "salaryCurrency" TEXT,
    "employmentType" "EmploymentType",
    "workMode" "WorkMode",
    "seniority" "SeniorityLevel",
    "description" TEXT,
    "requiredExperienceYears" INTEGER,
    "preferredExperienceYears" INTEGER,
    "education" TEXT,
    "industry" TEXT,
    "deadline" TIMESTAMP(3),
    "datePosted" TIMESTAMP(3),
    "source" TEXT,
    "requiredSkills" TEXT[] NOT NULL DEFAULT '{}',
    "preferredSkills" TEXT[] NOT NULL DEFAULT '{}',
    "requirements" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_analyses" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "fitScore" INTEGER NOT NULL,
    "competitiveness" TEXT NOT NULL,
    "recommendation" "RecommendationType" NOT NULL,
    "recommendationReasoning" TEXT NOT NULL,
    "scoreBreakdown" JSONB NOT NULL,
    "strengths" JSONB NOT NULL DEFAULT '[]',
    "weaknesses" JSONB NOT NULL DEFAULT '[]',
    "gaps" JSONB NOT NULL DEFAULT '[]',
    "mandatoryRequirements" JSONB NOT NULL DEFAULT '[]',
    "preferredRequirements" JSONB NOT NULL DEFAULT '[]',
    "risks" JSONB NOT NULL DEFAULT '[]',
    "improvements" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "job_analyses_jobId_key" ON "job_analyses"("jobId");

-- CreateIndex
CREATE INDEX "jobs_userId_idx" ON "jobs"("userId");

-- CreateIndex
CREATE INDEX "job_analyses_userId_idx" ON "job_analyses"("userId");

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_analyses" ADD CONSTRAINT "job_analyses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_analyses" ADD CONSTRAINT "job_analyses_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
