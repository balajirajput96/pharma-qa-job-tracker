import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const manifestPath = resolve(process.cwd(), "automation", "manifest.json");
const forbiddenKeyPattern =
  /(?:api[_-]?key|token|secret|password|cookie|session|oauth|authorization|bearer)/i;

function inspect(value: unknown, path = "$"): string[] {
  if (Array.isArray(value))
    return value.flatMap((item, index) => inspect(item, `${path}[${index}]`));
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(
      ([key, item]) => {
        const current = forbiddenKeyPattern.test(key)
          ? [`Forbidden secret-like key at ${path}.${key}`]
          : [];
        return [...current, ...inspect(item, `${path}.${key}`)];
      }
    );
  }
  return [];
}

try {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const violations = inspect(manifest);
  if (violations.length > 0) throw new Error(violations.join("; "));
  console.log(
    JSON.stringify({
      status: "ok",
      manifest: "automation/manifest.json",
      redaction: "validated",
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
