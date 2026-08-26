const fs = require('fs');
let code = fs.readFileSync('src/components/applications/applications-board.tsx', 'utf8');

code = code.replace(
  '<td className="px-4 py-3 font-medium text-foreground">\n                          {application.roleTitle}\n                        </td>',
  '<td className="px-4 py-3 font-medium text-foreground max-w-[200px] truncate">\n                          {application.roleTitle}\n                        </td>'
);

code = code.replace(
  '<td className="px-4 py-3 text-muted-foreground">\n                          {application.company ?? "-"}\n                        </td>',
  '<td className="px-4 py-3 text-muted-foreground max-w-[150px] truncate">\n                          {application.company ?? "-"}\n                        </td>'
);

fs.writeFileSync('src/components/applications/applications-board.tsx', code);
