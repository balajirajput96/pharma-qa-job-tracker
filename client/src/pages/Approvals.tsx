import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, MailCheck, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function Approvals() {
  const utils = trpc.useUtils();
  const drafts = trpc.jobTracker.drafts.useQuery();
  const approve = trpc.jobTracker.approveDraft.useMutation({
    onSuccess: async () => {
      await utils.jobTracker.drafts.invalidate();
      toast.success("Draft approved and ready for your Gmail handoff.");
    },
  });
  const markSent = trpc.jobTracker.markDraftSent.useMutation({
    onSuccess: async () => {
      await utils.jobTracker.drafts.invalidate();
      await utils.jobTracker.applications.invalidate();
      toast.success("Sent status logged in your application tracker.");
    },
    onError: error => toast.error(error.message),
  });
  const rows = drafts.data ?? [];
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <section>
        <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.18em] uppercase text-teal-700">
          <ShieldCheck className="h-4 w-4" /> Human approval gate
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
          Review every application before it leaves
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          The subject is locked to the required wording. Approval changes a
          draft to an approved Gmail handoff; it never silently sends email.
        </p>
      </section>
      <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 flex gap-3">
        <MailCheck className="mt-0.5 h-5 w-5 text-indigo-700" />
        <p className="text-sm leading-6 text-slate-700">
          <strong>Gmail handoff:</strong> after you approve a draft, open it in
          the Gmail account already signed in to your browser, personally press
          Send, then record the sent status here.
        </p>
      </div>
      {rows.length === 0 ? (
        <Card className="border-dashed border-slate-300">
          <CardContent className="p-10 text-center">
            <p className="font-medium text-slate-800">
              No drafts waiting for review.
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Create a draft from any ranked vacancy when you are ready to
              apply.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {rows.map(row => {
            const gmailHref = row.draft.recipient
              ? `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(row.draft.recipient)}&su=${encodeURIComponent(row.draft.subject)}&body=${encodeURIComponent(row.draft.body)}`
              : null;
            return (
              <Card key={row.draft.id} className="border-slate-200 shadow-sm">
                <CardHeader className="flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg">
                      {row.company.name}
                    </CardTitle>
                    <p className="mt-1 text-sm text-slate-500">
                      {row.vacancy.title}
                    </p>
                  </div>
                  <Badge
                    className={
                      row.draft.approvalStatus === "sent"
                        ? "bg-indigo-700"
                        : row.draft.approvalStatus === "approved"
                          ? "bg-teal-700"
                          : "bg-slate-800"
                    }
                  >
                    {row.draft.approvalStatus === "sent"
                      ? "Sent"
                      : row.draft.approvalStatus === "approved"
                        ? "Approved"
                        : "Draft"}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-sm">
                    <p>
                      <span className="font-medium text-slate-700">To:</span>{" "}
                      {row.draft.recipient ||
                        "No public HR/careers email verified — review source first"}
                    </p>
                    <p className="mt-1">
                      <span className="font-medium text-slate-700">
                        Subject:
                      </span>{" "}
                      {row.draft.subject}
                    </p>
                  </div>
                  <pre className="whitespace-pre-wrap rounded-lg border border-slate-100 bg-white p-4 text-sm leading-6 text-slate-700 font-sans">
                    {row.draft.body}
                  </pre>
                  {row.draft.approvalStatus === "draft" ? (
                    <Button
                      className="bg-teal-700 hover:bg-teal-800"
                      onClick={() => approve.mutate({ draftId: row.draft.id })}
                      disabled={approve.isPending}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Approve for Gmail handoff
                    </Button>
                  ) : row.draft.approvalStatus === "approved" ? (
                    <div className="flex flex-wrap gap-2">
                      {gmailHref ? (
                        <Button
                          className="bg-slate-950 hover:bg-slate-800"
                          asChild
                        >
                          <a href={gmailHref} target="_blank" rel="noreferrer">
                            Open in Gmail
                          </a>
                        </Button>
                      ) : (
                        <Button disabled>Public email required</Button>
                      )}
                      <Button
                        variant="outline"
                        onClick={() =>
                          markSent.mutate({ draftId: row.draft.id })
                        }
                        disabled={markSent.isPending}
                      >
                        I sent this email
                      </Button>
                    </div>
                  ) : (
                    <p className="inline-flex items-center gap-2 text-sm font-medium text-indigo-700">
                      <CheckCircle2 className="h-4 w-4" />
                      Sent status recorded in tracker.
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
