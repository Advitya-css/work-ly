-- /p/[id] (the "Share Profile" public page, backed by share-profile-button.tsx)
-- queried career_profiles by id alone, with no consent check - every user's
-- full profile (name, photo, headline, location, employer, university,
-- complete summary, and full experience/education text) was publicly
-- servable to anyone with the link, whether or not that user ever clicked
-- Share, and with no way to turn it back off. isPublic makes sharing an
-- explicit, revocable opt-in: false until the user's own "Share Profile"
-- action sets it true, and the public page now refuses to serve anything
-- where it isn't. Additive and defaulted - existing rows are private by
-- default, matching the safety they had (accidentally) before this column
-- existed.
ALTER TABLE "career_profiles"
  ADD COLUMN IF NOT EXISTS "isPublic" BOOLEAN NOT NULL DEFAULT false;
