import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { ExternalLink, Mail, Phone, Search } from "lucide-react";
import { useState } from "react";

function cleanCompanyName(name: string) {
  return name.replace(/\s*\.+\s*$/g, "").trim();
}

function displayLocation(location: string | null) {
  if (!location || /see cited source|not every company had/i.test(location)) return "Location not verified";
  return location;
}

export default function Directory() {
  const [query, setQuery] = useState("");
  const directory = trpc.jobTracker.directory.useQuery({ query: query || undefined });
  const rows = directory.data ?? [];
  return <div className="max-w-[1440px] mx-auto space-y-6"><section><div className="flex items-center gap-2 text-xs font-semibold tracking-[0.18em] uppercase text-teal-700"><Search className="h-4 w-4" /> Public contact directory</div><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Source-cited pharma companies</h1><p className="mt-2 text-sm text-slate-600">Imported from your August 16–29 research. Public HR/careers contacts are shown only with their recorded source link.</p></section><div className="relative max-w-xl"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input className="pl-9 bg-white" placeholder="Search company or location" value={query} onChange={event => setQuery(event.target.value)} /></div><div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500"><tr><th className="p-4">Company</th><th className="p-4">Public contact</th><th className="p-4">August status</th><th className="p-4">Source</th></tr></thead><tbody>{rows.slice(0, 180).map(company => <tr key={company.id} className="border-t border-slate-100 align-top"><td className="p-4"><p className="font-semibold text-slate-900">{cleanCompanyName(company.name)}</p><p className="mt-1 max-w-xs text-xs text-slate-500">{displayLocation(company.primaryLocation)}</p></td><td className="p-4 space-y-1.5">{company.contacts.length ? company.contacts.map(contact => <p key={contact.id} className="flex items-center gap-2 text-slate-700">{contact.contactType === "phone" ? <Phone className="h-3.5 w-3.5 text-slate-400" /> : <Mail className="h-3.5 w-3.5 text-slate-400" />}<span>{contact.contactValue}</span></p>) : <span className="text-slate-400">Not publicly listed</span>}</td><td className="p-4"><Badge variant="outline" className="max-w-xs whitespace-normal text-left leading-5 text-slate-600">{company.augustWindowStatus || "No August role verified"}</Badge></td><td className="p-4">{company.careerUrl ? <a className="inline-flex items-center gap-1 font-medium text-teal-700 hover:text-teal-900" href={company.careerUrl} target="_blank" rel="noreferrer">Open source <ExternalLink className="h-3.5 w-3.5" /></a> : <span className="text-slate-400">Not verified</span>}</td></tr>)}</tbody></table></div></div>{rows.length > 180 && <p className="text-xs text-slate-500">Showing the first 180 results. Use search to narrow the source-cited directory.</p>}</div>;
}
