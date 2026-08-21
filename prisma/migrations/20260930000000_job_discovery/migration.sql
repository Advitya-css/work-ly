-- CreateEnum
CREATE TYPE "JobSourceKind" AS ENUM ('COMPANY_CAREER', 'PUBLIC_JOB_BOARD', 'GOVERNMENT', 'UNIVERSITY', 'EMPLOYER_FEED', 'API_PROVIDER', 'MANUAL_IMPORT', 'DEMO');

-- CreateEnum
CREATE TYPE "JobSourceStatus" AS ENUM ('ACTIVE', 'DISABLED', 'NEEDS_CREDENTIALS', 'ERROR');

-- CreateEnum
CREATE TYPE "DiscoveryRunStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "job_source_configs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "JobSourceKind" NOT NULL,
    "name" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "status" "JobSourceStatus" NOT NULL DEFAULT 'ACTIVE',
    "errorMessage" TEXT,
    "legalBasis" TEXT NOT NULL,
    "lastRunAt" TIMESTAMP(3),
    "lastRunFoundCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_source_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discovered_jobs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceConfigId" TEXT,
    "sourceKind" "JobSourceKind" NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "externalId" TEXT NOT NULL,
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "postedAt" TIMESTAMP(3),
    "title" TEXT NOT NULL,
    "company" TEXT,
    "location" TEXT,
    "country" TEXT,
    "salaryMin" INTEGER,
    "salaryMax" INTEGER,
    "salaryCurrency" TEXT,
    "employmentType" "EmploymentType",
    "workMode" "WorkMode",
    "seniority" "SeniorityLevel",
    "industry" TEXT,
    "description" TEXT,
    "requiredSkills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferredSkills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requirements" JSONB NOT NULL DEFAULT '[]',
    "dedupeKey" TEXT NOT NULL,
    "duplicateOfId" TEXT,
    "embedding" DOUBLE PRECISION[] DEFAULT ARRAY[]::DOUBLE PRECISION[],
    "embeddingModel" TEXT,
    "fitScore" INTEGER,
    "recommendation" "RecommendationType",
    "matchReasons" JSONB NOT NULL DEFAULT '[]',
    "discoveryReason" TEXT,
    "isDismissed" BOOLEAN NOT NULL DEFAULT false,
    "convertedOpportunityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discovered_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discovery_runs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "DiscoveryRunStatus" NOT NULL DEFAULT 'RUNNING',
    "query" TEXT,
    "sourcesRun" INTEGER NOT NULL DEFAULT 0,
    "rawFound" INTEGER NOT NULL DEFAULT 0,
    "duplicatesFolded" INTEGER NOT NULL DEFAULT 0,
    "newJobs" INTEGER NOT NULL DEFAULT 0,
    "newHighPriority" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "discovery_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "job_source_configs_userId_idx" ON "job_source_configs"("userId");

-- CreateIndex
CREATE INDEX "job_source_configs_userId_status_idx" ON "job_source_configs"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "discovered_jobs_userId_externalId_sourceName_key" ON "discovered_jobs"("userId", "externalId", "sourceName");

-- CreateIndex
CREATE INDEX "discovered_jobs_userId_idx" ON "discovered_jobs"("userId");

-- CreateIndex
CREATE INDEX "discovered_jobs_userId_dedupeKey_idx" ON "discovered_jobs"("userId", "dedupeKey");

-- CreateIndex
CREATE INDEX "discovered_jobs_userId_recommendation_idx" ON "discovered_jobs"("userId", "recommendation");

-- CreateIndex
CREATE INDEX "discovery_runs_userId_idx" ON "discovery_runs"("userId");

-- AddForeignKey
ALTER TABLE "job_source_configs" ADD CONSTRAINT "job_source_configs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discovered_jobs" ADD CONSTRAINT "discovered_jobs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discovered_jobs" ADD CONSTRAINT "discovered_jobs_sourceConfigId_fkey" FOREIGN KEY ("sourceConfigId") REFERENCES "job_source_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discovery_runs" ADD CONSTRAINT "discovery_runs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
