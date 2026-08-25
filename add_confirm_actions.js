const fs = require('fs');

let code = fs.readFileSync('src/lib/career/entity-actions.ts', 'utf8');

const target = `export async function acceptTransferableSkillAction(id: string): Promise<void> {`;

const replacements = `export async function confirmEducationAction(id: string): Promise<void> {
  const user = await requireUser();
  const existing = await educationDb.getEducationById(id);
  if (!existing) return;
  await assertOwnership(user.id, existing.careerProfileId);
  await educationDb.updateEducation(id, existing);
  revalidateProfilePaths();
}

export async function confirmExperienceAction(id: string): Promise<void> {
  const user = await requireUser();
  const existing = await experienceDb.getExperienceById(id);
  if (!existing) return;
  await assertOwnership(user.id, existing.careerProfileId);
  await experienceDb.updateExperience(id, existing);
  revalidateProfilePaths();
}

export async function confirmProjectAction(id: string): Promise<void> {
  const user = await requireUser();
  const existing = await projectDb.getProjectById(id);
  if (!existing) return;
  await assertOwnership(user.id, existing.careerProfileId);
  await projectDb.updateProject(id, existing);
  revalidateProfilePaths();
}

export async function confirmAchievementAction(id: string): Promise<void> {
  const user = await requireUser();
  const existing = await achievementDb.getAchievementById(id);
  if (!existing) return;
  await assertOwnership(user.id, existing.careerProfileId);
  await achievementDb.updateAchievement(id, existing);
  revalidateProfilePaths();
}

export async function confirmCertificationAction(id: string): Promise<void> {
  const user = await requireUser();
  const existing = await certificationDb.getCertificationById(id);
  if (!existing) return;
  await assertOwnership(user.id, existing.careerProfileId);
  await certificationDb.updateCertification(id, existing);
  revalidateProfilePaths();
}

export async function acceptTransferableSkillAction(id: string): Promise<void> {`;

code = code.replace(target, replacements);

fs.writeFileSync('src/lib/career/entity-actions.ts', code);
