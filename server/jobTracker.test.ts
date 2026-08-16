import { describe, expect, it } from "vitest";
import { APPLICATION_SUBJECT, DAILY_MONITORING_CRON, applicationStatusAfterConfirmedSend, buildDailyVacancyCsv, canMarkDraftAsSent, inferVacancyLocation, inferVacancyRoute, locationPriority, rankVacanciesForProfile, scoreVacancy, scoreVacancyForProfile } from "./db";

describe("job matching priority", () => {
  it("prioritizes Vadodara over India-wide locations", () => {
    expect(locationPriority("Vadodara, Gujarat")).toBeGreaterThan(locationPriority("Hyderabad, Telangana"));
  });

  it("recovers a Gujarat location and walk-in route from a sourced vacancy title", () => {
    const title = "Walk-In Interview on 18 August 2026 for Production (OSD), Quality Assurance (IPQA & QMS) at Gota, Ahmedabad";
    expect(inferVacancyLocation(title, "India — see source")).toBe("Ahmedabad, Gujarat");
    expect(inferVacancyRoute(title, "unverified")).toBe("walk_in");
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

  it("applies candidate-specific scoring before reducing the dashboard to its result limit", () => {
    const profile = { experienceYears: 2, skills: "IPQA, Tablet Compression, OSD", preferredLocations: "Vadodara, Gujarat" } as Parameters<typeof rankVacanciesForProfile>[1];
    const genericRows = Array.from({ length: 80 }, (_, index) => ({
      company: { id: index },
      vacancy: { title: "Production Executive", eligibility: "5 years experience", location: "India", employmentRoute: "direct" as const, twoYearMatch: false, matchScore: 90, locationPriority: 0 },
    }));
    const exactMatch = { company: { id: 81 }, vacancy: { title: "IPQA Officer - Tablet Compression / OSD", eligibility: "B.Pharm, 1-3 years", location: "Vadodara, Gujarat", employmentRoute: "walk_in" as const, twoYearMatch: true, matchScore: 40, locationPriority: 0 } };
    const ranked = rankVacanciesForProfile([...genericRows, exactMatch], profile, 80);
    expect(ranked.some(row => row.company.id === 81)).toBe(true);
    expect(ranked[0]?.company.id).toBe(81);
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

  it("exports a source-cited CSV with a stable report shape", () => {
    const csv = buildDailyVacancyCsv([{
      company: "Bharat Parenterals",
      title: "IPQA Officer",
      department: "QA / IPQA",
      location: "Vadodara, Gujarat",
      route: "walk_in",
      eligibility: "B.Pharm, 1–3 years",
      salary: null,
      twoYearMatch: true,
      matchScore: 96,
      sourceUrl: "https://www.bplindia.in/lifebpl.html",
    }]);
    expect(csv).toContain('"Public source URL"');
    expect(csv).toContain('"Bharat Parenterals"');
    expect(csv).toContain('"Yes"');
  });
});
