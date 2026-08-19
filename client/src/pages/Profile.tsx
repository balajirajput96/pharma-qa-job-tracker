import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Save, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type ProfileForm = {
  fullName: string;
  email: string;
  phone: string;
  qualification: string;
  experienceYears: number;
  currentRole: string;
  skills: string;
  preferredLocations: string;
  cvVersion: string;
};
const emptyForm: ProfileForm = {
  fullName: "",
  email: "",
  phone: "",
  qualification: "B.Pharm / M.Pharm",
  experienceYears: 2,
  currentRole: "QA / IPQA – Tablet Compression Support",
  skills:
    "IPQA, Tablet Compression, OSD, GMP, Line Clearance, BMR/BPR, In-Process Checks",
  preferredLocations:
    "Vadodara, Ahmedabad, Halol, Sanand, Ankleshwar, Bharuch, India-wide",
  cvVersion: "QA-OSD-v1",
};

export default function Profile() {
  const utils = trpc.useUtils();
  const profile = trpc.jobTracker.profile.useQuery();
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  useEffect(() => {
    if (profile.data)
      setForm({
        ...profile.data,
        email: profile.data.email ?? "",
        phone: profile.data.phone ?? "",
      });
  }, [profile.data]);
  const save = trpc.jobTracker.saveProfile.useMutation({
    onSuccess: async () => {
      await utils.jobTracker.profile.invalidate();
      await utils.jobTracker.dashboard.invalidate();
      toast.success("Profile saved. New rankings now use these preferences.");
    },
    onError: error => toast.error(error.message),
  });
  const change = (key: keyof ProfileForm, value: string | number) =>
    setForm(current => ({ ...current, [key]: value }));
  return (
    <div className="max-w-4xl mx-auto space-y-7">
      <section>
        <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.18em] uppercase text-teal-700">
          <UserRound className="h-4 w-4" /> Candidate profile
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
          Make every match personal
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          These details control Gujarat-first scoring and the information placed
          into application drafts.
        </p>
      </section>
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle>QA / IPQA profile</CardTitle>
          <CardDescription>
            Only include skills and experience you can support in an interview.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          {[
            ["fullName", "Full name", "text"],
            ["email", "Email", "email"],
            ["phone", "Phone", "tel"],
            ["qualification", "Qualification", "text"],
            ["experienceYears", "Experience (years)", "number"],
            ["currentRole", "Current role", "text"],
            ["cvVersion", "CV version", "text"],
          ].map(([key, label, type]) => (
            <div key={key} className="space-y-2">
              <Label htmlFor={key}>{label}</Label>
              <Input
                id={key}
                type={type}
                value={form[key as keyof ProfileForm] as string | number}
                onChange={event =>
                  change(
                    key as keyof ProfileForm,
                    type === "number"
                      ? Number(event.target.value)
                      : event.target.value
                  )
                }
              />
            </div>
          ))}
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="skills">Skills</Label>
            <Textarea
              id="skills"
              value={form.skills}
              onChange={event => change("skills", event.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="locations">Preferred locations</Label>
            <Textarea
              id="locations"
              value={form.preferredLocations}
              onChange={event =>
                change("preferredLocations", event.target.value)
              }
              rows={2}
            />
            <p className="text-xs text-slate-500">
              Keep Vadodara, Ahmedabad, Halol, Sanand and Ankleshwar first to
              preserve your location preference.
            </p>
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <Button
              className="bg-slate-950 hover:bg-slate-800"
              onClick={() =>
                save.mutate({
                  ...form,
                  email: form.email || null,
                  phone: form.phone || null,
                })
              }
              disabled={save.isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              {save.isPending ? "Saving…" : "Save profile"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
