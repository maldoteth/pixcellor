import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { ArrowLeft, CheckCircle2, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { ImageAttachmentUploader } from "@/components/ImageAttachmentUploader";
import SeoHead from "@/components/SeoHead";

const requirementsSchema = z.object({
  siteName: z.string().trim().min(1, "Add the site or business name").max(160, "Keep this under 160 characters"),
  siteContents: z.string().trim().min(1, "Add the main site contents").max(4000, "Keep this under 4000 characters"),
  pagesDetails: z.string().trim().min(1, "Add the pages and what each page needs").max(6000, "Keep this under 6000 characters"),
  coloursStyles: z.string().trim().min(1, "Add colours and style direction").max(4000, "Keep this under 4000 characters"),
  referenceLinks: z.string().trim().max(4000, "Keep this under 4000 characters"),
  imagesContentSocials: z.string().trim().min(1, "Add images/content/social links or where we can access them").max(6000, "Keep this under 6000 characters"),
  extraNotes: z.string().trim().max(3000, "Keep this under 3000 characters"),
});

type RequirementsForm = z.infer<typeof requirementsSchema>;
type FieldName = keyof RequirementsForm;

const initialForm: RequirementsForm = {
  siteName: "",
  siteContents: "",
  pagesDetails: "",
  coloursStyles: "",
  referenceLinks: "",
  imagesContentSocials: "",
  extraNotes: "",
};

const textAreas: Array<{
  name: FieldName;
  label: string;
  placeholder: string;
  rows: number;
}> = [
  {
    name: "siteContents",
    label: "Site contents",
    placeholder: "What should the site say? Include sections, copy, offers, services, FAQs, policies, or any rough notes.",
    rows: 5,
  },
  {
    name: "pagesDetails",
    label: "Pages and page details",
    placeholder: "List every page you want and what should go on each one. Example: Home, About, Services, Contact, Booking, Gallery.",
    rows: 6,
  },
  {
    name: "coloursStyles",
    label: "Colours, styles, and direction",
    placeholder: "Brand colours, mood, layout preferences, fonts, competitors, things you like/dislike, and the overall vibe.",
    rows: 5,
  },
  {
    name: "referenceLinks",
    label: "Reference links",
    placeholder: "Paste websites, Pinterest boards, Instagram pages, competitors, or examples you want us to use as reference.",
    rows: 4,
  },
  {
    name: "imagesContentSocials",
    label: "Images, content, and socials",
    placeholder: "Paste Google Drive/Dropbox links, image notes, logos, social handles, contact details, testimonials, product lists, or file locations.",
    rows: 6,
  },
  {
    name: "extraNotes",
    label: "Anything else",
    placeholder: "Deadlines, must-haves, integrations, domain details, booking links, payment links, or anything we should avoid.",
    rows: 4,
  },
];

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

export default function ProjectRequirements() {
  const [params] = useSearchParams();
  const orderCode = params.get("order") ?? "";
  const requirementsToken = params.get("token") ?? "";
  const [form, setForm] = useState<RequirementsForm>(initialForm);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(false);

  const validAccess = useMemo(
    () => /^PXC-[A-HJ-NP-Z]{4}-\d{4}$/.test(orderCode) && /^[A-Fa-f0-9]{64}$/.test(requirementsToken),
    [orderCode, requirementsToken],
  );

  const updateField = (name: FieldName, value: string) => {
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  };

  useEffect(() => {
    if (!validAccess) return;
    let cancelled = false;
    setCheckingExisting(true);
    supabase.functions.invoke("submit-project-requirements", {
      body: { orderCode, requirementsToken },
    }).then(({ data }) => {
      if (!cancelled && data?.already_submitted) setAlreadySubmitted(true);
    }).finally(() => {
      if (!cancelled) setCheckingExisting(false);
    });

    return () => {
      cancelled = true;
    };
  }, [orderCode, requirementsToken, validAccess]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!validAccess) {
      toast.error("This requirements link is missing a valid access token.");
      return;
    }

    const parsed = requirementsSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setErrors(Object.fromEntries(Object.entries(fieldErrors).map(([key, value]) => [key, value?.[0]])) as Partial<Record<FieldName, string>>);
      toast.error("Please complete the highlighted fields.");
      return;
    }

    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("submit-project-requirements", {
      body: { orderCode, requirementsToken, ...parsed.data, attachments },
    });
    setSubmitting(false);

    if (data?.already_submitted) {
      setAlreadySubmitted(true);
      toast.message("Already submitted!");
      return;
    }

    if (error || data?.error) {
      toast.error(data?.error || error?.message || "Could not save requirements");
      return;
    }

    setSubmitted(true);
    toast.success("Requirements saved.");
  };

  if (submitted || alreadySubmitted) {
    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-2xl border-border bg-card/70 backdrop-blur-xl">
          <CardContent className="p-7 md:p-10 text-center space-y-5">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-primary/40 bg-primary/10">
              <CheckCircle2 className="h-9 w-9 text-primary" />
            </div>
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground">Pixcellor™ project brief</p>
              <h1 className="text-3xl md:text-5xl font-semibold tracking-normal">{alreadySubmitted ? "Already submitted!" : "Requirements received"}</h1>
              <p className="text-muted-foreground leading-relaxed">{alreadySubmitted ? "Thanks — your project brief is already saved and linked to your order." : "We’ve saved your project details and linked them to your order."}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild>
                <Link to="/customer-portal">Go to profile dashboard</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/">Back to Pixcellor</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground px-4 py-8 md:py-12">
      <section className="mx-auto w-full max-w-4xl space-y-6">
        <Button asChild variant="ghost" className="gap-2">
          <Link to="/"><ArrowLeft className="h-4 w-4" />Pixcellor</Link>
        </Button>

        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground">Pixcellor™ project brief</p>
          <h1 className="text-4xl md:text-6xl font-semibold tracking-normal">Add your website requirements</h1>
          <p className="max-w-2xl text-muted-foreground leading-relaxed">Send us the key details we need to shape your build: site name, page structure, style direction, references, assets, content, and socials.</p>
        </div>

        <Card className="border-border bg-card/70 backdrop-blur-xl">
          <CardContent className="p-5 md:p-8">
            {!validAccess && (
              <div className="mb-5 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                This link is missing a valid access token. Open the project requirements link from your confirmation email.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="siteName">Site or business name</Label>
                <Input
                  id="siteName"
                  value={form.siteName}
                  onChange={(event) => updateField("siteName", event.target.value)}
                  maxLength={160}
                  placeholder="Example: Pixcellor™"
                />
                {errors.siteName && <p className="text-sm text-destructive">{errors.siteName}</p>}
              </div>

              {textAreas.map((field) => (
                <div className="space-y-2" key={field.name}>
                  <Label htmlFor={field.name}>{field.label}</Label>
                  <Textarea
                    id={field.name}
                    value={form[field.name]}
                    onChange={(event) => updateField(field.name, event.target.value)}
                    rows={field.rows}
                    placeholder={field.placeholder}
                    maxLength={field.name === "pagesDetails" || field.name === "imagesContentSocials" ? 6000 : field.name === "extraNotes" ? 3000 : 4000}
                    className="min-h-28 resize-y"
                  />
                  {errors[field.name] && <p className="text-sm text-destructive">{errors[field.name]}</p>}
                </div>
              ))}

              <div className="space-y-2">
                <Label>Upload images (logos, references, screenshots, content)</Label>
                <ImageAttachmentUploader
                  value={attachments}
                  onChange={setAttachments}
                  max={30}
                  prefix={`project-requirements/${orderCode || "unknown"}`}
                  disabled={submitting || !validAccess}
                />
              </div>

              <div className="flex flex-wrap justify-end gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting || checkingExisting || !validAccess}
                  className="rounded-sm px-6 py-2 font-semibold text-foreground hover:brightness-125 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 relative overflow-hidden group"
                  style={pricingButtonStyle}
                >
                  <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-foreground/20 to-transparent pointer-events-none" />
                  {submitting || checkingExisting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {submitting ? "Saving…" : checkingExisting ? "Checking…" : "Send requirements"}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
