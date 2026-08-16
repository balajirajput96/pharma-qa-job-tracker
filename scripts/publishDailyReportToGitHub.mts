import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { exportDailyVacancyCsv, recordGitHubPublishOutcome } from "../server/db.ts";

const projectRoot = resolve(import.meta.dirname, "..");
const date = process.env.REPORT_PUBLISH_DATE ?? new Date().toISOString().slice(0, 10);
const relativeReportPath = `reports/pharma-qa-daily-report-${date}.csv`;
const targetPath = resolve(projectRoot, relativeReportPath);
const dryRun = process.env.REPORT_PUBLISH_DRY_RUN === "1";

function git(args: string[]) {
  return execFileSync("git", args, { cwd: projectRoot, encoding: "utf8" }).trim();
}

try {
  await mkdir(resolve(projectRoot, "reports"), { recursive: true });
  await writeFile(targetPath, await exportDailyVacancyCsv(), "utf8");
  const changed = git(["status", "--porcelain", "--", relativeReportPath]);
  if (!changed) {
    await recordGitHubPublishOutcome("no_changes", relativeReportPath);
    console.log(JSON.stringify({ status: "no_changes", report: relativeReportPath, remote: "github/main" }));
    process.exit(0);
  }

  git(["add", relativeReportPath]);
  if (dryRun) {
    git(["reset", "--", relativeReportPath]);
    await recordGitHubPublishOutcome("dry_run", relativeReportPath, "Verified changed-file staging; commit and push skipped by dry-run mode.");
    console.log(JSON.stringify({ status: "dry_run", report: relativeReportPath, remote: "github/main" }));
    process.exit(0);
  }
  git(["commit", "-m", `Publish pharma QA daily report ${date}`]);
  git(["push", "github", "main"]);
  await recordGitHubPublishOutcome("pushed", relativeReportPath);
  console.log(JSON.stringify({ status: "pushed", report: relativeReportPath, remote: "github/main" }));
  process.exit(0);
} catch (error) {
  const detail = error instanceof Error ? error.message : String(error);
  await recordGitHubPublishOutcome("failed", relativeReportPath, detail);
  console.error(JSON.stringify({ status: "failed", report: relativeReportPath, remote: "github/main", error: detail }));
  process.exit(1);
}
