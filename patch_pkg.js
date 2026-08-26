const fs = require('fs');
let pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

pkg.allowScripts = {
  "@prisma/engines": true,
  "esbuild": true,
  "prisma": true,
  "unrs-resolver": true
};

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
