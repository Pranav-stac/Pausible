import fs from "fs";
const p = "pausibl-landing (2).html";
const t = fs.readFileSync(p, "utf8");
const idx = t.indexOf('"<!DOCTYPE html>');
if (idx === -1) {
  console.error("not found");
  process.exit(1);
}
let depth = 0;
let end = -1;
for (let i = idx; i < t.length; i++) {
  if (t[i] === '"' && t[i - 1] !== "\\") {
    if (depth === 0) depth = 1;
    else {
      end = i;
      break;
    }
  }
}
const raw = t.slice(idx, end + 1);
const html = JSON.parse(raw);
fs.writeFileSync(".tmp-ref-landing.html", html);
console.log("written", html.length);
