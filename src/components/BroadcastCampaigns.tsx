import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Eye, Wand2, X } from "lucide-react";
import { toast } from "sonner";
import RichEmailEditor from "./email/RichEmailEditor";
import EmailPreview from "./email/EmailPreview";
import { STARTER_TEMPLATES } from "./email/emailTemplates";
import { useConfirmDialog } from "@/components/ui/themed-dialogs";

type Source = "contacts" | "customers" | "both";

const STATUS_OPTIONS = ["cold", "aware", "warm", "hot", "gold"] as const;
const STATUS_COLORS: Record<string, string> = {
  cold: "hsl(217 91% 60%)",
  aware: "hsl(142 71% 45%)",
  warm: "hsl(25 95% 53%)",
  hot: "hsl(0 84% 60%)",
  gold: "hsl(45 93% 47%)",
};

type ContactRow = { id: string; name: string | null; email: string | null; status: string | null; industry: string | null };

export default function BroadcastCampaigns() {
  const confirmDialog = useConfirmDialog();
  const [source, setSource] = useState<Source | null>(null);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [industries, setIndustries] = useState<string[]>([]);
  const [allIndustries, setAllIndustries] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [preheader, setPreheader] = useState("");
  const [bodyHtml, setBodyHtml] = useState("<p></p>");
  const [testRecipient, setTestRecipient] = useState("");
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [sample, setSample] = useState<string[]>([]);
  const [suppressedCount, setSuppressedCount] = useState<number>(0);
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);

  // Add specific contacts
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [search, setSearch] = useState("");
  const [extraEmails, setExtraEmails] = useState<string[]>([]);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("contacts")
        .select("id,name,email,status,industry")
        .not("email", "is", null);
      const rows = (data || []) as ContactRow[];
      setContacts(rows);
      const uniq = Array.from(
        new Set(rows.map((r) => (r.industry || "").toLowerCase()).filter(Boolean))
      ).sort();
      setAllIndustries(uniq);
    })();
  }, []);

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q.length < 2) return [];
    return contacts
      .filter((c) => {
        const email = (c.email || "").toLowerCase();
        if (!email || extraEmails.includes(email)) return false;
        return email.includes(q) || (c.name || "").toLowerCase().includes(q);
      })
      .slice(0, 8);
  }, [search, contacts, extraEmails]);

  const addExtraEmail = (email: string) => {
    const e = email.trim().toLowerCase();
    if (!e) return;
    setExtraEmails((prev) => (prev.includes(e) ? prev : [...prev, e]));
    setSearch("");
    setPreviewCount(null);
  };
  const removeExtraEmail = (email: string) => {
    setExtraEmails((prev) => prev.filter((x) => x !== email));
    setPreviewCount(null);
  };

  const toggle = (list: string[], value: string) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  const loadTemplate = async (id: string) => {
    const tpl = STARTER_TEMPLATES.find((t) => t.id === id);
    if (!tpl) return;
    if (bodyHtml && bodyHtml.replace(/<[^>]+>/g, "").trim().length > 0) {
      const ok = await confirmDialog({ title: "Replace draft?", description: "Your current draft will be overwritten with this template.", confirmLabel: "Replace", destructive: true });
      if (!ok) return;
    }
    setSubject(tpl.subject);
    setPreheader(tpl.preheader);
    setBodyHtml(tpl.html);
  };

  const runPreview = async () => {
    setPreviewing(true);
    setPreviewCount(null);
    const { data, error } = await supabase.functions.invoke("send-broadcast", {
      body: {
        action: "preview",
        source,
        contactStatuses: source === "customers" ? [] : statuses,
        contactIndustries: source === "customers" ? [] : industries,
        extraEmails,
      },
    });
    setPreviewing(false);
    if (error || (data as { error?: string })?.error) {
      toast.error(
        (data as { error?: string })?.error ||
          error?.message ||
          "Couldn't load preview — check the recipient source, filters, and added emails.",
      );
      return;
    }
    const d = data as { recipientCount: number; sample?: string[]; suppressedCount?: number };
    setPreviewCount(d.recipientCount);
    setSample(d.sample || []);
    setSuppressedCount(d.suppressedCount ?? 0);
  };

  const send = async (testOnly: boolean) => {
    const plain = bodyHtml.replace(/<[^>]+>/g, "").trim();
    if (!subject.trim() && plain.length === 0) {
      toast.error("Add a subject line and email body before sending.");
      return;
    }
    if (!subject.trim()) {
      toast.error("Add a subject line before sending.");
      return;
    }
    if (plain.length === 0) {
      toast.error("Add an email body before sending.");
      return;
    }
    if (testOnly && !testRecipient.trim()) {
      toast.error("Enter a valid test recipient email address.");
      return;
    }
    if (!testOnly) {
      const ok = await confirmDialog({
        title: "Send broadcast?",
        description: `This will send to ${previewCount ?? "?"} recipients. This cannot be undone.`,
        confirmLabel: "Send broadcast",
        destructive: true,
      });
      if (!ok) return;
    }

    setSending(true);
    const { data, error } = await supabase.functions.invoke("send-broadcast", {
      body: {
        action: "send",
        subject: subject.trim(),
        preheader: preheader.trim() || undefined,
        bodyHtml,
        source,
        contactStatuses: source === "customers" ? [] : statuses,
        contactIndustries: source === "customers" ? [] : industries,
        extraEmails,
        testRecipient: testOnly ? testRecipient.trim() : undefined,
      },
    });
    setSending(false);
    const result = data as {
      sent?: number;
      failed?: number;
      total?: number;
      error?: string;
      suppressedEmails?: string[];
    } | null;
    if (error || result?.error) {
      let msg =
        result?.error ||
        error?.message ||
        "Couldn't send broadcast — check the recipients and try again.";
      if (result?.suppressedEmails?.length && !msg.includes("unsubscribed")) {
        msg += ` ${result.suppressedEmails.length} unsubscribed contact${result.suppressedEmails.length === 1 ? " was" : "s were"} skipped.`;
      }
      toast.error(msg);
      return;
    }
    toast.success(`Sent ${result?.sent}/${result?.total} (${result?.failed} failed)`);
  };

  const sourceLabel = useMemo(
    () => (source ? { contacts: "CRM contacts", customers: "Past customers", both: "CRM + customers" }[source] : "specific contacts"),
    [source],
  );

  return (
    <div className="space-y-4 min-w-0">
      {/* Audience */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Add specific contacts</div>
            <div className="relative">
              <Input
                placeholder="Search by name or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(search.trim())) {
                    e.preventDefault();
                    addExtraEmail(search);
                  }
                }}
              />
              {searchResults.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-popover shadow-lg max-h-64 overflow-y-auto">
                  {searchResults.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => addExtraEmail(c.email || "")}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50"
                    >
                      <span className="truncate">{c.name || c.email}</span>
                      <span className="text-xs text-muted-foreground font-mono truncate">{c.email}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {extraEmails.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {extraEmails.map((email) => (
                  <Badge key={email} variant="outline" className="gap-1 pr-1">
                    <span className="font-mono text-xs">{email}</span>
                    <button
                      type="button"
                      onClick={() => removeExtraEmail(email)}
                      className="rounded-sm hover:bg-muted p-0.5"
                      aria-label={`Remove ${email}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Recipient source</div>
            <div className="flex flex-wrap gap-2">
              {(["contacts", "customers", "both"] as Source[]).map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={source === s ? "default" : "outline"}
                  onClick={() => { setSource(s); setPreviewCount(null); }}
                >
                  {s === "contacts" ? "CRM contacts" : s === "customers" ? "Past customers" : "Both"}
                </Button>
              ))}
            </div>
          </div>

          {source && source !== "customers" && (
            <>
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Contact statuses</div>
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map((s) => {
                    const active = statuses.includes(s);
                    return (
                      <Badge
                        key={s}
                        onClick={() => { setStatuses((cur) => toggle(cur, s)); setPreviewCount(null); }}
                        className={`cursor-pointer capitalize border ${active ? "" : "opacity-40"}`}
                        style={{
                          backgroundColor: active ? STATUS_COLORS[s] : "transparent",
                          borderColor: STATUS_COLORS[s],
                          color: active ? "hsl(var(--background))" : STATUS_COLORS[s],
                        }}
                      >
                        {s}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              {allIndustries.length > 0 && (
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                    Industries {industries.length === 0 && <span className="text-muted-foreground/70">(all)</span>}
                  </div>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    {allIndustries.map((ind) => (
                      <Badge
                        key={ind}
                        onClick={() => { setIndustries((cur) => toggle(cur, ind)); setPreviewCount(null); }}
                        variant="outline"
                        className={`cursor-pointer capitalize ${industries.includes(ind) ? "border-primary text-primary" : "opacity-60"}`}
                      >
                        {ind}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}




          <div className="flex items-center gap-3 flex-wrap">
            <Button onClick={runPreview} disabled={previewing} variant="outline" size="sm">
              {previewing ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Eye className="w-3.5 h-3.5 mr-2" />}
              Preview audience
            </Button>
            {previewCount !== null && (
              <div className="text-sm">
                <span className="font-semibold">{previewCount}</span> recipients from {sourceLabel}
                {sample.length > 0 && <span className="text-muted-foreground"> · e.g. {sample.slice(0, 3).join(", ")}</span>}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Starter templates */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Wand2 className="w-4 h-4 text-muted-foreground" />
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Start from a template</div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {STARTER_TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => loadTemplate(t.id)}
                className="text-left p-3 border border-input rounded-md hover:bg-muted/50 transition-colors"
              >
                <div className="text-sm font-semibold">{t.name}</div>
                <div className="text-muted-foreground text-lg text-slate-50 bg-white/0 mt-0.5">{t.description}</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Composer + preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="space-y-2">
              <Input
                placeholder="Subject line"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={200}
              />
              <Input
                placeholder="Preheader (preview text shown in inbox — optional)"
                value={preheader}
                onChange={(e) => setPreheader(e.target.value)}
                maxLength={140}
              />
            </div>

            <RichEmailEditor value={bodyHtml} onChange={setBodyHtml} />

            <p className="text-muted-foreground text-lg text-slate-50 bg-white/0">
              From <code>hello@mail.pixcellor.com</code> · replies go to <code>hello@pixcellor.com</code> · branded header,
              footer and unsubscribe link are added automatically.
            </p>

            <div className="flex flex-wrap gap-2 items-center pt-1">
              <Input
                placeholder="Test recipient email"
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
                className="max-w-xs"
              />
              <Button onClick={() => send(true)} disabled={sending} variant="outline" size="sm">
                Send test
              </Button>
              <div className="flex-1" />
              <Button onClick={() => send(false)} disabled={sending || !previewCount} size="sm">
                {sending ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-2" />}
                Send to {previewCount ?? "—"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="lg:sticky lg:top-4 self-start">
          <EmailPreview subject={subject} bodyHtml={bodyHtml} preheader={preheader} />
        </div>
      </div>
    </div>
  );
}
