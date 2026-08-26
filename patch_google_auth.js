const fs = require('fs');
const crypto = require('crypto');

let route = fs.readFileSync('src/app/api/auth/google/route.ts', 'utf8');

if (!route.includes('const state =')) {
  route = route.replace(
    'import { NextResponse } from "next/server";',
    'import { NextResponse } from "next/server";\nimport { cookies } from "next/headers";\nimport { randomBytes } from "crypto";'
  );
  
  route = route.replace(
    '  const redirectUri = `${baseUrl}/api/auth/google/callback`;',
    '  const redirectUri = `${baseUrl}/api/auth/google/callback`;\n\n  const state = randomBytes(32).toString("hex");\n  const cookieStore = await cookies();\n  cookieStore.set("oauth_state", state, {\n    httpOnly: true,\n    secure: process.env.NODE_ENV === "production",\n    path: "/",\n    maxAge: 60 * 10 // 10 minutes\n  });\n'
  );
  
  route = route.replace(
    'url.searchParams.set("access_type", "online");',
    'url.searchParams.set("access_type", "online");\n  url.searchParams.set("state", state);'
  );
  
  fs.writeFileSync('src/app/api/auth/google/route.ts', route);
}

let callback = fs.readFileSync('src/app/api/auth/google/callback/route.ts', 'utf8');

if (!callback.includes('const storedState =')) {
  callback = callback.replace(
    'import { NextResponse } from "next/server";',
    'import { NextResponse } from "next/server";\nimport { cookies } from "next/headers";'
  );
  
  callback = callback.replace(
    '  const code = searchParams.get("code");',
    '  const code = searchParams.get("code");\n  const state = searchParams.get("state");\n\n  const cookieStore = await cookies();\n  const storedState = cookieStore.get("oauth_state")?.value;\n\n  if (!storedState || state !== storedState) {\n    return NextResponse.redirect(new URL("/login?error=Invalid+oauth+state", request.url));\n  }\n'
  );
  
  fs.writeFileSync('src/app/api/auth/google/callback/route.ts', callback);
}

