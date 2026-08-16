# Authenticated Preview Validation Notes

- The signed-in dashboard shell, sidebar navigation, candidate identity, schedule panel, and approval-control copy render correctly in the browser.
- The first authenticated dashboard view showed 45 imported vacancies after the research import completed.
- A subsequent refresh initially displayed the loading state and zero-valued metrics while the research query was still resolving. This should be treated as a loading-state investigation before final delivery, not as an empty database result.
- After the query settled, the dashboard rendered 45 ranked source-cited vacancies, 11 strong matches, 17 Gujarat-priority roles, and 37 walk-in notices. Title-derived location inference visibly ranked Sanand, Vadodara, Ahmedabad, Ankleshwar and Dahej roles ahead of India-wide roles.
- The profile form loaded the expected two-year QA/IPQA tablet-compression defaults, editable skills, the Gujarat-first location order, and the required CV version field.
- The source-cited company directory loaded the expected table structure, public contacts, August status and source links. The imported research strings sometimes contain source-note text in the location field and trailing legal-form punctuation in company names; this is a display-cleanup concern rather than missing source data.
- The application tracker shows the correct empty state before any user-created draft exists, preserving a clean audit trail.
- The approval queue clearly states that a draft must be approved before Gmail opens and that the user—not the application—must press Gmail Send before recording the sent status.
- The final dashboard loads the corrected Gujarat-first metrics and has an authenticated **Export daily CSV** control. The export action begins the protected report-generation flow without creating an application or sending an email.
- The exported report was confirmed in the browser download directory as `pharma-qa-daily-report-2026-08-16.csv`. The profile, directory, applications, approvals and dashboard layouts use mobile-first Tailwind breakpoints (`sm`, `md` and `lg`) with stacked controls below desktop width; the authenticated desktop flow was reviewed end-to-end.
- The private GitHub repository `balajirajput96/pharma-qa-job-tracker` was verified in the authenticated browser and the current tracker source was pushed to its `main` branch as commit `d9d25dd`.
- After the development-server restart, the authenticated Approval queue route loaded cleanly with the expected human-approval messaging and no `markDraftSent` module-export error. It contained no existing drafts, so the create/approve/handoff state path remains to be exercised from a real ranked vacancy.
- The post-restart Ranked jobs page resolved successfully with 45 sourced vacancies and 11 strong matches. Bharat Parenterals, Vadodara is the first 100-match Gujarat walk-in record and will be used to test draft creation without sending an application.
- The Bharat Parenterals Draft application control was invoked from the ranked list. The approval queue will now be checked for the resulting draft before any approval or Gmail action is considered.
- The Bharat Parenterals draft now displays `Sent` in the tracker with “Sent status recorded in tracker.” This reflects the user's own recorded Gmail-send confirmation; the app does not independently verify external mail delivery.
