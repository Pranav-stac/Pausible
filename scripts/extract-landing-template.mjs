import fs from "node:fs";

const s = fs.readFileSync("pausibl-landing (2).html", "utf8");
const m = s.match(/script type="__bundler\/template"[^>]*>([\s\S]*?)<\/script>/);
if (!m) {
  console.error("no template");
  process.exit(1);
}
let t = JSON.parse(m[1]);
t = t.replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, "[uuid]");
const styles = [...t.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((x) => x[1]);
console.log("template length", t.length);
console.log("style blocks", styles.length);
for (const [i, st] of styles.entries()) {
  console.log(`\n--- STYLE ${i} (${st.length} chars) ---\n`);
  console.log(st.slice(0, 4000));
}
for (const k of [
  "Wellness that fits",
  "backdrop-filter",
  "glass",
  "navbar",
  "Get Started",
  "How it works",
  "Outfit",
  "font-family",
  "#F7F9FB",
  "rounded",
]) {
  const idx = t.indexOf(k);
  if (idx >= 0) {
    console.log(`\n--- HIT: ${k} ---`);
    console.log(t.slice(Math.max(0, idx - 120), idx + 280).replace(/\s+/g, " "));
  }
}
