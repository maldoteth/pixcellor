import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Inbox, Loader2, Mail, Phone, Plus, Search, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: "",
    contact_name: "",
    email: "",
    phone: "",
    company: "",
    notes: "",
    location: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("customer_leads")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
    } else {
      setLeads((data as MyLead[]) ?? []);
    }
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

  const handleAdd = async () => {
    const name = form.name.trim() || form.contact_name.trim() || form.company.trim() || form.email.trim();
    if (!name) {
      toast.error("Add at least a name, contact, company, or email");
      return;
    }
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
    setAddOpen(false);
    setForm({ name: "", contact_name: "", email: "", phone: "", company: "", notes: "", location: "" });
    load();
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
      }).filter((r) => r.name && r.name !== "Unnamed" || r.email || r.phone);

      if (records.length === 0) { toast.error("No valid rows found"); return; }
      if (records.length > 2000) { toast.error("Max 2000 rows per upload"); return; }

      // Batch insert (chunks of 500)
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
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button variant="pricing" size="sm" className="gap-2"><Plus className="h-4 w-4" /> Add lead</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add a lead</DialogTitle>
                <DialogDescription>Saved privately to your account.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5 md:col-span-2"><Label>Business / lead name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Smith Roofing" /></div>
                <div className="space-y-1.5"><Label>Contact name</Label><Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Company</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div className="space-y-1.5 md:col-span-2"><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
                <div className="space-y-1.5 md:col-span-2"><Label>Notes</Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddOpen(false)} disabled={saving}>Cancel</Button>
                <Button onClick={handleAdd} disabled={saving} className="gap-2">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save lead
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
    </div>
  );
}
