const fs = require('fs');

let types = fs.readFileSync('src/lib/discovery/types.ts', 'utf8');
if (!types.includes('isFreelanceMode?: boolean')) {
  types = types.replace(
    'isPartTimeMode?: boolean;',
    'isPartTimeMode?: boolean;\n  isFreelanceMode?: boolean;'
  );
  fs.writeFileSync('src/lib/discovery/types.ts', types);
}

let run = fs.readFileSync('src/lib/discovery/run.ts', 'utf8');
if (!run.includes('isFreelanceMode: Boolean(profile?.isFreelanceMode),')) {
  run = run.replace(
    'isPartTimeMode: Boolean(profile?.isPartTimeMode),',
    'isPartTimeMode: Boolean(profile?.isPartTimeMode),\n    isFreelanceMode: Boolean(profile?.isFreelanceMode),'
  );
  fs.writeFileSync('src/lib/discovery/run.ts', run);
}

let apiProvider = fs.readFileSync('src/lib/discovery/sources/api-provider.ts', 'utf8');
if (!apiProvider.includes('context.isFreelanceMode')) {
  apiProvider = apiProvider.replace(
    'if (context.isPartTimeMode) {\n      params.set("part_time", "1");\n    }',
    'if (context.isPartTimeMode) {\n      params.set("part_time", "1");\n    }\n    if (context.isFreelanceMode) {\n      params.set("contract", "1");\n    }'
  );
  
  // Wait, I should also rewrite the `what` if freelance.
  apiProvider = apiProvider.replace(
    'const what = String(context.config.keyword ?? context.query ?? "").trim();',
    'let what = String(context.config.keyword ?? context.query ?? "").trim();\n    if (context.isFreelanceMode) {\n      what = what ? `${what} (freelance OR gig OR contract)` : "freelance OR gig OR contract";\n    }'
  );
  fs.writeFileSync('src/lib/discovery/sources/api-provider.ts', apiProvider);
}
