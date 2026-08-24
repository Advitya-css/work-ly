const fs = require('fs');
let code = fs.readFileSync('src/middleware.ts', 'utf8');
code = code.replace('export async function proxy', 'export async function middleware');
fs.writeFileSync('src/middleware.ts', code);
