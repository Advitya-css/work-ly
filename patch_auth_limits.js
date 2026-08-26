const fs = require('fs');

let code = fs.readFileSync('src/lib/auth/actions.ts', 'utf8');

code = code.replace(
  'checkRateLimit(`auth_${ip}`, 5, 60)',
  'checkRateLimit(`auth_login_${ip}`, 5, 60)'
);

code = code.replace(
  'checkRateLimit(`auth_${ip}`, 5, 60)',
  'checkRateLimit(`auth_signup_${ip}`, 5, 60)'
);

code = code.replace(
  'checkRateLimit(`auth_${ip}`, 3, 300)',
  'checkRateLimit(`auth_forgot_${ip}`, 3, 300)'
);

code = code.replace(
  'checkRateLimit(`auth_${ip}`, 5, 60)',
  'checkRateLimit(`auth_reset_${ip}`, 5, 60)'
);

code = code.replace(
  'checkRateLimit(`auth_${ip}`, 3, 300)',
  'checkRateLimit(`auth_resend_${ip}`, 3, 300)'
);

code = code.replace(
  'checkRateLimit(`auth_${ip}`, 10, 600)',
  'checkRateLimit(`auth_verify_${ip}`, 10, 600)'
);

fs.writeFileSync('src/lib/auth/actions.ts', code);
