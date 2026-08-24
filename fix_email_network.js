const fs = require('fs');

function patchEmailFile(filepath) {
  let code = fs.readFileSync(filepath, 'utf8');

  // Trim API key
  code = code.replace(
    'const apiKey = process.env.RESEND_API_KEY;',
    'const apiKey = (process.env.RESEND_API_KEY || "").trim();'
  );

  // We have multiple fetch calls. I will add a tiny retry wrapper function at the top.
  if (!code.includes('async function fetchWithRetry')) {
    const importRegex = /(import.*?\n)+/m;
    code = code.replace(importRegex, (match) => {
      return match + `\nasync function fetchWithRetry(url: string, options: RequestInit, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fetch(url, options);
    } catch (err: any) {
      if (i === retries) throw err;
      if (err.code !== 'UND_ERR_SOCKET' && err.message !== 'fetch failed') throw err;
      await new Promise(r => setTimeout(r, 500 * (i + 1))); // Exponential backoff
    }
  }
  throw new Error("Unreachable");
}\n`;
    });
  }

  // Replace await fetch( with await fetchWithRetry(
  code = code.replace(/await fetch\("https:\/\/api\.resend\.com\/emails"/g, 'await fetchWithRetry("https://api.resend.com/emails"');

  fs.writeFileSync(filepath, code);
}

patchEmailFile('src/lib/email.ts');
