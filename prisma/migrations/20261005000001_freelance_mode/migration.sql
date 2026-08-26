-- Add Freelance/Gig Mode toggle
ALTER TABLE "career_profiles" ADD COLUMN "isFreelanceMode" BOOLEAN NOT NULL DEFAULT false;
