const fs = require('fs');
let code = fs.readFileSync('src/lib/discovery/sources/api-provider.ts', 'utf8');

const target = `    if (what) params.set("what", what);
    const where = asString(context.config.locationName);
    if (where) params.set("where", where);`;

const replacement = `    if (what) params.set("what", what);
    const where = asString(context.config.locationName);
    if (where) params.set("where", where);
    if (context.isPartTimeMode) {
      params.set("part_time", "1");
    }`;

code = code.replace(target, replacement);
fs.writeFileSync('src/lib/discovery/sources/api-provider.ts', code);
