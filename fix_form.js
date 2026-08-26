const fs = require('fs');
let code = fs.readFileSync('src/components/settings/part-time-settings-form.tsx', 'utf8');

code = code.replace('const typedProfile = profile as any;', '');
code = code.replace(/typedProfile\?/g, 'profile?');

fs.writeFileSync('src/components/settings/part-time-settings-form.tsx', code);
