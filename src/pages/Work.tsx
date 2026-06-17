import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, MapPin, Search, Briefcase, PoundSterling, Calendar } from "lucide-react";

type Vac = {
  id: string;
  title: string;
  location: string | null;
  arrangement: string | null;
  employment_type: string | null;
  start_date: string | null;
  end_date: string | null;
  pay_min: number | null;
  pay_max: number | null;
  pay_currency: string | null;
  pay_period: string | null;
  openings: number;
  required_skills: string[] | null;
  description: string | null;
  created_at: string;
};

const ARRANGEMENTS = ["onsite", "remote", "hybrid"];
const EMPLOYMENT = ["permanent", "contract", "temporary", "freelance", "internship"];

export default function Work() {
  const [rows, setRows] = useState<Vac[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [location, setLocation] = useState("");
  const [arrangement, setArrangement] = useState<string>("any");
  const [employment, setEmployment] = useState<string>("any");
  const [minPay, setMinPay] = useState<string>("");

  useEffect(() => {
    document.title = "Open Vacancies | Pixcellor Work";
    const meta = document.querySelector('meta[name="description"]') || (() => {
      const m = document.createElement("meta"); m.setAttribute("name", "description"); document.head.appendChild(m); return m;
    })();
    meta.setAttribute("content", "Browse open vacancies at Pixcellor. Search by role, location, remote/hybrid, salary and employment type.");
    const linkCanon = document.querySelector('link[rel="canonical"]') || (() => {
      const l = document.createElement("link"); l.setAttribute("rel", "canonical"); document.head.appendChild(l); return l;
    })();
    linkCanon.setAttribute("href", "https://pixcellor.com/work");
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("public_open_vacancies" as never, {
      _search: q || null,
      _location: location || null,
      _arrangement: arrangement === "any" ? null : arrangement,
      _employment_type: employment === "any" ? null : employment,
      _min_pay: minPay ? Number(minPay) : null,
    } as never);
    setLoading(false);
    if (!error) setRows((data as Vac[]) ?? []);
  }, [q, location, arrangement, employment, minPay]);

  useEffect(() => { void load(); }, [load]);

  const fmtPay = (v: Vac) => {
    if (v.pay_min == null && v.pay_max == null) return null;
    const cur = (v.pay_currency || "GBP") === "GBP" ? "£" : (v.pay_currency || "");
    const lo = v.pay_min != null ? `${cur}${v.pay_min}` : "";
    const hi = v.pay_max != null ? `${cur}${v.pay_max}` : "";
    const range = lo && hi ? `${lo} – ${hi}` : (lo || hi);
    return `${range} / ${v.pay_period ?? "year"}`;
  };

  const jsonLd = useMemo(() => ({
    "@context": "https://schema.org",
    "@graph": rows.slice(0, 20).map((v) => ({
      "@type": "JobPosting",
      title: v.title,
      description: v.description ?? v.title,
      datePosted: v.created_at,
      employmentType: (v.employment_type || "FULL_TIME").toUpperCase(),
      hiringOrganization: { "@type": "Organization", name: "Pixcellor", sameAs: "https://pixcellor.com" },
      jobLocation: v.location ? { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: v.location } } : undefined,
      jobLocationType: v.arrangement === "remote" ? "TELECOMMUTE" : undefined,
      baseSalary: v.pay_min || v.pay_max ? {
        "@type": "MonetaryAmount",
        currency: v.pay_currency || "GBP",
        value: { "@type": "QuantitativeValue", minValue: v.pay_min, maxValue: v.pay_max, unitText: (v.pay_period || "YEAR").toUpperCase() },
      } : undefined,
    })),
  }), [rows]);

  return (
    <div className="min-h-screen bg-black text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="border-b border-white/10 bg-black/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link to="/" className="text-lg font-semibold tracking-tight">Pixcellor<span className="text-white/40">™</span> Work</Link>
          <Link to="/jobs/apply" className="text-sm text-white/70 hover:text-white">Candidate sign up →</Link>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 pt-12 pb-6">
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">Open vacancies</h1>
        <p className="mt-3 text-white/60 max-w-2xl">Live roles across our client network. Filter by location, remote/hybrid, salary and contract type.</p>
      </section>

      <section className="max-w-6xl mx-auto px-6">
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4 grid gap-3 md:grid-cols-12">
            <div className="md:col-span-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Role, skill, keyword…" className="pl-9 bg-black/40 border-white/10" />
            </div>
            <div className="md:col-span-3 relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location" className="pl-9 bg-black/40 border-white/10" />
            </div>
            <div className="md:col-span-2">
              <Select value={arrangement} onValueChange={setArrangement}>
                <SelectTrigger className="bg-black/40 border-white/10"><SelectValue placeholder="Arrangement" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any arrangement</SelectItem>
                  {ARRANGEMENTS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Select value={employment} onValueChange={setEmployment}>
                <SelectTrigger className="bg-black/40 border-white/10"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any type</SelectItem>
                  {EMPLOYMENT.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-1">
              <Input value={minPay} onChange={(e) => setMinPay(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="Min £" className="bg-black/40 border-white/10" inputMode="decimal" />
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-white/50"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading vacancies…</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-20 text-white/50">No open vacancies match your filters.</div>
        ) : (
          <ul className="grid gap-3">
            {rows.map((v) => (
              <li key={v.id}>
                <Card className="bg-white/5 border-white/10 hover:border-white/30 transition-colors">
                  <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg font-medium truncate">{v.title}</h2>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/60">
                        {v.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{v.location}</span>}
                        {v.arrangement && <span className="inline-flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{v.arrangement}</span>}
                        {fmtPay(v) && <span className="inline-flex items-center gap-1"><PoundSterling className="h-3.5 w-3.5" />{fmtPay(v)}</span>}
                        {v.start_date && <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />Starts {new Date(v.start_date).toLocaleDateString()}</span>}
                      </div>
                      {v.required_skills && v.required_skills.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {v.required_skills.slice(0, 6).map((s) => (
                            <Badge key={s} variant="outline" className="border-white/15 text-white/70">{s}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {v.employment_type && <Badge className="bg-white/10 text-white border-0">{v.employment_type}</Badge>}
                      <Button asChild size="sm" variant="secondary">
                        <Link to={`/jobs/apply?vacancy=${v.id}`}>Apply</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="border-t border-white/10 mt-12">
        <div className="max-w-6xl mx-auto px-6 py-8 text-sm text-white/40 flex justify-between">
          <span>© Pixcellor</span>
          <Link to="/" className="hover:text-white">Back to site</Link>
        </div>
      </footer>
    </div>
  );
}
