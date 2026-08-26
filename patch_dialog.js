const fs = require('fs');
let code = fs.readFileSync('src/components/applications/new-application-dialog.tsx', 'utf8');

// Add checkbox state
code = code.replace(
  '  const [status, setStatus] = useState<ApplicationStatus>("APPLIED");',
  `  const [status, setStatus] = useState<ApplicationStatus>("APPLIED");
  const [isPartTime, setIsPartTime] = useState(false);`
);

// Modify submit logic
code = code.replace(
  `      const result = await createManualApplicationAction({
        roleTitle,
        company,
        industry,
        location,
        status,
      });`,
  `      const finalRoleTitle = isPartTime ? \`\${roleTitle.trim()} (Part-Time)\` : roleTitle.trim();
      const result = await createManualApplicationAction({
        roleTitle: finalRoleTitle,
        company,
        industry,
        location,
        status,
      });`
);

// Add checkbox UI below the role title input
const targetUI = `          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-app-role">Role title</Label>
            <Input
              id="new-app-role"
              value={roleTitle}
              onChange={(e) => setRoleTitle(e.target.value)}
              placeholder="e.g. Product Analyst"
            />
          </div>`;

const replacementUI = `          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-app-role">Role title</Label>
            <Input
              id="new-app-role"
              value={roleTitle}
              onChange={(e) => setRoleTitle(e.target.value)}
              placeholder="e.g. Product Analyst"
            />
            <div className="flex items-center gap-2 mt-1">
              <input 
                type="checkbox" 
                id="new-app-pt" 
                checked={isPartTime} 
                onChange={(e) => setIsPartTime(e.target.checked)} 
                className="rounded border-gray-300"
              />
              <Label htmlFor="new-app-pt" className="text-xs font-normal">This is a part-time role</Label>
            </div>
          </div>`;

code = code.replace(targetUI, replacementUI);

fs.writeFileSync('src/components/applications/new-application-dialog.tsx', code);
