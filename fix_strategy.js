const fs = require('fs');
let code = fs.readFileSync('src/app/api/applications/[id]/strategy/route.ts', 'utf8');

code = code.replace(
  'Requirements:\\n${job.requirements?.map(r => r.name).join(", ") || job.description || job.title}`;',
  'Requirements:\\n${job.requirements?.map(r => r.text).join("\\n") || job.description || job.title}`;'
);
code = code.replace(
  'Your client is applying for the role of ${app.job?.title ?? app.title} at ${app.company || \'a company\'}.',
  'Your client is applying for the role of ${app.job?.title ?? "a role"} at ${app.company || \'a company\'}.'
);

fs.writeFileSync('src/app/api/applications/[id]/strategy/route.ts', code);
