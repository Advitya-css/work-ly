const fs = require('fs');

// In nav-config.ts
let navCode = fs.readFileSync('src/lib/nav-config.ts', 'utf8');
navCode = navCode.replace('{ label: "Career path", href: "/career-path", icon: IconPathway }', '{ label: "Action Plan", href: "/career-path", icon: IconPathway }');
fs.writeFileSync('src/lib/nav-config.ts', navCode);

// In career-path/page.tsx
let pageCode = fs.readFileSync('src/app/(app)/career-path/page.tsx', 'utf8');
pageCode = pageCode.replace('title: "Career Path"', 'title: "Action Plan"');
pageCode = pageCode.replace('title="Career Path"', 'title="Action Plan"');
pageCode = pageCode.replace('description="A practical, ordered pathway from where you are now to where you want to be."', 'description="A specific, premium 30/60/90 day curriculum to close your skill gaps."');
pageCode = pageCode.replace('generate a career pathway', 'generate an action plan');
pageCode = pageCode.replace('Your 30/60/90 plan', 'Your 30/60/90 Action Plan');
fs.writeFileSync('src/app/(app)/career-path/page.tsx', pageCode);

// In components/pathway/generate-pathway-button.tsx
let btnCode = fs.readFileSync('src/components/pathway/generate-pathway-button.tsx', 'utf8');
btnCode = btnCode.replace('Generate pathway', 'Generate Action Plan');
btnCode = btnCode.replace('Regenerate pathway', 'Regenerate Action Plan');
fs.writeFileSync('src/components/pathway/generate-pathway-button.tsx', btnCode);
