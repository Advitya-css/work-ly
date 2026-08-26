const fs = require('fs');
let code = fs.readFileSync('src/app/(app)/dashboard/page.tsx', 'utf8');

code = code.replace(
  '<span className="font-medium text-foreground">\n                    {discoveryBuckets.applyNow[0].title}\n                  </span>',
  '<span className="font-medium text-foreground break-words">\n                    {discoveryBuckets.applyNow[0].title}\n                  </span>'
);

code = code.replace(
  '<p className="text-sm text-muted-foreground">\n                  Top find:{" "}',
  '<p className="text-sm text-muted-foreground line-clamp-2">\n                  Top find:{" "}'
);

fs.writeFileSync('src/app/(app)/dashboard/page.tsx', code);
