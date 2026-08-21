-- CreateEnum
CREATE TYPE "PathwayStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PathwayItemStatus" AS ENUM ('PENDING', 'COMPLETED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "ActionWindow" AS ENUM ('DAYS_0_30', 'DAYS_31_60', 'DAYS_61_90');

-- CreateTable
CREATE TABLE "career_pathways" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dreamJobId" TEXT,
    "currentStateLabel" TEXT NOT NULL,
    "targetStateLabel" TEXT NOT NULL,
    "startingReadiness" INTEGER NOT NULL,
    "status" "PathwayStatus" NOT NULL DEFAULT 'ACTIVE',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "career_pathways_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pathway_steps" (
    "id" TEXT NOT NULL,
    "pathwayId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "gapType" "GapType",
    "relatedSkill" TEXT,
    "status" "PathwayItemStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "unlockedOpportunityCount" INTEGER NOT NULL DEFAULT 0,
    "unlockedOpportunityIds" JSONB NOT NULL DEFAULT '[]',
    "projectRecommendation" JSONB,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pathway_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pathway_actions" (
    "id" TEXT NOT NULL,
    "pathwayId" TEXT NOT NULL,
    "stepId" TEXT,
    "window" "ActionWindow" NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "estimatedTime" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "expectedImpact" TEXT NOT NULL,
    "relatedSkill" TEXT,
    "relatedTargetJobs" JSONB NOT NULL DEFAULT '[]',
    "status" "PathwayItemStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pathway_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "career_pathways_userId_idx" ON "career_pathways"("userId");

-- CreateIndex
CREATE INDEX "career_pathways_userId_status_idx" ON "career_pathways"("userId", "status");

-- CreateIndex
CREATE INDEX "pathway_steps_pathwayId_idx" ON "pathway_steps"("pathwayId");

-- CreateIndex
CREATE INDEX "pathway_actions_pathwayId_idx" ON "pathway_actions"("pathwayId");

-- CreateIndex
CREATE INDEX "pathway_actions_pathwayId_window_idx" ON "pathway_actions"("pathwayId", "window");

-- AddForeignKey
ALTER TABLE "career_pathways" ADD CONSTRAINT "career_pathways_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "career_pathways" ADD CONSTRAINT "career_pathways_dreamJobId_fkey" FOREIGN KEY ("dreamJobId") REFERENCES "dream_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pathway_steps" ADD CONSTRAINT "pathway_steps_pathwayId_fkey" FOREIGN KEY ("pathwayId") REFERENCES "career_pathways"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pathway_actions" ADD CONSTRAINT "pathway_actions_pathwayId_fkey" FOREIGN KEY ("pathwayId") REFERENCES "career_pathways"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pathway_actions" ADD CONSTRAINT "pathway_actions_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "pathway_steps"("id") ON DELETE SET NULL ON UPDATE CASCADE;
