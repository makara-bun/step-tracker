// Turns the old Go app's steps.db into a backup file the browser app can restore.
// It only reads the database. The file it writes is personal data, so it's ignored by git
// and kept out of docs/, which is the folder that gets published.
import { execFileSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { parseBackup } from "../docs/js/store.js";

const DB = process.argv[2] ?? "steps.db";
const OUT = process.argv[3] ?? "my-steps-backup.json";

if (!existsSync(DB)) {
  console.error(`Can't find ${DB}.`);
  process.exit(1);
}

function query(sql) {
  const out = execFileSync("sqlite3", ["-readonly", "-json", DB, sql], { encoding: "utf8" });
  return out.trim() ? JSON.parse(out) : [];
}

const steps = {};
for (const row of query("SELECT day, steps FROM steps WHERE steps > 0")) steps[row.day] = row.steps;

const settings = Object.fromEntries(query("SELECT key, value FROM settings").map((row) => [row.key, row.value]));

const text = `${JSON.stringify({
  app: "pip-steps",
  version: 1,
  exportedAt: new Date().toISOString(),
  goal: settings.goal,
  walker: settings.walker,
  steps,
}, null, 2)}\n`;

// Checks it with the same code the app will use to read it.
const backup = parseBackup(text);
writeFileSync(OUT, text);
console.log(`Wrote ${OUT}: ${backup.days} days, ${backup.totalSteps} steps.`);
