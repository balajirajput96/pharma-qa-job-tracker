import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const researchRoot = join(process.cwd(), "reports", "research");
const requiredColumns = [
  "company",
  "job_title",
  "location",
  "source_url",
  "two_year_match",
];

async function collectCsvFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async entry => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return collectCsvFiles(path);
      return entry.isFile() && entry.name.endsWith(".csv") ? [path] : [];
    })
  );
  return nested.flat();
}

try {
  const csvFiles = await collectCsvFiles(researchRoot);
  if (csvFiles.length === 0)
    throw new Error(
      "No versioned research CSV files found under reports/research"
    );

  const checked = [] as string[];
  for (const file of csvFiles) {
    const [header = ""] = (await readFile(file, "utf8")).split(/\r?\n/, 1);
    const columns = header
      .split(",")
      .map(value => value.trim().replace(/^"|"$/g, ""));
    const missing = requiredColumns.filter(column => !columns.includes(column));
    if (missing.length > 0)
      throw new Error(
        `${file} is missing required columns: ${missing.join(", ")}`
      );
    checked.push(file.replace(`${process.cwd()}/`, ""));
  }

  console.log(
    JSON.stringify({
      status: "ok",
      checkedCsvFiles: checked.length,
      files: checked,
    })
  );
} catch (error) {
  console.error(
    JSON.stringify({
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
    })
  );
  process.exit(1);
}
