import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Eye } from "lucide-react";
import { toast } from "sonner";

type Source = "contacts" | "customers" | "both";

const STATUS_OPTIONS = ["cold", "aware", "warm", "hot", "gold"] as const;

type ContactRow = { email: string | null; status: string | null; industry: string | null };

export default function BroadcastCampaigns() {
  const [source, setSource] = useState<Source>("contacts");
  const [statuses, setStatuses] = useState<string[]>(["warm", "hot", "gold"]);
  const [industries, setIndustries] = useState<string[]>([]);
  const [allIndustries, setAllIndustries] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [testRecipient, setTestRecipient] = useState("");
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [sample, setSample] = useState<string[]>([]);
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from("contacts").select("industry").not("industry", "is", null);
      const uniq = Array.from(new Set((data || []).map((r: { industry: string | null }) => (r.industry || "").toLowerCase()).filter(Boolean))).sort();
      setAllIndustries(uniq);
    })();
  }, []);

  const toggle = (list: string[], value: string) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

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
    if (!subject.trim() || !body.trim()) {
      toast.error("Subject and body are required");
      return;
    }
    if (testOnly && !testRecipient.trim()) {
      toast.error("Enter a test recipient email");
      return;
    }
    if (!testOnly && !confirm(`Send to ${previewCount ?? "?"} recipients? This cannot be undone.`)) return;

    setSending(true);
    const { data, error } = await supabase.functions.invoke("send-broadcast", {
      body: {
        action: "send",
        subject: subject.trim(),
        bodyText: body.trim(),
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

  const sourceLabel = useMemo(() => ({
    contacts: "CRM contacts",
    customers: "Past customers",
    both: "CRM + customers",
  }[source]), [source]);

  return (
    <div className="space-y-4 min-w-0">
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
                  {STATUS_OPTIONS.map((s) => (
                    <Badge
                      key={s}
                      onClick={() => { setStatuses((cur) => toggle(cur, s)); setPreviewCount(null); }}
                      className={`cursor-pointer capitalize ${statuses.includes(s) ? "" : "opacity-40"}`}
                    >
                      {s}
                    </Badge>
                  ))}
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

          <div className="flex items-center gap-3">
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

      <Card>
        <CardContent className="p-4 space-y-3">
          <Input
            placeholder="Subject line"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={200}
          />
          <textarea
            placeholder="Email body (plain text — paragraphs auto-formatted)"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="min-h-[280px] w-full rounded-none border border-input bg-background px-3 py-2 text-sm font-mono"
          />
          <p className="text-xs text-muted-foreground">
            Sent from <code>hello@mail.pixcellor.com</code>. An unsubscribe link and footer are appended automatically. Replies go to <code>hello@pixcellor.com</code>.
          </p>

          <div className="flex flex-wrap gap-2 items-center">
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
    </div>
  );
}
