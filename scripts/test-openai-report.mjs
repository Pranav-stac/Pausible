import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(path) {
  const text = readFileSync(path, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(resolve(process.cwd(), ".env"));

const apiKey = process.env.OPENAI_API_KEY?.trim();
const model = process.env.OPENAI_MODEL?.trim() || "gpt-5.4";

if (!apiKey) {
  console.error("FAIL: OPENAI_API_KEY is missing or empty in .env");
  process.exit(1);
}

console.log(`Testing OpenAI Responses API with model: ${model}`);
console.log(`API key present: yes (${apiKey.slice(0, 8)}…)`);

const body = {
  model,
  instructions: "You are a wellness copywriter. Reply with JSON only.",
  input: 'Return JSON: {"status":"ok","provider":"openai","message":"Pausible report test"}',
  max_output_tokens: 120,
  store: false,
  text: { format: { type: "json_object" } },
};

const res = await fetch("https://api.openai.com/v1/responses", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  },
  body: JSON.stringify(body),
});

const raw = await res.text();
if (!res.ok) {
  console.error(`FAIL: HTTP ${res.status}`);
  console.error(raw.slice(0, 500));
  process.exit(1);
}

const data = JSON.parse(raw);
const text =
  data.output_text ??
  data.output
    ?.flatMap((item) => item.content ?? [])
    .find((part) => part.type === "output_text")?.text ??
  "";

console.log("PASS: OpenAI responded");
console.log("output:", text.slice(0, 300));
console.log(
  "tokens:",
  data.usage
    ? `in=${data.usage.input_tokens ?? 0} out=${data.usage.output_tokens ?? 0}`
    : "n/a",
);
