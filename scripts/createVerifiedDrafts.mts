import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createVerifiedContactDraftsForSources } from "../server/db.ts";

const userFlag = process.argv.indexOf("--user-id");
const userId = userFlag >= 0 ? Number(process.argv[userFlag + 1]) : Number.NaN;
const inputPath = resolve(process.argv[userFlag + 2] ?? "/home/ubuntu/fresh_verified_pharma_qa_vacancies_2026-08-17.csv");
if (!Number.isInteger(userId) || userId <= 0) throw new Error("Use --user-id <existing tracker user id>. This command only creates approvalStatus: draft records.");

function sourceUrlsFromCsv(text: string) {
  const urls = new Set<string>();
  for (const match of text.matchAll(/https?:\/\/[^,\s"]+/g)) {
    if (/^https?:\/\//i.test(match[0])) urls.add(match[0]);
  }
  return Array.from(urls);
}

const result = await createVerifiedContactDraftsForSources(userId, sourceUrlsFromCsv(await readFile(inputPath, "utf8")));
console.log(JSON.stringify({ inputPath, ...result, approvalStatus: "draft" }));
