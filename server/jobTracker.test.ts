import { describe, expect, it } from "vitest";
import { APPLICATION_SUBJECT, DAILY_MONITORING_CRON, applicationStatusAfterConfirmedSend, canMarkDraftAsSent, locationPriority, scoreVacancy, scoreVacancyForProfile } from "./db";

describe("job matching priority", () => {
  it("prioritizes Vadodara over India-wide locations", () => {
    expect(locationPriority("Vadodara, Gujarat")).toBeGreaterThan(locationPriority("Hyderabad, Telangana"));
  });

  it("ranks a Gujarat QA/IPQA OSD walk-in above a generic role", () => {
    const exactMatch = scoreVacancy({
      title: "IPQA Officer – Tablet Compression / OSD",
      eligibility: "B.Pharm, 1–3 years experience",
      location: "Vadodara, Gujarat",
      route: "walk_in",
      twoYearHint: true,
    });
    const genericRole = scoreVacancy({
      title: "Production Executive",
      eligibility: "5 years experience",
      location: "India",
      route: "direct",
      twoYearHint: false,
    });
    expect(exactMatch).toBeGreaterThan(genericRole);
    expect(exactMatch).toBeGreaterThanOrEqual(90);
  });

  it("uses saved candidate preferences to boost a matching Gujarat role", () => {
    const profile = {
      experienceYears: 2,
      skills: "IPQA, Tablet Compression, OSD, GMP",
      preferredLocations: "Vadodara, Ahmedabad, Halol, Sanand, Ankleshwar, India-wide",
    } as Parameters<typeof scoreVacancyForProfile>[1];
    const score = scoreVacancyForProfile({
      title: "IPQA Officer – Tablet Compression / OSD",
      eligibility: "B.Pharm, 1–3 years experience",
      location: "Vadodara, Gujarat",
      route: "walk_in",
      twoYearHint: true,
    }, profile);
    expect(score).toBeGreaterThanOrEqual(96);
  });
});

describe("approval-gated application drafts", () => {
  it("keeps the required subject exact for every generated draft", () => {
    expect(APPLICATION_SUBJECT).toBe("IPQA Officer – 2 Years OSD Tablet Compression Experience");
  });

  it("uses the exact 8:30 AM IST daily cron in UTC", () => {
    expect(DAILY_MONITORING_CRON).toBe("0 0 3 * * *");
  });

  it("blocks sent-status logging until a user has explicitly approved the draft", () => {
    expect(canMarkDraftAsSent("draft")).toBe(false);
    expect(canMarkDraftAsSent("cancelled")).toBe(false);
    expect(canMarkDraftAsSent("sent")).toBe(false);
    expect(canMarkDraftAsSent("approved")).toBe(true);
  });

  it("moves an application to Applied only after the user confirms sending", () => {
    expect(applicationStatusAfterConfirmedSend()).toBe("applied");
  });
});
