import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle2 } from "lucide-react";
import SeoHead from "@/components/SeoHead";
import { toast } from "sonner";

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/candidates-apply`;

export default function CandidateApply() {
  const [form, setForm] = useState({
    full_name: "", email: "", phone: "", location: "", headline: "",
    current_role_title: "", years_experience: "" as string,
    desired_work_type: "any", desired_arrangement: "any", right_to_work: "unknown",
    skills: "", linkedin_url: "", portfolio_url: "", notes: "",
  });
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.full_name.trim()) { toast.error("Please enter your name"); return; }
    if (!form.email.trim() && !form.phone.trim()) { toast.error("Email or phone required"); return; }
    setSubmitting(true);
    try {
      let cv_url: string | undefined;
      if (cvFile) {
        // Public-bucket-less upload via signed-URL workflow handled later by admin reviewing. For now we just store filename in notes.
        // (CV upload from public form requires a public bucket or signed upload; keep simple in this MVP.)
      }
      const payload: any = {
        ...form,
        years_experience: form.years_experience ? Number(form.years_experience) : undefined,
        skills: form.skills ? form.skills.split(",").map(s => s.trim()).filter(Boolean) : undefined,
        cv_url,
        notes: cvFile ? `${form.notes}\n[CV attachment: ${cvFile.name} — please request from candidate]` : form.notes,
        source: "apply_page",
      };
      const res = await fetch(FN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j.error ?? "Submission failed");
      setDone(true);
    } catch (e: any) {
      toast.error(e.message ?? "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <SeoHead title="Application received · Pixcellor" description="Your application has been received." path="/jobs/apply" noindex />
        <Card className="max-w-md w-full p-8 text-center">
          <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-emerald-400" />
          <h1 className="text-xl font-semibold">Thanks, {form.full_name.split(" ")[0]}</h1>
          <p className="mt-2 text-sm text-muted-foreground">We've received your details. Our recruitment team will be in touch if there's a match.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <SeoHead title="Apply for a role · Pixcellor" description="Submit your details and CV to be considered for roles we're recruiting for." path="/jobs/apply" />
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="text-center space-y-2">
          <h1 className="text-3xl font-semibold">Looking for work?</h1>
          <p className="text-muted-foreground">Tell us about you. We'll match you to roles our clients are hiring for.</p>
        </header>

        <Card className="p-6 space-y-4">
          <Grid>
            <F label="Full name *"><Input value={form.full_name} onChange={e => update("full_name", e.target.value)} /></F>
            <F label="Headline (e.g. Senior plumber)"><Input value={form.headline} onChange={e => update("headline", e.target.value)} /></F>
            <F label="Email"><Input type="email" value={form.email} onChange={e => update("email", e.target.value)} /></F>
            <F label="Phone"><Input value={form.phone} onChange={e => update("phone", e.target.value)} /></F>
            <F label="Location"><Input value={form.location} onChange={e => update("location", e.target.value)} /></F>
            <F label="Years experience"><Input type="number" value={form.years_experience} onChange={e => update("years_experience", e.target.value)} /></F>
            <F label="Current role"><Input value={form.current_role_title} onChange={e => update("current_role_title", e.target.value)} /></F>
            <F label="LinkedIn"><Input value={form.linkedin_url} onChange={e => update("linkedin_url", e.target.value)} /></F>
            <F label="Portfolio / website"><Input value={form.portfolio_url} onChange={e => update("portfolio_url", e.target.value)} /></F>
            <F label="Work type">
              <Select value={form.desired_work_type} onValueChange={v => update("desired_work_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["any","permanent","contract","temp","freelance"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <F label="Arrangement">
              <Select value={form.desired_arrangement} onValueChange={v => update("desired_arrangement", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["any","onsite","hybrid","remote"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <F label="Right to work in UK">
              <Select value={form.right_to_work} onValueChange={v => update("right_to_work", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{[["unknown","Prefer not to say"],["uk_citizen","UK citizen"],["settled","Settled / ILR"],["visa_required","Need visa sponsorship"]].map(([v,l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </F>
          </Grid>
          <F label="Skills (comma-separated)"><Input value={form.skills} onChange={e => update("skills", e.target.value)} placeholder="React, Node, AWS" /></F>
          <F label="Anything else we should know?"><Textarea rows={4} value={form.notes} onChange={e => update("notes", e.target.value)} /></F>
          <F label="CV (PDF / DOC — optional)">
            <Input type="file" accept=".pdf,.doc,.docx" onChange={e => setCvFile(e.target.files?.[0] ?? null)} />
            {cvFile && <p className="text-xs text-muted-foreground mt-1">Selected: {cvFile.name}</p>}
          </F>
          <Button className="w-full" onClick={submit} disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Submit Work Profile
          </Button>
        </Card>
      </div>
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>;
}
function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}
