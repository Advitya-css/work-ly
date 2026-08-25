const fs = require('fs');

let code = fs.readFileSync('src/lib/chat/actions.ts', 'utf8');

const target = `const CAREER_WORDS = [
  "job", "role", "career", "cv", "resume", "skill", "interview", "apply", "application",
  "salary", "hire", "hiring", "employer", "recruit", "score", "fit", "priority", "gap",
  "profile", "goal", "path", "opportunit", "workly", "experience", "qualification",
  "cover letter", "portfolio", "promotion", "industry", "seniority", "offer", "reject",
  "discover", "search", "company", "work", "employment", "internship", "graduate",
  "reference", "linkedin", "networking", "negotiat", "notice period", "contract",
];`;

const replacement = `const CAREER_WORDS = [
  "job", "role", "career", "cv", "resume", "skill", "interview", "apply", "application",
  "salary", "hire", "hiring", "employer", "recruit", "score", "fit", "priority", "gap",
  "profile", "goal", "path", "opportunit", "workly", "experience", "qualification",
  "cover letter", "portfolio", "promotion", "industry", "seniority", "offer", "reject",
  "discover", "search", "company", "work", "employment", "internship", "graduate",
  "reference", "linkedin", "networking", "negotiat", "notice period", "contract",
  "location", "setting", "preference", "remote", "hybrid", "onsite", "education", 
  "degree", "school", "university", "college", "project", "certification", "dashboard",
  "account", "password", "email", "name", "delete", "edit", "update", "change"
];`;

code = code.replace(target, replacement);

fs.writeFileSync('src/lib/chat/actions.ts', code);
