const fs = require('fs');
let code = fs.readFileSync('src/app/(app)/settings/page.tsx', 'utf8');

if (!code.includes('FreelanceSettingsForm')) {
  code = code.replace(
    'import { PartTimeSettingsForm } from "@/components/settings/part-time-settings-form";',
    'import { PartTimeSettingsForm } from "@/components/settings/part-time-settings-form";\nimport { FreelanceSettingsForm } from "@/components/settings/freelance-settings-form";'
  );

  const freelanceSection = `
      <Card>
        <CardHeader>
          <CardTitle>Freelance & Gig Economy</CardTitle>
          <CardDescription>Tailor Workly for musicians, contractors, and freelancers.</CardDescription>
        </CardHeader>
        <CardContent>
          <FreelanceSettingsForm isFreelanceMode={profile?.isFreelanceMode ?? false} />
        </CardContent>
      </Card>
`;
  
  code = code.replace(
    '<PartTimeSettingsForm isPartTimeMode={profile?.isPartTimeMode ?? false} availability={profile?.availability ?? ""} />\n        </CardContent>\n      </Card>',
    '<PartTimeSettingsForm isPartTimeMode={profile?.isPartTimeMode ?? false} availability={profile?.availability ?? ""} />\n        </CardContent>\n      </Card>\n' + freelanceSection
  );
  
  fs.writeFileSync('src/app/(app)/settings/page.tsx', code);
}
