import fs from "fs";

const csv = fs.readFileSync(
  "C:/Users/Kerwin/Downloads/Bins list v1 - Sheet1.csv",
  "utf8",
);
const lines = csv.trim().split(/\r?\n/).slice(1);
const buckets = [5, 10, 7, 14, 15, 16, 18, 20, 12, 3];

function parseLine(line) {
  const parts = [];
  let cur = "";
  let inQ = false;
  for (const ch of line) {
    if (ch === '"') {
      inQ = !inQ;
      continue;
    }
    if (ch === "," && !inQ) {
      parts.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  parts.push(cur);
  return parts;
}

const items = lines.map((line, i) => {
  const [location, newBins, regularBins, notes = ""] = parseLine(line);
  const slug = location
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const daysAgo = buckets[i % buckets.length];
  const d = new Date("2026-05-20T12:00:00.000Z");
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return {
    id: `bin-${String(i + 1).padStart(3, "0")}`,
    slug,
    location,
    newBins: Number(newBins),
    regularBins: Number(regularBins),
    notes: notes.trim(),
    lastServiceDate: d.toISOString().slice(0, 10),
    active: true,
  };
});

console.log(JSON.stringify(items, null, 2));
