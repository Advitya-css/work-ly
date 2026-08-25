const fs = require('fs');
let code = fs.readFileSync('src/lib/ai/providers/job-ai.ts', 'utf8');

const target = `4. CRITICAL: "requiredSkills" and "preferredSkills" MUST be atomic technologies, frameworks, methodologies, and hard skills (e.g. "React", "Node.js", "REST APIs", "Microservices", "Docker", "Agile"). DO NOT extract full sentences or vague phrases like "Build scalable backends". Break down complex requirements into the specific keywords a recruiter would search for.`;

const replacement = `4. CRITICAL: "requiredSkills" and "preferredSkills" MUST be atomic technologies, tools, methodologies, or core competencies (e.g. "React", "Docker", "Customer Service", "Point of Sale", "Inventory Management"). DO NOT extract full sentences or vague phrases. Break down complex requirements into the specific, short keywords a recruiter would search for.`;

code = code.replace(target, replacement);
fs.writeFileSync('src/lib/ai/providers/job-ai.ts', code);
