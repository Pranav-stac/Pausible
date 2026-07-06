import fs from "node:fs";

const s = fs.readFileSync("pausibl-landing (2).html", "utf8");
const m = s.match(/script type="__bundler\/template"[^>]*>([\s\S]*?)<\/script>/);
if (!m) process.exit(1);
let t = JSON.parse(m[1]);
t = t.replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, "[uuid]");

const sections = [...t.matchAll(/data-screen-label="([^"]+)"/g)].map((x) => x[1]);
console.log("SECTIONS:", sections.join(" | "));

const anchors = [...t.matchAll(/data-comment-anchor="([^"]+)"/g)].map((x) => x[1]);
console.log("ANCHORS:", anchors.join(" | "));

if (process.argv.includes("--how")) {
  const idx = t.indexOf('data-screen-label="How It Works"');
  console.log(t.slice(idx, idx + 12000).replace(/\s+/g, " "));
  process.exit(0);
}

for (const label of sections) {
  const re = new RegExp(`data-screen-label="${label}"[\\s\\S]{0,3500}`);
  const hit = t.match(re);
  if (hit) {
    console.log(`\n===== ${label} =====\n`);
    console.log(hit[0].replace(/\s+/g, " ").slice(0, 2800));
  }
}
