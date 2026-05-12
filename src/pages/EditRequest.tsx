import { FormEvent, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { ArrowLeft, CheckCircle2, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { ImageAttachmentUploader } from "@/components/ImageAttachmentUploader";
import SeoHead from "@/components/SeoHead";

const editRequestSchema = z.object({
  requestDetails: z.string().trim().min(1, "Tell us what needs changing").max(6000, "Keep this under 6000 characters"),
});

type EditRequestForm = z.infer<typeof editRequestSchema>;

const pricingButtonStyle = {
  background: "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.2)",
  boxShadow: `
    0 8px 32px rgba(0,0,0,0.3),
    inset 0 1px 1px rgba(255,255,255,0.3),
    inset 0 -1px 1px rgba(0,0,0,0.1)
  `,
} as const;

export default function EditRequest() {
  const [params] = useSearchParams();
  const orderCode = params.get("order") ?? "";
  const requirementsToken = params.get("token") ?? "";
  const [form, setForm] = useState<EditRequestForm>({ requestDetails: "" });
  const [attachments, setAttachments] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [remainingRequests, setRemainingRequests] = useState<number | null | undefined>(undefined);

  const validAccess = useMemo(
    () => /^PXC-[A-HJ-NP-Z]{4}-\d{4}$/.test(orderCode) && /^[A-Fa-f0-9]{64}$/.test(requirementsToken),
    [orderCode, requirementsToken],
  );

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!validAccess) {
      toast.error("This edit request link is missing a valid access token.");
      return;
    }

    const parsed = editRequestSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.flatten().fieldErrors.requestDetails?.[0] ?? "Tell us what needs changing");
      toast.error("Please complete the highlighted field.");
      return;
    }

    // Optimistic confirm; sync in background with retries.
    setSubmitted(true);
    toast.success("Edit request saved.");

    void (async () => {
      const maxAttempts = 3;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const { data, error: submitError } = await supabase.functions.invoke("submit-edit-request", {
          body: { orderCode, requirementsToken, ...parsed.data, attachments },
        });
        if (!submitError && !data?.error) {
          if (typeof data?.remainingRequests === "number") setRemainingRequests(data.remainingRequests);
          return;
        }
        if (attempt === maxAttempts) {
          console.error("edit request sync failed", submitError, data?.error);
          toast.error(data?.error || submitError?.message || "Couldn't sync your edit request — please reload and try again.");
          setSubmitted(false);
          return;
        }
        await new Promise((r) => setTimeout(r, 800 * attempt));
      }
    })();
  };

  if (submitted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12 text-foreground">
        <Card className="w-full max-w-2xl border-border bg-card/70 backdrop-blur-xl">
          <CardContent className="space-y-5 p-7 text-center md:p-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-primary/40 bg-primary/10">
              <CheckCircle2 className="h-9 w-9 text-primary" />
            </div>
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground">Pixcellor™ edit request</p>
              <h1 className="text-3xl font-semibold tracking-normal md:text-5xl">Edit request received</h1>
              <p className="leading-relaxed text-muted-foreground">
                We’ve reopened your order as live work and saved your requested changes.
                {typeof remainingRequests === "number" ? ` You have ${remainingRequests} edit request${remainingRequests === 1 ? "" : "s"} remaining.` : ""}
              </p>
            </div>
            <Button asChild>
              <Link to="/">Back to Pixcellor</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground md:py-12">
      <SeoHead
        title="Request website edits · Pixcellor™"
        description="Send Pixcellor edit requests for your live website. Tracked and handled by your project team."
        path="/edit-request"
        noindex
      />
      <section className="mx-auto w-full max-w-3xl space-y-6">
        <Button asChild variant="ghost" className="gap-2">
          <Link to="/"><ArrowLeft className="h-4 w-4" />Pixcellor</Link>
        </Button>

        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground">Pixcellor™ edit request</p>
          <h1 className="text-4xl font-semibold tracking-normal md:text-6xl">Request website edits</h1>
          <p className="max-w-2xl leading-relaxed text-muted-foreground">Send the changes you want made to your delivered website.</p>
        </div>

        <Card className="border-border bg-card/70 backdrop-blur-xl">
          <CardContent className="p-5 md:p-8">
            {!validAccess && (
              <div className="mb-5 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                This link is missing a valid access token. Open the edit request link from your delivery email.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="requestDetails">Edit request details</Label>
                <Textarea
                  id="requestDetails"
                  value={form.requestDetails}
                  onChange={(event) => {
                    setForm({ requestDetails: event.target.value });
                    setError("");
                  }}
                  rows={9}
                  maxLength={6000}
                  placeholder="List every change clearly. Include page names, exact text changes, image swaps, layout notes, links, or anything else we need."
                  className="min-h-52 resize-y"
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>

              <div className="space-y-2">
                <Label>Reference images (optional)</Label>
                <ImageAttachmentUploader
                  value={attachments}
                  onChange={setAttachments}
                  max={20}
                  prefix={`edit-requests/${orderCode || "unknown"}`}
                  disabled={submitting || !validAccess}
                />
              </div>

              <div className="flex flex-wrap justify-end gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting || !validAccess}
                  className="group relative flex items-center justify-center gap-2 overflow-hidden rounded-sm px-6 py-2 font-semibold text-foreground transition hover:brightness-125 disabled:cursor-not-allowed disabled:opacity-50"
                  style={pricingButtonStyle}
                >
                  <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-foreground/20 to-transparent transition-transform duration-700 ease-in-out group-hover:translate-x-full" />
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {submitting ? "Saving…" : "Send edit request"}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
