const fs = require('fs');
let code = fs.readFileSync('src/lib/jobs/analyze-job.ts', 'utf8');

const interfaceTarget = `export interface SubmitJobInput {
  inputMethod: JobInputMethod;
  /** Raw pasted text (PASTED_TEXT) or the URL to fetch (URL). */
  text?: string;
  url?: string;
}`;
const interfaceReplacement = `export interface SubmitJobInput {
  inputMethod: JobInputMethod;
  /** Raw pasted text (PASTED_TEXT) or the URL to fetch (URL). */
  text?: string;
  url?: string;
  skipAuthenticityCheck?: boolean;
}`;
code = code.replace(interfaceTarget, interfaceReplacement);

const checkTarget = `  // Is this actually a job posting? A blank page, a cookie banner scraped
  // from a URL, or an accidental paste would otherwise be parsed into a
  // job with no requirements, and every profile then scored against it
  // would produce confident numbers about nothing.
  const authenticity = checkAuthenticity(rawInput, "job-posting");
  if (authenticity.verdict === "reject") {
    return { error: authenticity.message };
  }`;
const checkReplacement = `  // Is this actually a job posting? A blank page, a cookie banner scraped
  // from a URL, or an accidental paste would otherwise be parsed into a
  // job with no requirements, and every profile then scored against it
  // would produce confident numbers about nothing.
  if (!input.skipAuthenticityCheck) {
    const authenticity = checkAuthenticity(rawInput, "job-posting");
    if (authenticity.verdict === "reject") {
      return { error: authenticity.message };
    }
  }`;
code = code.replace(checkTarget, checkReplacement);

fs.writeFileSync('src/lib/jobs/analyze-job.ts', code);
