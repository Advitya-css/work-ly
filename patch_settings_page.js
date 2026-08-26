const fs = require('fs');
let code = fs.readFileSync('src/app/(app)/settings/page.tsx', 'utf8');

const importTarget = `import { LocationSettingsForm } from "@/components/settings/location-settings-form";`;
const importReplacement = `import { LocationSettingsForm } from "@/components/settings/location-settings-form";
import { PartTimeSettingsForm } from "@/components/settings/part-time-settings-form";`;
code = code.replace(importTarget, importReplacement);

const cardTarget = `      <Card>
        <CardHeader>
          <CardTitle>Locations</CardTitle>`;
const cardReplacement = `      <Card>
        <CardHeader>
          <CardTitle>Part-Time Preferences</CardTitle>
          <CardDescription>
            Optimize the discovery and scoring engines for part-time, hourly, and shift work.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PartTimeSettingsForm profile={profile} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Locations</CardTitle>`;
code = code.replace(cardTarget, cardReplacement);

fs.writeFileSync('src/app/(app)/settings/page.tsx', code);
