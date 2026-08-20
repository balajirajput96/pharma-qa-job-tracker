# Automation Operating Model

The repository has two complementary daily paths. The job-monitoring workflow runs with AI judgement and updates source-cited research when its managed tracker database is available. The GitHub workflow runs daily at 02:30 UTC (08:00 Asia/Calcutta) and validates the repository without access to database credentials, browser sessions, Gmail, or application-submission capabilities.

| Workflow                     | What it does                                                                                                                          | What it deliberately does not do                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Daily Pharma QA/IPQA monitor | Finds and verifies public roles, prioritizes Gujarat, prepares source-cited reports, attempts tracked imports and draft-only creation | Send emails, submit applications, post content, or bypass unavailable database access                   |
| Daily repository maintenance | Installs locked dependencies, type-checks, tests, validates versioned research CSV headers, and checks formatting                     | Read secrets, call browser-only connectors, generate job applications, modify job records, or push code |

> Application drafts may only be created with `approvalStatus: draft`. A user must explicitly approve a specific draft before Gmail handoff, and Gmail sending remains a user action.

## Persistence and Credential Boundary

The versioned `automation/manifest.json` documents what automation is intended to do without recording account credentials. `pnpm run automation:record` writes a redacted operational record; `pnpm run automation:record -- --check` validates its behavior without creating a file. Credentials stay only in official provider credential stores and managed environment variables. The repository must never contain password values, API keys, OAuth codes, tokens, cookies, session data, or raw terminal history.

## Database Recovery Boundary

The report publisher and fresh CSV importer require the tracker database provided by the managed project environment. A plain repository clone has no `DATABASE_URL`; it must stop with `Database unavailable` rather than fabricate records or store credentials in the repository.
