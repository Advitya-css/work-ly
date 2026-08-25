const fs = require('fs');

let code = fs.readFileSync('src/app/(app)/dashboard/page.tsx', 'utf8');

// Add import
const importTarget = `import { ProfileCompletenessCard } from "@/components/dashboard/profile-completeness-card";`;
const importReplacement = `import { StaleApplicationsCard } from "@/components/dashboard/stale-applications-card";\nimport { ProfileCompletenessCard } from "@/components/dashboard/profile-completeness-card";`;

code = code.replace(importTarget, importReplacement);

// Render card
const renderTarget = `      <div className="grid gap-6 md:grid-cols-2">
        <ProfileCompletenessCard 
          completeness={profileCompleteness} 
          hasGoals={goals.length > 0} 
        />
        <PathwayProgressCard pathway={pathway} />
      </div>`;

const renderReplacement = `      <StaleApplicationsCard applications={applications} />

      <div className="grid gap-6 md:grid-cols-2">
        <ProfileCompletenessCard 
          completeness={profileCompleteness} 
          hasGoals={goals.length > 0} 
        />
        <PathwayProgressCard pathway={pathway} />
      </div>`;

code = code.replace(renderTarget, renderReplacement);

fs.writeFileSync('src/app/(app)/dashboard/page.tsx', code);
