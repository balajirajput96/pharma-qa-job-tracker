import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import {
  Building2,
  CalendarDays,
  Download,
  ExternalLink,
  Mail,
  MapPin,
  Phone,
  Plus,
  Radar,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

function routeLabel(route: string) {
  return route === "walk_in"
    ? "Walk-in"
    : route === "direct"
      ? "Direct vacancy"
      : "Source review";
}

function cleanCompanyName(name: string) {
  return name.replace(/\s*\.+\s*$/g, "").trim();
}

function displayLocation(location: string) {
  return /see cited source|not every company had/i.test(location)
    ? "Location not verified — see source"
    : location;
}

export default function Dashboard() {
  const utils = trpc.useUtils();
  const jobs = trpc.jobTracker.dashboard.useQuery();
  const schedule = trpc.jobTracker.monitoringSchedule.useQuery();
  const dailyReport = trpc.jobTracker.dailyReport.useQuery(undefined, {
    enabled: false,
  });
  const activateSchedule = trpc.jobTracker.activateDailySchedule.useMutation({
    onSuccess: async () => {
      await utils.jobTracker.monitoringSchedule.invalidate();
      toast.success("Daily 8:30 AM IST monitoring has been activated.");
    },
    onError: error => toast.error(error.message),
  });
  const runMonitoring = trpc.jobTracker.runMonitoring.useMutation({
    onSuccess: async () => {
      await utils.jobTracker.dashboard.invalidate();
      toast.success(
        "Monitoring record created and sourced vacancies refreshed."
      );
    },
  });
  const createDraft = trpc.jobTracker.createDraft.useMutation({
    onSuccess: async () => {
      await utils.jobTracker.drafts.invalidate();
      toast.success(
        "A personalised application draft was added to the approval queue."
      );
    },
    onError: error => toast.error(error.message),
  });
  const downloadReport = async () => {
    const result = await dailyReport.refetch();
    if (!result.data) return toast.error("The report could not be generated.");
    const url = URL.createObjectURL(
      new Blob([result.data.csv], { type: "text/csv;charset=utf-8" })
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = result.data.filename;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success(
      "Source-cited daily CSV exported. Add it to your connected GitHub repository for version history."
    );
  };

  const items = jobs.data ?? [];
  const matched = items.filter(item => item.vacancy.matchScore >= 70);
  const walkIns = items.filter(
    item => item.vacancy.employmentRoute === "walk_in"
  );
  const gujarat = items.filter(item => item.vacancy.locationPriority > 0);

  return (
    <div className="space-y-7 max-w-[1440px] mx-auto">
      <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.18em] uppercase text-teal-700">
            <Radar className="h-4 w-4" /> Daily opportunity monitor
          </div>
          <h1 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight text-slate-950">
            Your QA/IPQA job radar
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Ranked around your two-year QA, IPQA and OSD tablet-compression
            profile. Gujarat opportunities lead; India-wide roles remain visible
            as backups.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={downloadReport}
            disabled={dailyReport.isFetching}
          >
            <Download className="mr-2 h-4 w-4" />
            {dailyReport.isFetching ? "Preparing…" : "Export daily CSV"}
          </Button>
          <Button
            className="bg-slate-950 hover:bg-slate-800"
            onClick={() => runMonitoring.mutate()}
            disabled={runMonitoring.isPending}
          >
            <Radar className="mr-2 h-4 w-4" />{" "}
            {runMonitoring.isPending
              ? "Refreshing…"
              : "Refresh monitored research"}
          </Button>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [
            "Ranked vacancies",
            items.length,
            Building2,
            "Source-cited opportunities",
          ],
          [
            "Strong profile matches",
            matched.length,
            Sparkles,
            "Score 70 or higher",
          ],
          ["Gujarat-priority roles", gujarat.length, MapPin, "Vadodara first"],
          [
            "Walk-in notices",
            walkIns.length,
            CalendarDays,
            "Verify venue before travel",
          ],
        ].map(([label, value, Icon, detail]) => {
          const MetricIcon = Icon as typeof Building2;
          return (
            <Card
              key={label as string}
              className="border-slate-200 shadow-sm bg-white"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <p className="text-sm font-medium text-slate-600">
                    {label as string}
                  </p>
                  <MetricIcon className="h-4 w-4 text-teal-700" />
                </div>
                <p className="mt-3 text-3xl font-semibold text-slate-950">
                  {value as number}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {detail as string}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            Daily monitoring schedule
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Every day at <strong>8:30 AM IST</strong>{" "}
            <span className="text-slate-400">·</span>{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
              0 0 3 * * *
            </code>{" "}
            UTC
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            className={
              schedule.data?.enabled
                ? "bg-teal-700 hover:bg-teal-700"
                : "bg-slate-700 hover:bg-slate-700"
            }
          >
            {schedule.data?.enabled
              ? "Scheduled"
              : "Prepared — publish to activate"}
          </Badge>
          {!schedule.data?.enabled && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => activateSchedule.mutate()}
              disabled={activateSchedule.isPending}
            >
              Activate after publishing
            </Button>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-teal-100 bg-teal-50/70 p-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-3">
          <div className="mt-0.5 rounded-full bg-teal-700 p-2 text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-slate-950">
              Every outgoing application remains under your control.
            </p>
            <p className="mt-1 text-sm text-slate-600">
              This workspace only creates drafts. Nothing is sent until you
              approve it in the approval queue.
            </p>
          </div>
        </div>
        <Badge className="w-fit bg-white text-teal-800 border border-teal-200 hover:bg-white">
          Approval required
        </Badge>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">
              Ranked opportunities
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Scores use your editable profile, QA/IPQA/OSD signals, experience
              cues and Gujarat location priority.
            </p>
          </div>
          <Badge variant="outline" className="text-slate-600">
            August research import
          </Badge>
        </div>
        {jobs.isLoading ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
            Loading sourced vacancies…
          </div>
        ) : (
          <div className="grid gap-4">
            {items.slice(0, 18).map(item => {
              const email = item.contacts.find(
                contact =>
                  contact.contactType === "hr" ||
                  contact.contactType === "careers"
              );
              const phone = item.contacts.find(
                contact => contact.contactType === "phone"
              );
              return (
                <Card
                  key={item.vacancy.id}
                  className="border-slate-200 shadow-sm overflow-hidden"
                >
                  <CardContent className="p-0">
                    <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className="bg-slate-950 hover:bg-slate-950">
                            Match {item.vacancy.matchScore}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-teal-800 border-teal-200"
                          >
                            {routeLabel(item.vacancy.employmentRoute)}
                          </Badge>
                          {item.vacancy.twoYearMatch && (
                            <Badge
                              variant="outline"
                              className="text-indigo-700 border-indigo-200"
                            >
                              2-year band
                            </Badge>
                          )}
                        </div>
                        <h3 className="mt-3 text-lg font-semibold leading-6 text-slate-950">
                          {item.vacancy.title}
                        </h3>
                        <p className="mt-1 text-sm font-medium text-slate-700">
                          {cleanCompanyName(item.company.name)}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin className="h-4 w-4 text-slate-400" />
                            {displayLocation(item.vacancy.location)}
                          </span>
                          {item.vacancy.walkInDateText && (
                            <span className="inline-flex items-center gap-1.5">
                              <CalendarDays className="h-4 w-4 text-slate-400" />
                              {item.vacancy.walkInDateText}
                            </span>
                          )}
                          {email && (
                            <span className="inline-flex items-center gap-1.5">
                              <Mail className="h-4 w-4 text-slate-400" />
                              {email.contactValue}
                            </span>
                          )}
                          {phone && (
                            <span className="inline-flex items-center gap-1.5">
                              <Phone className="h-4 w-4 text-slate-400" />
                              {phone.contactValue}
                            </span>
                          )}
                        </div>
                        {item.vacancy.eligibility && (
                          <p className="mt-4 text-sm leading-6 text-slate-600">
                            <span className="font-medium text-slate-700">
                              Eligibility / salary:
                            </span>{" "}
                            {item.vacancy.eligibility}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-row gap-2 lg:flex-col">
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={item.vacancy.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Source <ExternalLink className="ml-2 h-3.5 w-3.5" />
                          </a>
                        </Button>
                        <Button
                          size="sm"
                          className="bg-teal-700 hover:bg-teal-800"
                          onClick={() =>
                            createDraft.mutate({ vacancyId: item.vacancy.id })
                          }
                          disabled={createDraft.isPending}
                        >
                          <Plus className="mr-1.5 h-3.5 w-3.5" />
                          Draft application
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
