import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Search, UserPlus, Loader2, Trash2 } from "lucide-react";

type ContactStatus = "cold" | "aware" | "hot" | "gold";

type Contact = {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  industry: string;
  location: string | null;
  notes: string | null;
  status: ContactStatus;
  source: string;
  created_at: string;
  updated_at: string;
};

const contactStatuses: { value: ContactStatus; label: string; color: string }[] = [
  { value: "cold", label: "Cold", color: "hsl(217 91% 60%)" },
  { value: "aware", label: "Aware", color: "hsl(142 71% 45%)" },
  { value: "hot", label: "Hot", color: "hsl(0 84% 60%)" },
  { value: "gold", label: "Client", color: "hsl(45 93% 47%)" },
];

const getStatusColor = (s: ContactStatus) => contactStatuses.find(x => x.value === s)?.color ?? "hsl(var(--muted))";
const getStatusLabel = (s: ContactStatus) => contactStatuses.find(x => x.value === s)?.label ?? s;

const formatPhoneHref = (value?: string | null) => {
  if (!value) return null;
  const cleaned = value.replace(/[^\d+]/g, "");
  return cleaned ? `tel:${cleaned}` : null;
};

const emptyForm = {
  name: "",
  contact_name: "",
  email: "",
  phone: "",
  website: "",
  industry: "",
  location: "",
  notes: "",
  status: "cold" as ContactStatus,
};

export default function AffiliateCrmPanel() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ContactStatus>("all");
  const [sort, setSort] = useState<"newest" | "oldest" | "latest_update">("newest");

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [matches, setMatches] = useState<Contact[]>([]);
  const [showMatches, setShowMatches] = useState(false);

  const [editing, setEditing] = useState<Contact | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("contacts")
      .select("id,name,contact_name,email,phone,website,industry,location,notes,status,source,created_at,updated_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      toast.error(error.message);
    } else {
      setContacts((data ?? []) as Contact[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!alive) return;
      setUserId(data.user?.id ?? null);
      await load();
    })();
    return () => { alive = false; };
  }, [load]);

  // Live duplicate / close-match suggestions as user types name
  const matchTimer = useRef<number | null>(null);
  useEffect(() => {
    if (matchTimer.current) window.clearTimeout(matchTimer.current);
    const q = form.name.trim();
    if (q.length < 3) {
      setMatches([]);
      setShowMatches(false);
      return;
    }
    matchTimer.current = window.setTimeout(async () => {
      const { data } = await supabase
        .from("contacts")
        .select("id,name,contact_name,email,phone,website,industry,location,notes,status,source,created_at,updated_at")
        .ilike("name", `%${q}%`)
        .limit(8);
      const list = (data ?? []) as Contact[];
      setMatches(list);
      setShowMatches(list.length > 0);
    }, 200);
    return () => { if (matchTimer.current) window.clearTimeout(matchTimer.current); };
  }, [form.name]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = contacts;
    if (q) {
      list = list.filter(c =>
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.phone && c.phone.toLowerCase().includes(q)) ||
        (c.contact_name && c.contact_name.toLowerCase().includes(q)) ||
        (c.notes && c.notes.toLowerCase().includes(q)) ||
        (c.industry && c.industry.toLowerCase().includes(q))
      );
    }
    if (statusFilter !== "all") list = list.filter(c => c.status === statusFilter);
    const sorted = [...list];
    if (sort === "newest") sorted.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    if (sort === "oldest") sorted.sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
    if (sort === "latest_update") sorted.sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at));
    return sorted;
  }, [contacts, search, statusFilter, sort]);

  const openAdd = () => {
    setForm(emptyForm);
    setMatches([]);
    setShowMatches(false);
    setAddOpen(true);
  };

  const handleCreate = async () => {
    if (!userId) { toast.error("You must be signed in"); return; }
    const name = form.name.trim();
    if (!name) { toast.error("Name is required"); return; }

    // App-side duplicate check against this user's own contacts
    const dupName = contacts.find(c => (c.name ?? "").trim().toLowerCase() === name.toLowerCase());
    if (dupName) { toast.error(`You already have a client called "${dupName.name}"`); return; }
    const emailNorm = form.email.trim().toLowerCase();
    if (emailNorm) {
      const dupEmail = contacts.find(c => (c.email ?? "").trim().toLowerCase() === emailNorm);
      if (dupEmail) { toast.error(`You already have a client with email ${dupEmail.email}`); return; }
    }

    setSaving(true);
    const { error } = await supabase.from("contacts").insert({
      name,
      contact_name: form.contact_name.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      website: form.website.trim() || null,
      industry: form.industry.trim() || "Unknown",
      location: form.location.trim() || null,
      notes: form.notes.trim() || null,
      status: form.status,
      source: "affiliate",
      created_by_user_id: userId,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Client added");
    setAddOpen(false);
    await load();
  };

  const handleUpdate = async () => {
    if (!editing) return;
    setSaving(true);
    const { error } = await supabase
      .from("contacts")
      .update({
        name: editing.name,
        contact_name: editing.contact_name,
        email: editing.email,
        phone: editing.phone,
        website: editing.website,
        industry: editing.industry || "Unknown",
        location: editing.location,
        notes: editing.notes,
        status: editing.status,
      })
      .eq("id", editing.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
    setEditing(null);
    await load();
  };

  const handleDelete = async () => {
    if (!editing) return;
    if (!confirm("Delete this client?")) return;
    const { error } = await supabase.from("contacts").delete().eq("id", editing.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    setEditing(null);
    await load();
  };

  return (
    <div className="min-w-0 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px] md:max-w-[65%]">
          <Search className="pointer-events-none absolute left-3 top-[calc(50%+1px)] h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your CRM by name, email, company, phone, notes…"
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openAdd} className="h-9 shrink-0">
            <UserPlus className="w-4 h-4 mr-2" /> Add Client
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <span className="text-muted-foreground text-slate-50 bg-white/0 text-xs">Sort:</span>
        {([
          { value: "newest", label: "Newest" },
          { value: "oldest", label: "Oldest" },
          { value: "latest_update", label: "Updated" },
        ] as const).map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setSort(opt.value)}
            className={`rounded-none border px-2 py-1 text-xs transition-colors ${sort === opt.value ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground"}`}
          >
            {opt.label}
          </button>
        ))}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-slate-50 bg-white/0 text-xs md:ml-2">Type:</span>
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`rounded-none border px-2 py-1 text-xs transition-colors ${statusFilter === "all" ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground"}`}
          >
            All
          </button>
          {contactStatuses.map(s => (
            <button
              key={s.value}
              type="button"
              onClick={() => setStatusFilter(s.value)}
              className={`flex items-center gap-1.5 rounded-none border px-2 py-1 text-xs transition-colors ${statusFilter === s.value ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground"}`}
            >
              <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading your CRM…
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm py-4">No clients {search ? "match your search" : "yet — add your first one"}.</p>
      ) : (
        <div className="max-h-[70vh] overflow-y-auto pr-1 space-y-2 rounded-none border border-border/40 bg-card/20 p-2">
          {filtered.map(c => {
            const color = getStatusColor(c.status);
            return (
              <Card
                key={c.id}
                role="button"
                tabIndex={0}
                className="cursor-pointer overflow-hidden transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                onClick={() => setEditing(c)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setEditing(c); } }}
              >
                <CardContent className="space-y-1 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-medium">{c.name || c.email || "Unnamed contact"}</div>
                    <div className="flex items-center gap-2">
                      <Badge style={{ backgroundColor: color, color: "hsl(var(--background))" }} className="rounded-none">{getStatusLabel(c.status)}</Badge>
                    </div>
                  </div>
                  <div className="text-muted-foreground text-slate-50 bg-white/0 text-xs">
                    {(() => {
                      const parts: React.ReactNode[] = [];
                      if (c.email) parts.push(<a key="email" href={`mailto:${c.email}`} className="text-primary underline-offset-4 hover:underline" onClick={(e) => e.stopPropagation()}>{c.email}</a>);
                      if (c.phone) parts.push(<a key="phone" href={formatPhoneHref(c.phone) || undefined} className="text-primary underline-offset-4 hover:underline" onClick={(e) => e.stopPropagation()}>{c.phone}</a>);
                      if (c.location) parts.push(<span key="loc">{c.location}</span>);
                      if (c.industry) parts.push(<span key="ind">{c.industry}</span>);
                      if (parts.length === 0) return "No details on file";
                      return parts.map((node, i) => (
                        <React.Fragment key={i}>
                          {i > 0 && <span className="mx-1">·</span>}
                          {node}
                        </React.Fragment>
                      ));
                    })()}
                  </div>
                  {c.notes && <p className="block text-sm text-muted-foreground whitespace-pre-line">{c.notes}</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add client</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Label className="text-xs">Company / client name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                onFocus={() => { if (matches.length > 0) setShowMatches(true); }}
                onBlur={() => { window.setTimeout(() => setShowMatches(false), 150); }}
                placeholder="Acme Ltd"
                autoFocus
              />
              {showMatches && matches.length > 0 && (
                <div className="absolute z-50 mt-1 w-full rounded-none border border-border bg-popover shadow-md max-h-64 overflow-auto">
                  <div className="px-3 py-2 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border/60">
                    Close matches in your CRM
                  </div>
                  {matches.map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); setAddOpen(false); setEditing(m); }}
                      className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-muted/60"
                    >
                      <span className="font-medium">{m.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {[m.email, m.phone, m.industry].filter(Boolean).join(" · ") || "No details"}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Contact name</Label>
                <Input value={form.contact_name} onChange={(e) => setForm(f => ({ ...f, contact_name: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.status}
                  onChange={(e) => setForm(f => ({ ...f, status: e.target.value as ContactStatus }))}
                >
                  {contactStatuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Website</Label>
                <Input value={form.website} onChange={(e) => setForm(f => ({ ...f, website: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Industry</Label>
                <Input value={form.industry} onChange={(e) => setForm(f => ({ ...f, industry: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Location</Label>
                <Input value={form.location} onChange={(e) => setForm(f => ({ ...f, location: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Notes</Label>
                <Textarea rows={3} value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Add client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.name || "Client"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label className="text-xs">Company / client name</Label>
                  <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Contact name</Label>
                  <Input value={editing.contact_name ?? ""} onChange={(e) => setEditing({ ...editing, contact_name: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Status</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={editing.status}
                    onChange={(e) => setEditing({ ...editing, status: e.target.value as ContactStatus })}
                  >
                    {contactStatuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input type="email" value={editing.email ?? ""} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Phone</Label>
                  <Input value={editing.phone ?? ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Website</Label>
                  <Input value={editing.website ?? ""} onChange={(e) => setEditing({ ...editing, website: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Industry</Label>
                  <Input value={editing.industry ?? ""} onChange={(e) => setEditing({ ...editing, industry: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Location</Label>
                  <Input value={editing.location ?? ""} onChange={(e) => setEditing({ ...editing, location: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Notes</Label>
                  <Textarea rows={4} value={editing.notes ?? ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="flex justify-between gap-2">
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>Cancel</Button>
              <Button onClick={handleUpdate} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
