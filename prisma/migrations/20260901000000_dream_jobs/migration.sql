-- CreateEnum
CREATE TYPE "DreamJobStatus" AS ENUM ('PARSING', 'PARSED', 'FAILED');

-- CreateTable
CREATE TABLE "dream_jobs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dreamRole" TEXT NOT NULL,
    "companyName" TEXT,
    "portfolio" TEXT,
    "rawInput" TEXT NOT NULL,
    "status" "DreamJobStatus" NOT NULL DEFAULT 'PARSING',
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
    "requiredSkills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferredSkills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requirements" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dream_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dream_job_analyses" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dreamJobId" TEXT NOT NULL,
    "readinessScore" INTEGER NOT NULL,
    "competitiveness" TEXT NOT NULL,
    "scoreBreakdown" JSONB NOT NULL,
    "strengths" JSONB NOT NULL DEFAULT '[]',
    "weaknesses" JSONB NOT NULL DEFAULT '[]',
    "gaps" JSONB NOT NULL DEFAULT '[]',
    "mandatoryRequirements" JSONB NOT NULL DEFAULT '[]',
    "preferredRequirements" JSONB NOT NULL DEFAULT '[]',
    "gapPriorities" JSONB NOT NULL DEFAULT '[]',
    "cvImprovements" JSONB NOT NULL DEFAULT '[]',
    "keepAsIs" JSONB NOT NULL DEFAULT '[]',
    "improvementPlan" JSONB NOT NULL DEFAULT '[]',
    "projectRecommendations" JSONB NOT NULL DEFAULT '[]',
    "biggestObstacles" JSONB NOT NULL DEFAULT '[]',
    "highestImpactNextStep" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dream_job_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dream_jobs_userId_idx" ON "dream_jobs"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "dream_job_analyses_dreamJobId_key" ON "dream_job_analyses"("dreamJobId");

-- CreateIndex
CREATE INDEX "dream_job_analyses_userId_idx" ON "dream_job_analyses"("userId");

-- AddForeignKey
ALTER TABLE "dream_jobs" ADD CONSTRAINT "dream_jobs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dream_job_analyses" ADD CONSTRAINT "dream_job_analyses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dream_job_analyses" ADD CONSTRAINT "dream_job_analyses_dreamJobId_fkey" FOREIGN KEY ("dreamJobId") REFERENCES "dream_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
