import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ClipboardCheck, MapPin } from "lucide-react";
import { toast } from "sonner";

const statuses = ["to_apply", "applied", "follow_up", "interview_scheduled", "offer", "rejected"] as const;
const labels: Record<(typeof statuses)[number], string> = { to_apply: "To Apply", applied: "Applied", follow_up: "Follow-up", interview_scheduled: "Interview Scheduled", offer: "Offer", rejected: "Rejected" };

export default function Applications() {
  const utils = trpc.useUtils();
  const applications = trpc.jobTracker.applications.useQuery();
  const update = trpc.jobTracker.updateApplicationStatus.useMutation({ onSuccess: async () => { await utils.jobTracker.applications.invalidate(); toast.success("Application status updated."); } });
  const rows = applications.data ?? [];
  return <div className="max-w-5xl mx-auto space-y-6"><section><div className="flex items-center gap-2 text-xs font-semibold tracking-[0.18em] uppercase text-teal-700"><ClipboardCheck className="h-4 w-4" /> Application tracker</div><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Keep your follow-ups visible</h1><p className="mt-2 text-sm text-slate-600">Applications appear here when you create a draft. Update the status only after the real-world action happens.</p></section>{rows.length === 0 ? <Card className="border-dashed border-slate-300"><CardContent className="p-10 text-center"><p className="font-medium text-slate-800">No applications in your tracker yet.</p><p className="mt-2 text-sm text-slate-500">Return to Ranked jobs and create an application draft for a suitable vacancy.</p></CardContent></Card> : <div className="grid gap-3">{rows.map(row => <Card key={row.application.id} className="border-slate-200 shadow-sm"><CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between"><div><div className="flex items-center gap-2"><Badge variant="outline" className="text-teal-800 border-teal-200">{labels[row.application.status]}</Badge><span className="text-xs text-slate-500">CV: {row.application.cvVersion || "Not set"}</span></div><h2 className="mt-2 font-semibold text-slate-950">{row.vacancy.title}</h2><p className="mt-1 text-sm text-slate-600">{row.company.name} <span className="mx-1">·</span> <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{row.vacancy.location}</span></p></div><div className="flex items-center gap-2"><select aria-label="Application status" value={row.application.status} onChange={event => update.mutate({ applicationId: row.application.id, status: event.target.value as (typeof statuses)[number] })} className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm">{statuses.map(status => <option key={status} value={status}>{labels[status]}</option>)}</select><Button variant="outline" size="sm" onClick={() => update.mutate({ applicationId: row.application.id, status: "applied" })}>Mark applied</Button></div></CardContent></Card>)}</div>}</div>;
}
