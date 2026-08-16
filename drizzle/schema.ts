import {
  boolean,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const candidateProfiles = mysqlTable(
  "candidate_profiles",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    fullName: varchar("full_name", { length: 160 }).notNull(),
    email: varchar("email", { length: 320 }),
    phone: varchar("phone", { length: 32 }),
    qualification: varchar("qualification", { length: 240 }).notNull().default("B.Pharm / M.Pharm"),
    experienceYears: int("experience_years").notNull().default(2),
    currentRole: varchar("current_role", { length: 160 }).notNull().default("QA / IPQA Associate"),
    skills: text("skills").notNull(),
    preferredLocations: text("preferred_locations").notNull(),
    cvVersion: varchar("cv_version", { length: 160 }).notNull().default("QA-OSD-v1"),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("candidate_profile_user_idx").on(table.userId)],
);

export const companies = mysqlTable(
  "companies",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    primaryLocation: varchar("primary_location", { length: 255 }),
    careerUrl: text("career_url"),
    researchNote: text("research_note"),
    augustWindowStatus: varchar("august_window_status", { length: 255 }),
    importedAt: timestamp("imported_at").defaultNow().notNull(),
  },
  table => [uniqueIndex("companies_name_idx").on(table.name)],
);

export const companyContacts = mysqlTable(
  "company_contacts",
  {
    id: int("id").autoincrement().primaryKey(),
    companyId: int("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    contactType: mysqlEnum("contact_type", ["hr", "careers", "phone"]).notNull(),
    contactValue: varchar("contact_value", { length: 320 }).notNull(),
    sourceUrl: text("source_url"),
    isPubliclyVerified: boolean("is_publicly_verified").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  table => [
    index("company_contact_company_idx").on(table.companyId),
    uniqueIndex("company_contact_unique_idx").on(table.companyId, table.contactType, table.contactValue),
  ],
);

export const vacancies = mysqlTable(
  "vacancies",
  {
    id: int("id").autoincrement().primaryKey(),
    companyId: int("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    department: varchar("department", { length: 160 }),
    location: varchar("location", { length: 255 }).notNull(),
    employmentRoute: mysqlEnum("employment_route", ["walk_in", "direct", "unverified"]).notNull().default("unverified"),
    walkInDateText: varchar("walk_in_date_text", { length: 255 }),
    eligibility: text("eligibility"),
    salaryText: varchar("salary_text", { length: 500 }),
    sourceUrl: text("source_url").notNull(),
    status: mysqlEnum("status", ["active", "expired", "unverified"]).notNull().default("unverified"),
    twoYearMatch: boolean("two_year_match").notNull().default(false),
    locationPriority: int("location_priority").notNull().default(0),
    matchScore: int("match_score").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("vacancy_company_idx").on(table.companyId),
    index("vacancy_score_idx").on(table.matchScore),
    index("vacancy_location_idx").on(table.location),
  ],
);

export const applications = mysqlTable(
  "applications",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    vacancyId: int("vacancy_id").notNull().references(() => vacancies.id, { onDelete: "cascade" }),
    status: mysqlEnum("status", ["to_apply", "applied", "follow_up", "interview_scheduled", "offer", "rejected"])
      .notNull()
      .default("to_apply"),
    dateApplied: timestamp("date_applied"),
    cvVersion: varchar("cv_version", { length: 160 }),
    contactUsed: varchar("contact_used", { length: 320 }),
    nextFollowUpAt: timestamp("next_follow_up_at"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("application_user_idx").on(table.userId),
    uniqueIndex("application_user_vacancy_idx").on(table.userId, table.vacancyId),
  ],
);

export const applicationDrafts = mysqlTable(
  "application_drafts",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    vacancyId: int("vacancy_id").notNull().references(() => vacancies.id, { onDelete: "cascade" }),
    applicationId: int("application_id").references(() => applications.id, { onDelete: "set null" }),
    recipient: varchar("recipient", { length: 320 }),
    subject: varchar("subject", { length: 255 }).notNull(),
    body: text("body").notNull(),
    approvalStatus: mysqlEnum("approval_status", ["draft", "approved", "sent", "cancelled"])
      .notNull()
      .default("draft"),
    approvedAt: timestamp("approved_at"),
    sentAt: timestamp("sent_at"),
    gmailMessageId: varchar("gmail_message_id", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("draft_user_status_idx").on(table.userId, table.approvalStatus),
    index("draft_vacancy_idx").on(table.vacancyId),
  ],
);

export const monitoringRuns = mysqlTable(
  "monitoring_runs",
  {
    id: int("id").autoincrement().primaryKey(),
    triggerType: mysqlEnum("trigger_type", ["manual", "scheduled"]).notNull(),
    status: mysqlEnum("status", ["queued", "running", "completed", "failed"]).notNull().default("queued"),
    summary: text("summary"),
    newVacancyCount: int("new_vacancy_count").notNull().default(0),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
  },
  table => [index("monitoring_run_started_idx").on(table.startedAt)],
);

export const monitoringSchedules = mysqlTable(
  "monitoring_schedules",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    scheduleCronTaskUid: varchar("schedule_cron_task_uid", { length: 65 }),
    cronExpression: varchar("cron_expression", { length: 80 }).notNull().default("0 0 3 * * *"),
    timezone: varchar("timezone", { length: 80 }).notNull().default("Asia/Kolkata"),
    enabled: boolean("enabled").notNull().default(false),
    deliveryTarget: mysqlEnum("delivery_target", ["owner_notification", "gmail_draft", "github_export"])
      .notNull()
      .default("owner_notification"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("monitoring_schedule_user_idx").on(table.userId)],
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
