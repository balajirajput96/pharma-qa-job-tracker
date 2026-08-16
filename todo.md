# Project TODO

- [x] Create database tables for candidate profiles, companies, contacts, vacancies, application records, application drafts, daily monitoring runs, and schedule configuration.
- [x] Add a repeatable import path for the existing August 16–29 research directory, vacancy status, public HR/careers emails, phone numbers, and source URLs.
- [x] Implement Gujarat-first vacancy matching and scoring for a 2-year QA/IPQA/OSD/tablet-compression profile.
- [x] Build protected tRPC procedures for candidate profile editing, vacancy search, company directory browsing, application status changes, and draft approval.
- [x] Build a DashboardLayout-based ranked vacancy dashboard with walk-in dates, company data, eligibility, salary, match score, and source links.
- [x] Build a candidate profile page with experience, qualifications, skills, preferred locations, and matching preferences.
- [x] Build a searchable company directory that exposes only public contact details and original source URLs.
- [x] Build an application tracker with To Apply, Applied, Follow-up, Interview Scheduled, Offer, and Rejected statuses.
- [x] Build an approval queue that generates a company-specific email draft using the exact required subject line and never sends without a user action.
- [x] Add a Gmail-ready sending boundary that opens Gmail only after explicit approval and logs the manually confirmed sent status.
- [x] Add a GitHub-ready daily-report export boundary for version-controlled vacancy and company CSV updates.
- [x] Add a daily 8:30 AM IST monitoring configuration, with an idempotent scheduled endpoint and an owner notification path prepared for production deployment.
- [x] Add unit tests for matching priority, draft subject enforcement, approval gating, and application status transitions.
- [x] Verify the build, test suite, database migration, and responsive dashboard flows.
