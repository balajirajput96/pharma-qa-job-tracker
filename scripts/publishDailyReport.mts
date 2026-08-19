import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { exportDailyVacancyCsv } from "../server/db.ts";

const date = new Date().toISOString().slice(0, 10);
const reportsDirectory = resolve(import.meta.dirname, "..", "reports");
const targetPath = resolve(
  reportsDirectory,
  `pharma-qa-daily-report-${date}.csv`
);

await mkdir(reportsDirectory, { recursive: true });
await writeFile(targetPath, await exportDailyVacancyCsv(), "utf8");
console.log(`Wrote source-cited daily vacancy report: ${targetPath}`);
process.exit(0);
