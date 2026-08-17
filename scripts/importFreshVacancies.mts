import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { ingestScheduledVacancies, type ScheduledVacancyInput } from "../server/db.ts";

const defaultInput = "/home/ubuntu/fresh_verified_pharma_qa_vacancies_2026-08-17.csv";
const inputPath = resolve(process.argv[2] ?? defaultInput);

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (quoted && char === '"' && next === '"') {
      field += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (!quoted && char === ",") {
      row.push(field.trim());
      field = "";
    } else if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function publicValue(value: string | undefined) {
  const normalized = (value ?? "").trim();
  return /^(not stated|not disclosed|not publicly listed|n\/a|na)$/i.test(normalized) ? "" : normalized;
}

function routeFor(value: string) {
  if (/walk-?in|virtual walk-?in/i.test(value)) return "walk_in" as const;
  if (/direct vacancy|online application|direct apply/i.test(value)) return "direct" as const;
  return "unverified" as const;
}

function phoneFor(value: string) {
  const match = publicValue(value).match(/\d{10}/);
  return match?.[0] ?? "";
}

const rows = parseCsv(await readFile(inputPath, "utf8"));
const [headers, ...data] = rows;
if (!headers) throw new Error("CSV has no header row");
const records: ScheduledVacancyInput[] = data.map(values => {
  const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  return {
    companyName: publicValue(row.company),
    title: publicValue(row.job_title),
    department: publicValue(row.department),
    location: publicValue(row.location),
    route: routeFor(row.route),
    walkInDateText: publicValue(row.posting_or_walkin_date),
    eligibility: publicValue(row.eligibility),
    salaryText: publicValue(row.salary_ctc),
    publicEmail: publicValue(row.public_hr_or_careers_contact),
    publicPhone: phoneFor(row.public_phone),
    sourceUrl: publicValue(row.source_url),
    twoYearMatch: /^yes$/i.test(publicValue(row.two_year_match)),
  };
}).filter(record => record.companyName && record.title && record.location && /^https?:\/\//i.test(record.sourceUrl));

const added = await ingestScheduledVacancies(records);
console.log(JSON.stringify({ inputPath, parsed: records.length, added }));
