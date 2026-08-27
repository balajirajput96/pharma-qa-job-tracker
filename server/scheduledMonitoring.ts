import type { Request, Response } from "express";
import {
  createMonitoringRun,
  getMonitoringScheduleByTaskUid,
  ingestScheduledVacancies,
  type ScheduledVacancyInput,
} from "./db";
import { notifyOwner } from "./_core/notification";
import { sdk } from "./_core/sdk";

export async function runScheduledMonitoring(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid)
      return res.status(403).json({ error: "cron-only" });
    const schedule = await getMonitoringScheduleByTaskUid(user.taskUid);
    if (!schedule) return res.json({ ok: true, skipped: "orphaned-schedule" });
    if (!schedule.enabled) return res.json({ ok: true, skipped: "disabled" });

    const records = Array.isArray(req.body?.vacancies)
      ? (req.body.vacancies as ScheduledVacancyInput[])
      : [];
    const added = await ingestScheduledVacancies(records);
    const runId = await createMonitoringRun("scheduled");
    const notified = await notifyOwner({
      title: "Pharma job monitor completed",
      content: `The daily QA/IPQA/OSD research refresh completed. ${added} new source-cited vacancies were added. Open Pharma QA Job Tracker to review the shortlist and approval queue.`,
    });
    return res.json({
      ok: true,
      runId,
      newVacancies: added,
      ownerNotified: notified,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({
      error: message,
      timestamp: new Date().toISOString(),
      context: { path: "/api/scheduled/daily-monitoring" },
    });
  }
}
