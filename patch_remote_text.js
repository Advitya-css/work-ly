const fs = require('fs');
let code = fs.readFileSync('src/components/settings/location-settings-form.tsx', 'utf8');

code = code.replace(
  'When this is on, a remote role always counts as matching your locations, wherever it is\n            based.',
  'Remote roles will automatically count as a location match.'
);

fs.writeFileSync('src/components/settings/location-settings-form.tsx', code);
