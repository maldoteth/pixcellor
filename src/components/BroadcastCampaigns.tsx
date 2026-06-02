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

export default function BroadcastCampaigns() {
  const confirmDialog = useConfirmDialog();
  const [source, setSource] = useState<Source>("contacts");
  const [statuses, setStatuses] = useState<string[]>([]);
  const [industries, setIndustries] = useState<string[]>([]);
  const [allIndustries, setAllIndustries] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [preheader, setPreheader] = useState("");
  const [bodyHtml, setBodyHtml] = useState("<p></p>");
  const [testRecipient, setTestRecipient] = useState("");
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [sample, setSample] = useState<string[]>([]);
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from("contacts").select("industry").not("industry", "is", null);
      const uniq = Array.from(
        new Set((data || []).map((r: { industry: string | null }) => (r.industry || "").toLowerCase()).filter(Boolean))
      ).sort();
      setAllIndustries(uniq);
    })();
  }, []);

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
      },
    });
    setPreviewing(false);
    if (error || (data as { error?: string })?.error) {
      toast.error((data as { error?: string })?.error || error?.message || "Preview failed");
      return;
    }
    setPreviewCount((data as { recipientCount: number }).recipientCount);
    setSample((data as { sample: string[] }).sample || []);
  };

  const send = async (testOnly: boolean) => {
    const plain = bodyHtml.replace(/<[^>]+>/g, "").trim();
    if (!subject.trim() || plain.length === 0) {
      toast.error("Subject and body are required");
      return;
    }
    if (testOnly && !testRecipient.trim()) {
      toast.error("Enter a test recipient email");
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
        testRecipient: testOnly ? testRecipient.trim() : undefined,
      },
    });
    setSending(false);
    const result = data as { sent?: number; failed?: number; total?: number; error?: string } | null;
    if (error || result?.error) {
      toast.error(result?.error || error?.message || "Send failed");
      return;
    }
    toast.success(`Sent ${result?.sent}/${result?.total} (${result?.failed} failed)`);
  };

  const sourceLabel = useMemo(
    () => ({ contacts: "CRM contacts", customers: "Past customers", both: "CRM + customers" }[source]),
    [source],
  );

  return (
    <div className="space-y-4 min-w-0">
      {/* Audience */}
      <Card>
        <CardContent className="p-4 space-y-4">
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

          {source !== "customers" && (
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
