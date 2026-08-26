const fs = require('fs');

let code = fs.readFileSync('src/components/settings/freelance-settings-form.tsx', 'utf8');

code = code.replace(
  '<div className="flex items-center justify-between gap-4">\n        <div className="flex flex-col gap-1">\n          <Label htmlFor="freelance-mode" className="text-base font-semibold">\n            Gig Economy & Musician Mode\n          </Label>\n          <p className="text-sm text-muted-foreground">\n            Switch terminology from traditional corporate roles (Applied, Interview, Offer) to Gig work (Pitched, Audition, Booked) and tailor the AI coaching to freelancers.\n          </p>\n        </div>',
  '<div className="flex items-center justify-between rounded-lg border p-4">\n        <div className="space-y-0.5">\n          <Label htmlFor="freelance-mode" className="text-base">\n            Enable Gig & Musician Mode\n          </Label>\n          <p className="text-sm text-muted-foreground">\n            Tailor discovery, AI coaching, and pipeline terminology for freelance and gig work.\n          </p>\n        </div>'
);

// We need to close the border p-4 div correctly
// The original was:
// <div className="flex items-center justify-between gap-4">
// ...
//   <Switch ... />
// </div>

// We replaced the opening and first child div, so the closing div of the flex row is unchanged.

fs.writeFileSync('src/components/settings/freelance-settings-form.tsx', code);
