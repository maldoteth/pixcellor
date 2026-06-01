import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Clipboard, Inbox, Loader2, Mail, Phone, Plus, Search, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type MyLead = {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  notes: string | null;
  status: string;
  location: string | null;
  source: string;
  created_at: string;
};

type LeadFormKey = "name" | "phone" | "email" | "location" | "company" | "contact_name" | "notes";

type WizardField = {
  key: LeadFormKey;
  label: string;
  placeholder: string;
  required: boolean;
  inputMode: "text" | "tel" | "email" | "url";
  multiline?: boolean;
};

const leadWizardFields: WizardField[] = [
  { key: "name", label: "Business / lead name", placeholder: "e.g. Smith Roofing", required: true, inputMode: "text" },
  { key: "phone", label: "Phone", placeholder: "Phone number", required: false, inputMode: "tel" },
  { key: "email", label: "Email", placeholder: "name@company.com", required: false, inputMode: "email" },
  { key: "location", label: "Location", placeholder: "Town or area", required: false, inputMode: "text" },
  { key: "company", label: "Company", placeholder: "Company (if different)", required: false, inputMode: "text" },
  { key: "contact_name", label: "Contact name", placeholder: "Person you spoke to", required: false, inputMode: "text" },
  { key: "notes", label: "Notes", placeholder: "Anything to remember…", required: false, inputMode: "text", multiline: true },
];

const emptyForm = (): Record<LeadFormKey, string> => ({
  name: "", phone: "", email: "", location: "", company: "", contact_name: "", notes: "",
});

// Minimal RFC 4180 CSV parser (handles quotes and commas inside quoted fields)
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field); field = "";
        if (row.some((v) => v.trim() !== "")) rows.push(row);
        row = [];
      } else field += c;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); if (row.some((v) => v.trim() !== "")) rows.push(row); }
  return rows;
}

const normHeader = (h: string) => h.trim().toLowerCase().replace(/[\s_-]+/g, "");

const FIELD_ALIASES: Record<string, string[]> = {
  name: ["name", "fullname", "businessname", "company"],
  contact_name: ["contact", "contactname", "person", "firstname"],
  email: ["email", "emailaddress", "e-mail"],
  phone: ["phone", "mobile", "telephone", "tel", "number"],
  company: ["company", "business", "organisation", "organization"],
  notes: ["notes", "note", "comment", "comments", "message"],
  location: ["location", "city", "address", "town", "area"],
  status: ["status", "stage"],
};

function mapHeaders(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  headers.forEach((h, i) => {
    const k = normHeader(h);
    for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
      if (map[field] === undefined && aliases.includes(k)) map[field] = i;
    }
  });
  return map;
}

export default function MyLeadsPanel() {
  const [leads, setLeads] = useState<MyLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<Record<LeadFormKey, string>>(emptyForm());

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("customer_leads")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setLeads((data as MyLead[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter((l) =>
      [l.name, l.contact_name, l.email, l.phone, l.company, l.notes, l.status, l.location]
        .some((v) => v?.toLowerCase().includes(q)),
    );
  }, [leads, query]);

  const openWizard = () => {
    setForm(emptyForm());
    setStep(0);
    setDrawerOpen(true);
  };

  const currentField = leadWizardFields[step];

  const saveLead = async () => {
    const name = form.name.trim() || form.contact_name.trim() || form.company.trim() || form.email.trim();
    if (!name) { toast.error("Add at least a name"); return; }
    setSaving(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData.session?.user.id;
    if (!uid) { toast.error("Not signed in"); setSaving(false); return; }

    const { error } = await supabase.from("customer_leads").insert({
      owner_user_id: uid,
      name,
      contact_name: form.contact_name.trim() || null,
      email: form.email.trim().toLowerCase() || null,
      phone: form.phone.trim() || null,
      company: form.company.trim() || null,
      notes: form.notes.trim() || null,
      location: form.location.trim() || null,
      source: "customer_added",
      status: "new",
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Lead added");
    setDrawerOpen(false);
    setStep(0);
    setForm(emptyForm());
    load();
  };

  const continueWizard = (skip = false) => {
    const value = form[currentField.key].trim();
    if (currentField.required && !value) {
      toast.error(`${currentField.label} is required.`);
      return;
    }
    if (!skip && currentField.key === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      toast.error("Enter a valid email (or skip).");
      return;
    }
    if (skip && !currentField.required) setForm(f => ({ ...f, [currentField.key]: "" }));
    if (step < leadWizardFields.length - 1) setStep(s => s + 1);
    else if (!saving) void saveLead();
  };

  const pasteIntoField = async () => {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      setForm(f => ({ ...f, [currentField.key]: text }));
    } catch {
      toast.error("Clipboard not available");
    }
  };

  const handleDelete = async (id: string) => {
    const prev = leads;
    setLeads((s) => s.filter((l) => l.id !== id));
    const { error } = await supabase.from("customer_leads").delete().eq("id", id);
    if (error) { setLeads(prev); toast.error(error.message); }
  };

  const handleCsvFile = async (file: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("CSV must be under 5MB"); return; }
    setUploading(true);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (rows.length < 2) { toast.error("CSV is empty"); return; }
      const headerMap = mapHeaders(rows[0]);
      if (Object.keys(headerMap).length === 0) {
        toast.error("Could not detect columns. Include headers like name, email, phone.");
        return;
      }
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user.id;
      if (!uid) { toast.error("Not signed in"); return; }

      const pick = (row: string[], k: string) => {
        const i = headerMap[k];
        return i === undefined ? null : (row[i]?.trim() || null);
      };

      const records = rows.slice(1).map((row) => {
        const email = pick(row, "email");
        return {
          owner_user_id: uid,
          name: pick(row, "name") || pick(row, "contact_name") || pick(row, "company") || email || "Unnamed",
          contact_name: pick(row, "contact_name"),
          email: email ? email.toLowerCase() : null,
          phone: pick(row, "phone"),
          company: pick(row, "company"),
          notes: pick(row, "notes"),
          location: pick(row, "location"),
          status: (pick(row, "status") || "new").toLowerCase(),
          source: "csv_import",
        };
      }).filter((r) => (r.name && r.name !== "Unnamed") || r.email || r.phone);

      if (records.length === 0) { toast.error("No valid rows found"); return; }
      if (records.length > 2000) { toast.error("Max 2000 rows per upload"); return; }

      let inserted = 0;
      for (let i = 0; i < records.length; i += 500) {
        const chunk = records.slice(i, i + 500);
        const { error } = await supabase.from("customer_leads").insert(chunk);
        if (error) { toast.error(`Import failed: ${error.message}`); break; }
        inserted += chunk.length;
      }
      if (inserted > 0) {
        toast.success(`Imported ${inserted} lead${inserted === 1 ? "" : "s"}`);
        load();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "CSV import failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold">My leads <span className="text-sm font-normal text-muted-foreground">· {leads.length}</span></h2>
          <p className="text-sm text-muted-foreground">Leads you add or import. Only you can see these.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search my leads" className="pl-9" />
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCsvFile(f); }}
          />
          <Button variant="outline" size="sm" disabled={uploading} onClick={() => fileInputRef.current?.click()} className="gap-2">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Upload CSV
          </Button>
          <Button variant="pricing" size="sm" className="gap-2" onClick={openWizard}>
            <Plus className="h-4 w-4" /> Add lead
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        CSV tip: include a header row with any of <code>name, contact_name, email, phone, company, notes, location, status</code>.
      </p>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card/40 p-8 text-center">
          <Inbox className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">No leads yet</p>
          <p className="text-xs text-muted-foreground">Add one manually or upload a CSV to get started.</p>
        </div>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {filtered.map((lead) => (
            <Card key={lead.id} className="border-border bg-card/70">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="truncate text-base">{lead.contact_name || lead.name}</CardTitle>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {lead.company || lead.name} · {new Date(lead.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="capitalize">{lead.status}</Badge>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(lead.id)} aria-label="Delete lead">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 pb-4">
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  {lead.email && <a href={`mailto:${lead.email}`} className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"><Mail className="h-3.5 w-3.5" />{lead.email}</a>}
                  {lead.phone && <a href={`tel:${lead.phone}`} className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"><Phone className="h-3.5 w-3.5" />{lead.phone}</a>}
                  {lead.location && <span className="text-muted-foreground">{lead.location}</span>}
                </div>
                {lead.notes && <p className="whitespace-pre-wrap rounded-md border border-border bg-background/50 p-3 text-xs leading-relaxed text-muted-foreground">{lead.notes}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="border-border bg-background/95 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] backdrop-blur-xl">
          <DrawerHeader className="px-0 text-left">
            <DrawerTitle>Add a lead</DrawerTitle>
            <DrawerDescription>Step {step + 1} of {leadWizardFields.length}</DrawerDescription>
          </DrawerHeader>
          <div className="space-y-5">
            <div className="h-1.5 overflow-hidden rounded-none bg-muted">
              <div className="h-full rounded-none bg-primary transition-all" style={{ width: `${((step + 1) / leadWizardFields.length) * 100}%` }} />
            </div>
            <div className="space-y-3">
              <label className="text-sm font-medium">
                {currentField.label}{currentField.required ? " *" : ""}
              </label>
              <div className="flex gap-2">
                {currentField.multiline ? (
                  <Textarea
                    autoFocus
                    rows={4}
                    placeholder={currentField.placeholder}
                    value={form[currentField.key]}
                    onChange={(e) => setForm(f => ({ ...f, [currentField.key]: e.target.value }))}
                    className="text-base"
                  />
                ) : (
                  <Input
                    autoFocus
                    inputMode={currentField.inputMode}
                    placeholder={currentField.placeholder}
                    value={form[currentField.key]}
                    onChange={(e) => setForm(f => ({ ...f, [currentField.key]: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === "Enter") continueWizard(); }}
                    className="h-12 text-base"
                  />
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 shrink-0"
                  onClick={pasteIntoField}
                  aria-label={`Paste ${currentField.label}`}
                >
                  <Clipboard className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="rounded-none shadow-none"
                onClick={() => step > 0 ? setStep(s => s - 1) : setDrawerOpen(false)}
                disabled={saving}
              >
                {step > 0 ? "Back" : "Cancel"}
              </Button>
              <Button disabled={saving} onClick={() => continueWizard()}>
                {step === leadWizardFields.length - 1 ? (saving ? "Saving…" : "Save") : "Next"}
              </Button>
              {!currentField.required && (
                <Button variant="ghost" className="col-span-2" onClick={() => continueWizard(true)} disabled={saving}>
                  Skip
                </Button>
              )}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
