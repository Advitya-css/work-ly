-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('PDF', 'DOCX');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('UPLOADED', 'PARSING', 'PARSED', 'FAILED');

-- CreateEnum
CREATE TYPE "DataSource" AS ENUM ('CV', 'USER', 'PROJECT', 'CERTIFICATION', 'AI_INFERENCE');

-- CreateEnum
CREATE TYPE "SkillCategory" AS ENUM ('TECHNICAL', 'SOFT', 'DOMAIN', 'TOOL', 'LANGUAGE', 'OTHER');

-- CreateEnum
CREATE TYPE "SkillProficiency" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');

-- CreateEnum
CREATE TYPE "SkillExperienceLevel" AS ENUM ('UNDER_1_YEAR', 'ONE_TO_3_YEARS', 'THREE_TO_5_YEARS', 'FIVE_PLUS_YEARS');

-- CreateEnum
CREATE TYPE "SkillEvidenceLevel" AS ENUM ('STATED', 'DEMONSTRATED', 'CERTIFIED', 'INFERRED');

-- CreateEnum
CREATE TYPE "SkillRecency" AS ENUM ('CURRENT', 'WITHIN_1_YEAR', 'WITHIN_3_YEARS', 'OVER_3_YEARS', 'UNKNOWN');

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" "DocumentType" NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'UPLOADED',
    "errorMessage" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "parsedAt" TIMESTAMP(3),

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "educations" (
    "id" TEXT NOT NULL,
    "careerProfileId" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "degree" TEXT,
    "fieldOfStudy" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "description" TEXT,
    "source" "DataSource" NOT NULL DEFAULT 'USER',
    "isUncertain" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "educations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experiences" (
    "id" TEXT NOT NULL,
    "careerProfileId" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "location" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "source" "DataSource" NOT NULL DEFAULT 'USER',
    "isUncertain" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "experiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "careerProfileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "description" TEXT,
    "url" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "source" "DataSource" NOT NULL DEFAULT 'USER',
    "isUncertain" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" TEXT NOT NULL,
    "careerProfileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "SkillCategory" NOT NULL DEFAULT 'OTHER',
    "proficiency" "SkillProficiency",
    "experienceLevel" "SkillExperienceLevel",
    "evidenceLevel" "SkillEvidenceLevel" NOT NULL DEFAULT 'STATED',
    "source" "DataSource" NOT NULL DEFAULT 'USER',
    "recency" "SkillRecency" NOT NULL DEFAULT 'UNKNOWN',
    "isTransferable" BOOLEAN NOT NULL DEFAULT false,
    "transferableRationale" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievements" (
    "id" TEXT NOT NULL,
    "careerProfileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3),
    "source" "DataSource" NOT NULL DEFAULT 'USER',
    "isUncertain" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certifications" (
    "id" TEXT NOT NULL,
    "careerProfileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "issuer" TEXT,
    "issueDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "credentialUrl" TEXT,
    "source" "DataSource" NOT NULL DEFAULT 'USER',
    "isUncertain" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "documents_userId_idx" ON "documents"("userId");

-- CreateIndex
CREATE INDEX "educations_careerProfileId_idx" ON "educations"("careerProfileId");

-- CreateIndex
CREATE INDEX "experiences_careerProfileId_idx" ON "experiences"("careerProfileId");

-- CreateIndex
CREATE INDEX "projects_careerProfileId_idx" ON "projects"("careerProfileId");

-- CreateIndex
CREATE INDEX "skills_careerProfileId_idx" ON "skills"("careerProfileId");

-- CreateIndex
CREATE INDEX "achievements_careerProfileId_idx" ON "achievements"("careerProfileId");

-- CreateIndex
CREATE INDEX "certifications_careerProfileId_idx" ON "certifications"("careerProfileId");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "educations" ADD CONSTRAINT "educations_careerProfileId_fkey" FOREIGN KEY ("careerProfileId") REFERENCES "career_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiences" ADD CONSTRAINT "experiences_careerProfileId_fkey" FOREIGN KEY ("careerProfileId") REFERENCES "career_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_careerProfileId_fkey" FOREIGN KEY ("careerProfileId") REFERENCES "career_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skills" ADD CONSTRAINT "skills_careerProfileId_fkey" FOREIGN KEY ("careerProfileId") REFERENCES "career_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_careerProfileId_fkey" FOREIGN KEY ("careerProfileId") REFERENCES "career_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_careerProfileId_fkey" FOREIGN KEY ("careerProfileId") REFERENCES "career_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
