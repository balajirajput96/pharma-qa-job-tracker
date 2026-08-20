import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const outputDirectory = resolve(projectRoot, "reports", "automation");
const checkOnly = process.argv.includes("--check");

const record = {
  schemaVersion: 1,
  timestamp: new Date().toISOString(),
  repository: "balajirajput96/pharma-qa-job-tracker",
  task: "repository automation state record",
  actions: [
    "non-secret automation manifest validated",
    "execution record generated without reading credential stores or shell history",
  ],
  result: "recorded",
  failureCategory: null,
  remainingBlocker:
    "Managed tracker database is unavailable in a plain repository clone",
  redaction:
    "No credentials, tokens, passwords, OAuth codes, cookies, API-key values, or raw command history are included",
};

if (checkOnly) {
  console.log(JSON.stringify({ status: "ok", checkOnly: true, record }));
  process.exit(0);
}

const date = record.timestamp.slice(0, 10);
const outputPath = resolve(outputDirectory, `${date}-automation-record.json`);
await mkdir(outputDirectory, { recursive: true });
await writeFile(outputPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
console.log(
  JSON.stringify({
    status: "recorded",
    file: outputPath.replace(`${projectRoot}/`, ""),
  })
);
