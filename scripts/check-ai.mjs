#!/usr/bin/env node
/**
 * Checks that live AI is actually working.
 *
 *   npm run check:ai
 *
 * Workly runs fine with no AI at all - it falls back to pattern matching for
 * CV and job parsing. That fallback is deliberate, but it is also silent,
 * which means a misconfigured key looks exactly like a working app that is
 * quietly doing worse work. This script makes the difference visible.
 *
 * It goes further than "is a key set": it makes two real calls, because the
 * two things Workly needs from a provider fail independently. A plain
 * completion can succeed while structured output (response_format) is
 * ignored, and Workly's parsers depend on structured output.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const c = {
  reset: "[0m",
  red: "[31m",
  green: "[32m",
  yellow: "[33m",
  dim: "[2m",
  bold: "[1m",
};

function loadEnvFile(file) {
  const full = path.join(root, file);
  if (!existsSync(full)) return {};
  const out = {};
  for (const line of readFileSync(full, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[trimmed.slice(0, eq).trim()] = value;
  }
  return out;
}

const env = { ...loadEnvFile(".env"), ...loadEnvFile(".env.local"), ...process.env };

const provider = env.AI_PROVIDER ?? "stub";
const apiKey = env.AI_API_KEY ?? "";
const baseUrl = (env.AI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
const model = env.AI_MODEL ?? "gemini-3.5-flash-lite";

console.log("");
console.log(`${c.bold}  WORKLY AI CHECK${c.reset}`);
console.log("");
console.log(`  provider  ${provider}`);
console.log(`  endpoint  ${baseUrl}`);
console.log(`  model     ${model}`);
console.log(`  key       ${apiKey ? `present, ending ...${apiKey.slice(-4)}` : `${c.red}not set${c.reset}`}`);
console.log("");

function fail(message, fix) {
  console.log(`  ${c.red}✗ ${message}${c.reset}`);
  if (fix) {
    console.log("");
    for (const line of fix.split("\n")) console.log(`    ${line}`);
  }
  console.log("");
  process.exit(1);
}

if (provider === "stub") {
  fail(
    "AI is switched off. Workly is using its built-in pattern matching.",
    `Open .env and change this line:\n\n` +
      `  ${c.dim}AI_PROVIDER="stub"${c.reset}\n` +
      `  ${c.green}AI_PROVIDER="openai-compatible"${c.reset}\n\n` +
      `Then run this check again.`,
  );
}

if (!apiKey) {
  fail(
    "No API key, so every AI call will fail and fall back to pattern matching.",
    `Get a key at ${c.bold}https://aistudio.google.com/apikey${c.reset}\n` +
      `then open .env and paste it between the quotes:\n\n` +
      `  ${c.green}AI_API_KEY="paste-your-key-here"${c.reset}\n\n` +
      `Nobody but you ever needs to see that value.`,
  );
}

// Google namespaces its models differently from OpenRouter. Pointing a
// Google AI Studio key at an OpenRouter-style model name (or vice versa) is
// the single most common misconfiguration, and the endpoint's own error for
// it is unhelpful, so say it plainly up front.
const isGoogle = baseUrl.includes("generativelanguage.googleapis.com");
const isOpenRouter = baseUrl.includes("openrouter.ai");
if (isGoogle && model.includes("/")) {
  fail(
    `Google's endpoint does not use vendor-prefixed model names, but AI_MODEL is "${model}".`,
    `Change it to just the model name:\n\n  ${c.green}AI_MODEL="${model.split("/").pop()}"${c.reset}`,
  );
}
if (isOpenRouter && !model.includes("/")) {
  fail(
    `OpenRouter needs a vendor-prefixed model name, but AI_MODEL is "${model}".`,
    `Change it to include the vendor:\n\n  ${c.green}AI_MODEL="google/${model}"${c.reset}`,
  );
}

async function post(body) {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  return { ok: response.ok, status: response.status, text };
}

// --- 1. Can we talk to it at all? -----------------------------------------

process.stdout.write("  1. Reaching the provider ... ");
let result;
try {
  result = await post({
    model,
    messages: [{ role: "user", content: 'Reply with exactly the word: ready' }],
    temperature: 0,
  });
} catch (error) {
  console.log(`${c.red}FAILED${c.reset}`);
  fail(
    `Could not reach ${baseUrl}, ${error.message}`,
    "Check you are online, and that AI_BASE_URL is spelled correctly.",
  );
}

if (!result.ok) {
  console.log(`${c.red}FAILED${c.reset}`);
  const body = result.text.slice(0, 300);
  if (result.status === 401 || result.status === 403) {
    fail(
      `The provider rejected the key (HTTP ${result.status}).`,
      `The key is either wrong, expired, or from a different provider than\n` +
        `AI_BASE_URL points at.\n\n` +
        `Your endpoint is ${isGoogle ? "Google AI Studio" : baseUrl},\n` +
        `so the key must be a ${isGoogle ? "Google AI Studio" : "matching"} key.\n\n` +
        `Provider said: ${body}`,
    );
  }
  if (result.status === 404) {
    fail(
      `The provider does not recognise the model "${model}" (HTTP 404).`,
      `Check the name at https://ai.google.dev/gemini-api/docs/models\n\n` +
        `Provider said: ${body}`,
    );
  }
  if (result.status === 429) {
    fail(
      "Rate limited (HTTP 429). The key works, but you are over quota right now.",
      "Wait a minute and try again, or check your quota in Google AI Studio.",
    );
  }
  fail(`Provider returned HTTP ${result.status}.`, `Provider said: ${body}`);
}

let data;
try {
  data = JSON.parse(result.text);
} catch {
  console.log(`${c.red}FAILED${c.reset}`);
  fail("The provider replied with something that is not JSON.", result.text.slice(0, 300));
}

const reply = data.choices?.[0]?.message?.content?.trim() ?? "";
console.log(`${c.green}OK${c.reset} ${c.dim}(replied "${reply.slice(0, 30)}")${c.reset}`);

// --- 2. Does structured output work? --------------------------------------
// This is the one that actually matters. Workly's CV and job parsers ask for
// JSON matching a schema; a model that ignores response_format returns prose,
// the parse throws, and the app silently falls back to pattern matching -
// looking for all the world like the AI was never configured.

process.stdout.write("  2. Structured output (JSON) ... ");
const structured = await post({
  model,
  temperature: 0,
  messages: [
    {
      role: "user",
      content:
        'Extract the job title and company. Text: "Senior Product Analyst at Meridian Commerce, London."',
    },
  ],
  response_format: {
    type: "json_schema",
    json_schema: {
      name: "job",
      schema: {
        type: "object",
        properties: { title: { type: "string" }, company: { type: "string" } },
        required: ["title", "company"],
        additionalProperties: false,
      },
    },
  },
});

if (!structured.ok) {
  console.log(`${c.yellow}NOT SUPPORTED${c.reset}`);
  console.log("");
  console.log(`  ${c.yellow}! This model accepted a normal request but rejected a schema.${c.reset}`);
  console.log(`    ${c.dim}Workly will keep working, but CV and job parsing will use${c.reset}`);
  console.log(`    ${c.dim}pattern matching rather than the model.${c.reset}`);
  console.log(`    ${c.dim}Provider said: ${structured.text.slice(0, 200)}${c.reset}`);
  console.log("");
  process.exit(1);
}

let parsed;
try {
  const content = JSON.parse(structured.text).choices?.[0]?.message?.content ?? "";
  parsed = JSON.parse(content);
} catch {
  console.log(`${c.yellow}IGNORED${c.reset}`);
  console.log("");
  console.log(`  ${c.yellow}! The model answered, but not as JSON.${c.reset}`);
  console.log(`    ${c.dim}CV and job parsing will fall back to pattern matching.${c.reset}`);
  console.log(`    ${c.dim}Try a different AI_MODEL. Flash-lite models vary here.${c.reset}`);
  console.log("");
  process.exit(1);
}

console.log(`${c.green}OK${c.reset} ${c.dim}(got ${JSON.stringify(parsed)})${c.reset}`);

console.log("");
console.log(`  ${c.green}✓ Live AI is working.${c.reset}`);
console.log(
  `  ${c.dim}Upload a CV or analyse a job and it will be read by the model${c.reset}`,
);
console.log(`  ${c.dim}rather than by pattern matching.${c.reset}`);
console.log("");
