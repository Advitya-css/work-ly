const fs = require('fs');
let code = fs.readFileSync('src/lib/dream-job/gap-engine.ts', 'utf8');

const target = `  // Generic Fallback
  return {
    project: \`Execute an End-to-End \${ind}-focused Capstone demonstrating \${label}\`,`;

const replacement = `  // Retail, Hospitality & Service Industry
  if (["customer service", "retail", "hospitality", "barista", "food service", "shift lead", "inventory", "merchandising", "pos", "point of sale", "cash handling"].some((k) => n.includes(k))) {
    return {
      project: \`Demonstrate \${label} in a \${ind} Environment\`,
      deliverables: [
        \`Phase 1 (Knowledge): Complete a relevant short course or certification (e.g., ServSafe, Conflict Resolution, or Inventory Management)\`,
        \`Phase 2 (Shadowing/Practice): Shadow a shift lead or volunteer for a shift that explicitly requires you to handle \${label}\`,
        \`Phase 3 (Documentation): Document an instance where you successfully used \${label} to resolve a customer complaint, improve efficiency, or train a peer\`,
        \`Phase 4 (Resume Integration): Add a bullet point to your resume quantifying the result (e.g., "Increased shift efficiency by 15% using \${label}")\`
      ],
      skillsDemonstrated: [skillName, "Customer Experience", "Operational Efficiency"],
    };
  }

  // Generic Fallback
  return {
    project: \`Execute an End-to-End \${ind}-focused Capstone demonstrating \${label}\`,`

code = code.replace(target, replacement);

// Also add some retail keywords to low/medium difficulty so they aren't marked as "HIGH" by accident.
const lowDiffTarget = `const LOW_DIFFICULTY_SKILL_KEYWORDS = [
  "communication", "leadership", "presentation", "collaboration", "stakeholder",`;
const lowDiffReplacement = `const LOW_DIFFICULTY_SKILL_KEYWORDS = [
  "communication", "leadership", "presentation", "collaboration", "stakeholder",
  "customer service", "retail", "cashier", "cash handling", "barista", "point of sale", "pos", "merchandising", "inventory",`;
code = code.replace(lowDiffTarget, lowDiffReplacement);

fs.writeFileSync('src/lib/dream-job/gap-engine.ts', code);
