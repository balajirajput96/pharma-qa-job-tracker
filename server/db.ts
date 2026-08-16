import { and, desc, eq, inArray, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  applicationDrafts,
  applications,
  candidateProfiles,
  companies,
  companyContacts,
  monitoringRuns,
  monitoringSchedules,
  type InsertUser,
  type User,
  users,
  vacancies,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

export const APPLICATION_SUBJECT = "IPQA Officer – 2 Years OSD Tablet Compression Experience";
export const DAILY_MONITORING_CRON = "0 0 3 * * *";
export const GUJARAT_PRIORITY_LOCATIONS = ["Vadodara", "Ahmedabad", "Halol", "Sanand", "Ankleshwar"] as const;
export const APPLICATION_STATUSES = ["to_apply", "applied", "follow_up", "interview_scheduled", "offer", "rejected"] as const;

export function canMarkDraftAsSent(approvalStatus: "draft" | "approved" | "sent" | "cancelled") {
  return approvalStatus === "approved";
}

export function applicationStatusAfterConfirmedSend() {
  return "applied" as const;
}

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    _db = drizzle(process.env.DATABASE_URL);
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = { lastSignedIn: new Date() };
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  values.role = user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user");
  updateSet.role = values.role;
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(users).where(eq(users.openId, openId)).limit(1))[0];
}

type CsvRow = Record<string, string>;

function parseCsv(text: string): CsvRow[] {
  const lines: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(value.trim());
      value = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(value.trim());
      if (row.some(cell => cell.length > 0)) lines.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }
  row.push(value.trim());
  if (row.some(cell => cell.length > 0)) lines.push(row);
  const [headers, ...records] = lines;
  return records.map(record => Object.fromEntries(headers.map((header, index) => [header, record[index] ?? ""])));
}

function publicValue(value: string | undefined) {
  return Boolean(value && value.trim() && !/not publicly verified/i.test(value));
}

function firstUrl(value: string) {
  return value.match(/https?:\/\/[^\s|;,)]+/i)?.[0] ?? "";
}

export function locationPriority(location: string) {
  const normalized = location.toLowerCase();
  if (normalized.includes("vadodara")) return 40;
  if (normalized.includes("ahmedabad")) return 35;
  if (normalized.includes("halol")) return 30;
  if (normalized.includes("sanand")) return 28;
  if (normalized.includes("ankleshwar")) return 25;
  if (normalized.includes("bharuch") || normalized.includes("savli") || normalized.includes("dahej")) return 20;
  if (normalized.includes("gujarat")) return 15;
  return 0;
}

export function inferVacancyLocation(title: string, currentLocation: string) {
  const text = `${title} ${currentLocation}`.toLowerCase();
  const matches: Array<[string, RegExp]> = [
    ["Vadodara, Gujarat", /vadodara/],
    ["Ahmedabad, Gujarat", /ahmedabad|gota|matoda/],
    ["Halol, Gujarat", /halol/],
    ["Sanand, Gujarat", /sanand/],
    ["Ankleshwar, Gujarat", /ankleshwar/],
    ["Bharuch, Gujarat", /bharuch/],
    ["Dahej, Gujarat", /dahej/],
    ["Savli, Gujarat", /savli/],
    ["Gujarat", /gujarat/],
    ["Baddi, Himachal Pradesh", /baddi/],
    ["Goa", /goa|margao/],
    ["Hyderabad, Telangana", /hyderabad/],
    ["Sikkim", /sikkim|rangpo/],
  ];
  return matches.find(([, expression]) => expression.test(text))?.[0] ?? currentLocation;
}

export function inferVacancyRoute(title: string, currentRoute: "walk_in" | "direct" | "unverified") {
  if (currentRoute !== "unverified") return currentRoute;
  return /walk[-\s]?in|walkin/i.test(title) ? "walk_in" : currentRoute;
}

export function scoreVacancy(input: { title: string; eligibility: string; location: string; route: string; twoYearHint: boolean }) {
  const text = `${input.title} ${input.eligibility}`.toLowerCase();
  let score = locationPriority(input.location);
  if (/\bqa\b|quality assurance|ipqa/.test(text)) score += 28;
  if (/tablet|compression|solid oral|\bosd\b|granulation|coating/.test(text)) score += 20;
  if (/1\s*[-–to]+\s*3|2\s*[-–to]+\s*\d|\b2\s*years?\b/.test(text) || input.twoYearHint) score += 10;
  if (input.route === "walk_in") score += 8;
  return Math.min(score, 100);
}

export type RankingProfile = Pick<typeof candidateProfiles.$inferSelect, "experienceYears" | "skills" | "preferredLocations">;

export function scoreVacancyForProfile(
  input: { title: string; eligibility: string; location: string; route: string; twoYearHint: boolean },
  profile: RankingProfile,
) {
  const baseScore = scoreVacancy(input);
  const preferredLocations = profile.preferredLocations.toLowerCase().split(",").map(value => value.trim()).filter(Boolean);
  const locationMatch = preferredLocations.some(location => location.length > 2 && input.location.toLowerCase().includes(location));
  const normalizedSkills = profile.skills.toLowerCase();
  const roleText = `${input.title} ${input.eligibility}`.toLowerCase();
  const skillHits = ["ipqa", "tablet compression", "osd", "gmp"].filter(skill => normalizedSkills.includes(skill) && roleText.includes(skill.split(" ")[0])).length;
  const exactExperience = new RegExp(`\\b${profile.experienceYears}\\s*(?:years?|yrs?)\\b`).test(roleText)
    || new RegExp(`${Math.max(0, profile.experienceYears - 1)}\\s*[-–to]+\\s*${profile.experienceYears + 1}`).test(roleText);
  return Math.min(100, baseScore + (locationMatch ? 10 : 0) + skillHits * 2 + (exactExperience ? 6 : 0));
}

function extractEmails(value: string) {
  return Array.from(new Set(value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? []));
}

function extractPhones(value: string) {
  return Array.from(new Set(value.match(/(?:\+91[\s-]?)?\d{10}/g) ?? []));
}

function vacancyRoute(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.includes("walk")) return "walk_in" as const;
  if (normalized.includes("direct")) return "direct" as const;
  return "unverified" as const;
}

function canonicalCompanyName(name: string) {
  return name
    .replace(/\b(private|pvt|limited|ltd)\.?\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function upsertCompanyFromResearch(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, input: {
  name: string;
  primaryLocation?: string | null;
  careerUrl?: string | null;
  researchNote?: string | null;
  augustWindowStatus?: string | null;
}) {
  const name = canonicalCompanyName(input.name);
  const existing = (await db.select().from(companies).where(eq(companies.name, name)).limit(1))[0];
  if (existing) {
    await db.update(companies).set({
      primaryLocation: input.primaryLocation ?? existing.primaryLocation,
      careerUrl: input.careerUrl ?? existing.careerUrl,
      researchNote: input.researchNote ?? existing.researchNote,
      augustWindowStatus: input.augustWindowStatus ?? existing.augustWindowStatus,
    }).where(eq(companies.id, existing.id));
    return (await db.select().from(companies).where(eq(companies.id, existing.id)).limit(1))[0];
  }
  const result = await db.insert(companies).values({
    name,
    primaryLocation: input.primaryLocation ?? null,
    careerUrl: input.careerUrl ?? null,
    researchNote: input.researchNote ?? null,
    augustWindowStatus: input.augustWindowStatus ?? null,
  });
  return (await db.select().from(companies).where(eq(companies.id, Number(result[0].insertId))).limit(1))[0];
}

async function upsertPublicContacts(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  companyId: number,
  emailValue: string,
  phoneValue: string,
  sourceUrl: string | null,
) {
  for (const email of extractEmails(emailValue)) {
    await db.insert(companyContacts).values({
      companyId,
      contactType: /\bhr\b|recruit|career/i.test(email) ? "hr" : "careers",
      contactValue: email.toLowerCase(),
      sourceUrl,
    }).onDuplicateKeyUpdate({ set: { sourceUrl } });
  }
  for (const phone of extractPhones(phoneValue)) {
    await db.insert(companyContacts).values({
      companyId,
      contactType: "phone",
      contactValue: phone,
      sourceUrl,
    }).onDuplicateKeyUpdate({ set: { sourceUrl } });
  }
}

async function upsertVacancyFromResearch(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  input: {
    companyId: number;
    title: string;
    location: string;
    sourceUrl: string;
    eligibility: string;
    route: "walk_in" | "direct" | "unverified";
    twoYearMatch: boolean;
  },
) {
  const existing = (await db.select().from(vacancies).where(and(
    eq(vacancies.companyId, input.companyId),
    eq(vacancies.title, input.title.slice(0, 255)),
    eq(vacancies.sourceUrl, input.sourceUrl),
  )).limit(1))[0];
  const score = scoreVacancy({
    title: input.title,
    eligibility: input.eligibility,
    location: input.location,
    route: input.route,
    twoYearHint: input.twoYearMatch,
  });
  const values = {
    department: /qa|quality|ipqa/i.test(input.title) ? "QA / IPQA" : null,
    location: input.location,
    employmentRoute: input.route,
    walkInDateText: /august|aug|walk/i.test(input.title) ? input.title.slice(0, 255) : null,
    eligibility: input.eligibility || null,
    salaryText: /salary|ctc|₹|rs\.?/i.test(input.eligibility) ? input.eligibility.slice(0, 500) : null,
    status: "unverified" as const,
    twoYearMatch: input.twoYearMatch,
    locationPriority: locationPriority(input.location),
    matchScore: score,
    updatedAt: new Date(),
  };
  if (existing) {
    await db.update(vacancies).set(values).where(eq(vacancies.id, existing.id));
    return false;
  }
  await db.insert(vacancies).values({
    companyId: input.companyId,
    title: input.title.slice(0, 255),
    sourceUrl: input.sourceUrl,
    ...values,
  });
  return true;
}

export async function seedResearchDirectory() {
  const db = await getDb();
  if (!db) return { companies: 0, vacancies: 0 };
  const [companyCsv, hrCsv] = await Promise.all([
    readFile(join(process.cwd(), "seed", "company_directory_2026_august.csv"), "utf8"),
    readFile(join(process.cwd(), "seed", "hr_careers_directory_2026_august.csv"), "utf8"),
  ]);
  const directoryRows = parseCsv(companyCsv);
  const hrRows = parseCsv(hrCsv);
  type Candidate = { name: string; primaryLocation: string | null; careerUrl: string | null; researchNote: string | null; augustWindowStatus: string | null; emails: string[]; phones: string[]; sourceUrl: string | null };
  type VacancyCandidate = { companyName: string; title: string; location: string; sourceUrl: string; eligibility: string; route: "walk_in" | "direct" | "unverified"; twoYearMatch: boolean };
  const candidates = new Map<string, Candidate>();
  const vacancyCandidates = new Map<string, VacancyCandidate>();
  const addCandidate = (candidate: Candidate) => {
    const key = canonicalCompanyName(candidate.name);
    const existing = candidates.get(key);
    candidates.set(key, existing ? {
      ...existing,
      primaryLocation: existing.primaryLocation ?? candidate.primaryLocation,
      careerUrl: existing.careerUrl ?? candidate.careerUrl,
      researchNote: existing.researchNote ?? candidate.researchNote,
      augustWindowStatus: existing.augustWindowStatus ?? candidate.augustWindowStatus,
      emails: Array.from(new Set([...existing.emails, ...candidate.emails])),
      phones: Array.from(new Set([...existing.phones, ...candidate.phones])),
      sourceUrl: existing.sourceUrl ?? candidate.sourceUrl,
    } : candidate);
  };
  for (const row of directoryRows) {
    const rawName = row["Company Name"]?.trim();
    if (!rawName) continue;
    const title = row["Job Title / Department (Aug 16-29 where public)"] ?? "";
    const locationInfo = row["Location / Vacancy Info"] ?? "";
    const sourceUrl = firstUrl(row["Official / Public Apply or Contact Source"] ?? "");
    const eligibility = row["Eligibility / Salary"] ?? "";
    const name = canonicalCompanyName(rawName);
    addCandidate({
      name,
      primaryLocation: publicValue(locationInfo) ? locationInfo.slice(0, 255) : null,
      careerUrl: sourceUrl || null,
      researchNote: row["Research Note"] || null,
      augustWindowStatus: publicValue(title) ? title.slice(0, 255) : null,
      emails: extractEmails(row["Public Recruitment / Careers Email"] ?? ""),
      phones: extractPhones(row["Public Phone"] ?? ""),
      sourceUrl: sourceUrl || null,
    });
    if (publicValue(title) && sourceUrl) {
      const location = publicValue(locationInfo) ? locationInfo.slice(0, 255) : "India — see source";
      const vacancy = { companyName: name, title, location, sourceUrl, eligibility, route: vacancyRoute(row["Walk-in or Direct Vacancy"] ?? title), twoYearMatch: /2[-\s–]*year|two-year/i.test(`${title} ${eligibility}`) };
      vacancyCandidates.set(`${name}|${title}|${sourceUrl}`, vacancy);
    }
  }
  for (const row of hrRows) {
    const rawName = row["Company Name"]?.trim();
    if (!rawName) continue;
    const name = canonicalCompanyName(rawName);
    const sourceUrl = firstUrl(row["Public Source URL"] ?? "");
    const role = row["August 16–29 Role / Status"] ?? "";
    const eligibility = row["Eligibility / Salary"] ?? "";
    addCandidate({
      name,
      primaryLocation: null,
      careerUrl: sourceUrl || null,
      researchNote: row["Verification Note"] || null,
      augustWindowStatus: publicValue(role) ? role.slice(0, 255) : null,
      emails: extractEmails(row["Public HR / Careers / Recruitment Email"] ?? ""),
      phones: extractPhones(row["Public Phone Text (if available)"] ?? ""),
      sourceUrl: sourceUrl || null,
    });
    if (publicValue(role) && !/^not verified$/i.test(role.trim()) && sourceUrl) {
      const vacancy = { companyName: name, title: role, location: "India — see source", sourceUrl, eligibility, route: vacancyRoute(role), twoYearMatch: /2[-\s–]*year|two-year/i.test(`${role} ${eligibility}`) };
      vacancyCandidates.set(`${name}|${role}|${sourceUrl}`, vacancy);
    }
  }

  const existingCompanies = await db.select().from(companies);
  const companyByName = new Map(existingCompanies.map(company => [company.name, company]));
  const missingCompanies = Array.from(candidates.values()).filter(candidate => !companyByName.has(candidate.name)).map(candidate => ({
    name: candidate.name,
    primaryLocation: candidate.primaryLocation,
    careerUrl: candidate.careerUrl,
    researchNote: candidate.researchNote,
    augustWindowStatus: candidate.augustWindowStatus,
  }));
  for (let start = 0; start < missingCompanies.length; start += 100) await db.insert(companies).values(missingCompanies.slice(start, start + 100));
  const allCompanies = await db.select().from(companies);
  const resolvedCompanies = new Map(allCompanies.map(company => [company.name, company]));

  const existingContacts = await db.select({ companyId: companyContacts.companyId, contactType: companyContacts.contactType, contactValue: companyContacts.contactValue }).from(companyContacts);
  const contactKeys = new Set(existingContacts.map(contact => `${contact.companyId}|${contact.contactType}|${contact.contactValue}`));
  const newContacts: (typeof companyContacts.$inferInsert)[] = [];
  candidates.forEach(candidate => {
    const company = resolvedCompanies.get(candidate.name);
    if (!company) return;
    for (const email of candidate.emails) {
      const contactType = /\bhr\b|recruit|career/i.test(email) ? "hr" : "careers" as const;
      const key = `${company.id}|${contactType}|${email.toLowerCase()}`;
      if (!contactKeys.has(key)) { contactKeys.add(key); newContacts.push({ companyId: company.id, contactType, contactValue: email.toLowerCase(), sourceUrl: candidate.sourceUrl }); }
    }
    for (const phone of candidate.phones) {
      const key = `${company.id}|phone|${phone}`;
      if (!contactKeys.has(key)) { contactKeys.add(key); newContacts.push({ companyId: company.id, contactType: "phone", contactValue: phone, sourceUrl: candidate.sourceUrl }); }
    }
  });
  for (let start = 0; start < newContacts.length; start += 200) await db.insert(companyContacts).values(newContacts.slice(start, start + 200));

  const existingVacancies = await db.select({ companyId: vacancies.companyId, title: vacancies.title, sourceUrl: vacancies.sourceUrl }).from(vacancies);
  const vacancyKeys = new Set(existingVacancies.map(vacancy => `${vacancy.companyId}|${vacancy.title}|${vacancy.sourceUrl}`));
  const newVacancies: (typeof vacancies.$inferInsert)[] = [];
  vacancyCandidates.forEach(candidate => {
    const company = resolvedCompanies.get(candidate.companyName);
    if (!company) return;
    const key = `${company.id}|${candidate.title.slice(0, 255)}|${candidate.sourceUrl}`;
    if (vacancyKeys.has(key)) return;
    vacancyKeys.add(key);
    newVacancies.push({
      companyId: company.id, title: candidate.title.slice(0, 255), department: /qa|quality|ipqa/i.test(candidate.title) ? "QA / IPQA" : null,
      location: candidate.location, employmentRoute: candidate.route, walkInDateText: /august|aug|walk/i.test(candidate.title) ? candidate.title.slice(0, 255) : null,
      eligibility: candidate.eligibility || null, salaryText: /salary|ctc|₹|rs\.?/i.test(candidate.eligibility) ? candidate.eligibility.slice(0, 500) : null,
      sourceUrl: candidate.sourceUrl, status: "unverified", twoYearMatch: candidate.twoYearMatch,
      locationPriority: locationPriority(candidate.location), matchScore: scoreVacancy({ title: candidate.title, eligibility: candidate.eligibility, location: candidate.location, route: candidate.route, twoYearHint: candidate.twoYearMatch }),
    });
  });
  for (let start = 0; start < newVacancies.length; start += 100) await db.insert(vacancies).values(newVacancies.slice(start, start + 100));
  const [{ total }] = await db.select({ total: sql<number>`count(*)` }).from(companies);
  return { companies: Number(total), vacancies: newVacancies.length };
}

export async function ensureCandidateProfile(user: User) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const existing = (await db.select().from(candidateProfiles).where(eq(candidateProfiles.userId, user.id)).limit(1))[0];
  if (!existing) {
    await db.insert(candidateProfiles).values({
      userId: user.id,
      fullName: user.name || "QA / IPQA Candidate",
      email: user.email,
      qualification: "B.Pharm / M.Pharm",
      experienceYears: 2,
      currentRole: "QA / IPQA – Tablet Compression Support",
      skills: "IPQA, Tablet Compression, OSD, GMP, Line Clearance, BMR/BPR, In-Process Checks",
      preferredLocations: GUJARAT_PRIORITY_LOCATIONS.join(", ") + ", Bharuch, India-wide",
      cvVersion: "QA-OSD-v1",
    });
  }
  const profile = (await db.select().from(candidateProfiles).where(eq(candidateProfiles.userId, user.id)).limit(1))[0];
  const schedule = await getMonitoringSchedule(user.id);
  if (!schedule) {
    await db.insert(monitoringSchedules).values({
      userId: user.id,
      cronExpression: DAILY_MONITORING_CRON,
      timezone: "Asia/Kolkata",
      enabled: false,
      deliveryTarget: "owner_notification",
    });
  }
  return profile;
}

export async function updateCandidateProfile(userId: number, input: Partial<typeof candidateProfiles.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(candidateProfiles).set({ ...input, updatedAt: new Date() }).where(eq(candidateProfiles.userId, userId));
  return (await db.select().from(candidateProfiles).where(eq(candidateProfiles.userId, userId)).limit(1))[0];
}

type VacancyRankingInput = {
  vacancy: Pick<typeof vacancies.$inferSelect, "title" | "eligibility" | "location" | "employmentRoute" | "twoYearMatch" | "matchScore" | "locationPriority">;
};

export function rankVacanciesForProfile<T extends VacancyRankingInput>(rows: T[], profile: RankingProfile, limit = 80) {
  return rows
    .map(row => {
      const location = inferVacancyLocation(row.vacancy.title, row.vacancy.location);
      const route = inferVacancyRoute(row.vacancy.title, row.vacancy.employmentRoute);
      return {
        ...row,
        vacancy: {
          ...row.vacancy,
          location,
          employmentRoute: route,
          locationPriority: locationPriority(location),
          matchScore: scoreVacancyForProfile({
            title: row.vacancy.title,
            eligibility: row.vacancy.eligibility ?? "",
            location,
            route,
            twoYearHint: row.vacancy.twoYearMatch || /1\s*[-–to]+\s*3|2\s*[-–to]+\s*\d|\b2\s*years?\b/i.test(`${row.vacancy.title} ${row.vacancy.eligibility ?? ""}`),
          }, profile),
        },
      };
    })
    .sort((left, right) => right.vacancy.matchScore - left.vacancy.matchScore || right.vacancy.locationPriority - left.vacancy.locationPriority)
    .slice(0, limit);
}

export async function getDashboardData(profile: typeof candidateProfiles.$inferSelect) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await seedResearchDirectory();
  const rows = await db
    .select({ vacancy: vacancies, company: companies })
    .from(vacancies)
    .innerJoin(companies, eq(vacancies.companyId, companies.id))
    .orderBy(desc(vacancies.createdAt));
  const rankedRows = rankVacanciesForProfile(rows, profile);
  const companyIds = Array.from(new Set(rankedRows.map(row => row.company.id)));
  const contacts = companyIds.length
    ? await db.select().from(companyContacts).where(inArray(companyContacts.companyId, companyIds))
    : [];
  const contactsByCompany = new Map<number, typeof contacts>();
  contacts.forEach(contact => contactsByCompany.set(contact.companyId, [...(contactsByCompany.get(contact.companyId) ?? []), contact]));
  return rankedRows.map(row => ({ ...row, contacts: contactsByCompany.get(row.company.id) ?? [] }));
}

export async function getCompanyDirectory(query?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await seedResearchDirectory();
  const where = query?.trim()
    ? or(like(companies.name, `%${query.trim()}%`), like(companies.primaryLocation, `%${query.trim()}%`))
    : undefined;
  const companyRows = await db.select().from(companies).where(where).orderBy(companies.name).limit(350);
  const companyIds = companyRows.map(company => company.id);
  const contacts = companyIds.length
    ? await db.select().from(companyContacts).where(inArray(companyContacts.companyId, companyIds))
    : [];
  const contactsByCompany = new Map<number, typeof contacts>();
  contacts.forEach(contact => contactsByCompany.set(contact.companyId, [...(contactsByCompany.get(contact.companyId) ?? []), contact]));
  return companyRows.map(company => ({ ...company, contacts: contactsByCompany.get(company.id) ?? [] }));
}

function csvCell(value: string | number | null | undefined) {
  const normalized = String(value ?? "").replace(/"/g, '""');
  return `"${normalized}"`;
}

export type DailyVacancyReportRow = {
  company: string;
  title: string;
  department: string | null;
  location: string;
  route: string;
  eligibility: string | null;
  salary: string | null;
  twoYearMatch: boolean;
  matchScore: number;
  sourceUrl: string;
};

export function buildDailyVacancyCsv(rows: DailyVacancyReportRow[]) {
  const header = ["Company", "Role", "Department", "Location", "Route", "Eligibility", "Salary", "2-year match", "Match score", "Public source URL"];
  const lines = rows.map(row => [
    row.company, row.title, row.department, row.location, row.route, row.eligibility, row.salary,
    row.twoYearMatch ? "Yes" : "No", row.matchScore, row.sourceUrl,
  ].map(csvCell).join(","));
  return [header.map(csvCell).join(","), ...lines].join("\n");
}

export async function exportDailyVacancyCsv() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await seedResearchDirectory();
  const rows = await db
    .select({ vacancy: vacancies, company: companies })
    .from(vacancies)
    .innerJoin(companies, eq(vacancies.companyId, companies.id))
    .orderBy(desc(vacancies.matchScore), desc(vacancies.locationPriority));
  return buildDailyVacancyCsv(rows.map(row => ({
    company: row.company.name.replace(/\s*\.+\s*$/g, ""), title: row.vacancy.title, department: row.vacancy.department,
    location: inferVacancyLocation(row.vacancy.title, row.vacancy.location), route: inferVacancyRoute(row.vacancy.title, row.vacancy.employmentRoute),
    eligibility: row.vacancy.eligibility, salary: row.vacancy.salaryText, twoYearMatch: row.vacancy.twoYearMatch,
    matchScore: row.vacancy.matchScore, sourceUrl: row.vacancy.sourceUrl,
  })));
}

export async function getApplicationsForUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db
    .select({ application: applications, vacancy: vacancies, company: companies })
    .from(applications)
    .innerJoin(vacancies, eq(applications.vacancyId, vacancies.id))
    .innerJoin(companies, eq(vacancies.companyId, companies.id))
    .where(eq(applications.userId, userId))
    .orderBy(desc(applications.updatedAt));
}

export async function updateApplicationStatus(userId: number, applicationId: number, status: typeof applications.$inferInsert.status) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db
    .update(applications)
    .set({ status, dateApplied: status === "applied" ? new Date() : undefined, updatedAt: new Date() })
    .where(and(eq(applications.id, applicationId), eq(applications.userId, userId)));
}

export async function createApplicationDraft(user: User, vacancyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const profile = await ensureCandidateProfile(user);
  const row = (
    await db
      .select({ vacancy: vacancies, company: companies })
      .from(vacancies)
      .innerJoin(companies, eq(vacancies.companyId, companies.id))
      .where(eq(vacancies.id, vacancyId))
      .limit(1)
  )[0];
  if (!row) throw new Error("Vacancy not found");
  const contact = (
    await db
      .select()
      .from(companyContacts)
      .where(and(eq(companyContacts.companyId, row.company.id), inArray(companyContacts.contactType, ["hr", "careers"])))
      .limit(1)
  )[0];
  const existingApplication = (await db.select().from(applications).where(and(eq(applications.userId, user.id), eq(applications.vacancyId, vacancyId))).limit(1))[0];
  const applicationId = existingApplication?.id ?? Number((await db.insert(applications).values({
    userId: user.id,
    vacancyId,
    status: "to_apply",
    cvVersion: profile.cvVersion,
    contactUsed: contact?.contactValue ?? null,
  }))[0].insertId);
  const body = `Dear Hiring Team,\n\nI am writing to apply for the ${row.vacancy.title} opportunity at ${row.company.name}. I have ${profile.experienceYears} years of pharmaceutical QA/IPQA experience with hands-on exposure to ${profile.skills}. My work has included OSD tablet-compression support, GMP documentation, line clearance, in-process checks, and BMR/BPR compliance.\n\nI am particularly interested in opportunities in ${row.vacancy.location} and believe my QA/IPQA background aligns with the stated requirement. My CV (${profile.cvVersion}) is ready to share for your consideration.\n\nThank you for your time.\n\nSincerely,\n${profile.fullName}\n${profile.email ?? ""}\n${profile.phone ?? ""}`;
  const result = await db.insert(applicationDrafts).values({
    userId: user.id,
    vacancyId,
    applicationId,
    recipient: contact?.contactValue ?? null,
    subject: APPLICATION_SUBJECT,
    body,
    approvalStatus: "draft",
  });
  return Number(result[0].insertId);
}

export async function getDraftsForUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db
    .select({ draft: applicationDrafts, vacancy: vacancies, company: companies })
    .from(applicationDrafts)
    .innerJoin(vacancies, eq(applicationDrafts.vacancyId, vacancies.id))
    .innerJoin(companies, eq(vacancies.companyId, companies.id))
    .where(eq(applicationDrafts.userId, userId))
    .orderBy(desc(applicationDrafts.createdAt));
}

export async function approveDraft(userId: number, draftId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db
    .update(applicationDrafts)
    .set({ approvalStatus: "approved", approvedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(applicationDrafts.id, draftId), eq(applicationDrafts.userId, userId), eq(applicationDrafts.approvalStatus, "draft")));
}

export async function markDraftSent(userId: number, draftId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const draft = (await db.select().from(applicationDrafts).where(and(eq(applicationDrafts.id, draftId), eq(applicationDrafts.userId, userId))).limit(1))[0];
  if (!draft) throw new Error("Draft not found");
  if (!canMarkDraftAsSent(draft.approvalStatus)) throw new Error("A draft must be explicitly approved before it can be marked as sent");
  await db.update(applicationDrafts).set({ approvalStatus: "sent", sentAt: new Date(), updatedAt: new Date() }).where(eq(applicationDrafts.id, draftId));
  if (draft.applicationId) {
    await db.update(applications).set({ status: applicationStatusAfterConfirmedSend(), dateApplied: new Date(), updatedAt: new Date() }).where(and(eq(applications.id, draft.applicationId), eq(applications.userId, userId)));
  }
}

export async function createMonitoringRun(triggerType: "manual" | "scheduled") {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await seedResearchDirectory();
  const [{ total }] = await db.select({ total: sql<number>`count(*)` }).from(vacancies);
  const result = await db.insert(monitoringRuns).values({
    triggerType,
    status: "completed",
    summary: "Imported and ranked source-cited August 16–29 research data. Live web-search execution is prepared for the scheduled agent handoff.",
    newVacancyCount: Number(total),
    completedAt: new Date(),
  });
  return Number(result[0].insertId);
}

export function formatGitHubPublishSummary(status: "pushed" | "no_changes" | "failed" | "dry_run", reportPath: string, detail?: string) {
  const suffix = detail ? ` ${detail}` : "";
  return `GitHub daily report publish ${status}: ${reportPath}.${suffix}`.trim();
}

export async function recordGitHubPublishOutcome(status: "pushed" | "no_changes" | "failed" | "dry_run", reportPath: string, detail?: string) {
  const db = await getDb();
  if (!db) return;
  await db.insert(monitoringRuns).values({
    triggerType: "scheduled",
    status: status === "failed" ? "failed" : "completed",
    summary: formatGitHubPublishSummary(status, reportPath, detail),
    newVacancyCount: 0,
    completedAt: new Date(),
  });
}

export type ScheduledVacancyInput = {
  companyName: string;
  title: string;
  location: string;
  sourceUrl: string;
  eligibility?: string;
  salaryText?: string;
  route?: "walk_in" | "direct" | "unverified";
  walkInDateText?: string;
  publicEmail?: string;
  publicPhone?: string;
  twoYearMatch?: boolean;
};

export async function ingestScheduledVacancies(records: ScheduledVacancyInput[]) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  let added = 0;
  for (const record of records) {
    if (!record.companyName || !record.title || !record.location || !/^https?:\/\//i.test(record.sourceUrl)) continue;
    const company = await upsertCompanyFromResearch(db, {
      name: record.companyName,
      primaryLocation: record.location,
      careerUrl: record.sourceUrl,
      researchNote: "Daily monitoring agent: public source-cited record. Confirm before applying.",
      augustWindowStatus: record.title,
    });
    await upsertPublicContacts(db, company.id, record.publicEmail ?? "", record.publicPhone ?? "", record.sourceUrl);
    const created = await upsertVacancyFromResearch(db, {
      companyId: company.id,
      title: record.title,
      location: record.location,
      sourceUrl: record.sourceUrl,
      eligibility: [record.eligibility, record.salaryText].filter(Boolean).join(" "),
      route: record.route ?? "unverified",
      twoYearMatch: record.twoYearMatch ?? false,
    });
    if (created) added += 1;
  }
  return added;
}

export async function getMonitoringSchedule(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return (await db.select().from(monitoringSchedules).where(eq(monitoringSchedules.userId, userId)).limit(1))[0];
}

export async function getMonitoringScheduleByTaskUid(taskUid: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return (await db.select().from(monitoringSchedules).where(eq(monitoringSchedules.scheduleCronTaskUid, taskUid)).limit(1))[0];
}

export async function saveMonitoringScheduleTask(userId: number, taskUid: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(monitoringSchedules).set({ scheduleCronTaskUid: taskUid, enabled: true, updatedAt: new Date() }).where(eq(monitoringSchedules.userId, userId));
  return getMonitoringSchedule(userId);
}
