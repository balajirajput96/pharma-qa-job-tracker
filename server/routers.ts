import { z } from "zod";
import { parse as parseCookie } from "cookie";
import {
  DAILY_MONITORING_CRON,
  approveDraft,
  createApplicationDraft,
  createMonitoringRun,
  ensureCandidateProfile,
  exportDailyVacancyCsv,
  getApplicationsForUser,
  getCompanyDirectory,
  getDashboardData,
  getDraftsForUser,
  getMonitoringSchedule,
  markDraftSent,
  saveMonitoringScheduleTask,
  seedResearchDirectory,
  updateApplicationStatus,
  updateCandidateProfile,
} from "./db";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { createHeartbeatJob, updateHeartbeatJob } from "./_core/heartbeat";

const profileInput = z.object({
  fullName: z.string().min(1).max(160),
  email: z.string().email().nullable(),
  phone: z.string().max(32).nullable(),
  qualification: z.string().min(1).max(240),
  experienceYears: z.number().int().min(0).max(40),
  currentRole: z.string().min(1).max(160),
  skills: z.string().min(1),
  preferredLocations: z.string().min(1),
  cvVersion: z.string().min(1).max(160),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  jobTracker: router({
    bootstrapResearch: protectedProcedure.mutation(async () => seedResearchDirectory()),
    dashboard: protectedProcedure.query(async ({ ctx }) => {
      const profile = await ensureCandidateProfile(ctx.user);
      return getDashboardData(profile);
    }),
    dailyReport: protectedProcedure.query(async () => ({
      filename: `pharma-qa-daily-report-${new Date().toISOString().slice(0, 10)}.csv`,
      csv: await exportDailyVacancyCsv(),
    })),
    directory: protectedProcedure.input(z.object({ query: z.string().max(160).optional() })).query(async ({ input }) => getCompanyDirectory(input.query)),
    profile: protectedProcedure.query(async ({ ctx }) => ensureCandidateProfile(ctx.user)),
    saveProfile: protectedProcedure.input(profileInput).mutation(async ({ ctx, input }) => updateCandidateProfile(ctx.user.id, input)),
    applications: protectedProcedure.query(async ({ ctx }) => getApplicationsForUser(ctx.user.id)),
    updateApplicationStatus: protectedProcedure.input(z.object({
      applicationId: z.number().int().positive(),
      status: z.enum(["to_apply", "applied", "follow_up", "interview_scheduled", "offer", "rejected"]),
    })).mutation(async ({ ctx, input }) => {
      await updateApplicationStatus(ctx.user.id, input.applicationId, input.status);
      return { success: true };
    }),
    drafts: protectedProcedure.query(async ({ ctx }) => getDraftsForUser(ctx.user.id)),
    createDraft: protectedProcedure.input(z.object({ vacancyId: z.number().int().positive() })).mutation(async ({ ctx, input }) => ({ draftId: await createApplicationDraft(ctx.user, input.vacancyId) })),
    approveDraft: protectedProcedure.input(z.object({ draftId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      await approveDraft(ctx.user.id, input.draftId);
      return { success: true };
    }),
    markDraftSent: protectedProcedure.input(z.object({ draftId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      await markDraftSent(ctx.user.id, input.draftId);
      return { success: true };
    }),
    runMonitoring: protectedProcedure.mutation(async () => ({ runId: await createMonitoringRun("manual") })),
    monitoringSchedule: protectedProcedure.query(async ({ ctx }) => getMonitoringSchedule(ctx.user.id)),
    activateDailySchedule: protectedProcedure.mutation(async ({ ctx }) => {
      if (process.env.NODE_ENV !== "production") throw new Error("Publish this site before activating the daily schedule.");
      await ensureCandidateProfile(ctx.user);
      const schedule = await getMonitoringSchedule(ctx.user.id);
      if (!schedule) throw new Error("Monitoring schedule was not initialized");
      const sessionToken = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
      const specification = {
        cron: DAILY_MONITORING_CRON,
        path: "/api/scheduled/daily-monitoring",
        payload: {},
        description: "Daily 8:30 AM IST Pharma QA/IPQA/OSD monitoring and owner notification",
      };
      if (schedule.scheduleCronTaskUid) {
        await updateHeartbeatJob(schedule.scheduleCronTaskUid, { ...specification, enable: true }, sessionToken);
        return { activated: true, existing: true };
      }
      const job = await createHeartbeatJob({ name: `pharma-daily-monitoring-${ctx.user.id}`, ...specification }, sessionToken);
      await saveMonitoringScheduleTask(ctx.user.id, job.taskUid);
      return { activated: true, existing: false, nextExecutionAt: job.nextExecutionAt };
    }),
  }),
});

export type AppRouter = typeof appRouter;
