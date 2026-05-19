import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Wand2, X } from "lucide-react";
import GenerationProgress from "@/components/GenerationProgress";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { STEPS, SUGGESTIONS, EMAIL_RE, type StepKey } from "@/components/VisionGenerator";

type Stage = StepKey | "destination" | "generating";

interface AdminVisionWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (row: any) => void;
}

const BUCKET = "vision-previews";

const dataUrlToBlob = (dataUrl: string) => {
  const [meta, b64] = dataUrl.split(",");
  const mime = /data:(.*?);base64/.exec(meta)?.[1] ?? "image/png";
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
};

const makeSlug = () => {
  const a = "abcdefghijkmnopqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 10; i++) s += a[Math.floor(Math.random() * a.length)];
  return s;
};

const publicUrl = (path: string) =>
  supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

export default function AdminVisionWizard({ open, onOpenChange, onCreated }: AdminVisionWizardProps) {
  const isMobile = useIsMobile();
  const [stage, setStage] = useState<Stage>("company");
  const [answers, setAnswers] = useState<Record<StepKey, string>>({
    company: "",
    industry: "",
    vibe: "",
    colour: "",
    sections: "",
  });
  const [title, setTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [destError, setDestError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  type ClientMatch = {
    source: "contact" | "profile";
    company: string;
    name?: string | null;
    email?: string | null;
    industry?: string | null;
    colours?: string | null;
    notes?: string | null;
  };
  const [clientMatches, setClientMatches] = useState<ClientMatch[]>([]);
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [searchingClients, setSearchingClients] = useState(false);

  useEffect(() => {
    setDropdownOpen(false);
  }, [stage]);

  // Search client database (admin only) when typing the company name
  useEffect(() => {
    if (stage !== "company") {
      setClientSearchOpen(false);
      return;
    }
    const q = answers.company.trim();
    if (q.length < 2) {
      setClientMatches([]);
      setClientSearchOpen(false);
      return;
    }
    let cancelled = false;
    setSearchingClients(true);
    const t = setTimeout(async () => {
      try {
        const like = `%${q}%`;
        const [contactsRes, profilesRes] = await Promise.all([
          (supabase as any)
            .from("contacts")
            .select("name, contact_name, email, industry")
            .or(`name.ilike.${like},contact_name.ilike.${like}`)
            .limit(8),
          (supabase as any)
            .from("client_profiles")
            .select("name, company, email, brand_colours, requirements")
            .or(`company.ilike.${like},name.ilike.${like},email.ilike.${like}`)
            .limit(8),
        ]);
        if (cancelled) return;
        const matches: ClientMatch[] = [];
        for (const c of contactsRes.data ?? []) {
          matches.push({
            source: "contact",
            company: c.name,
            name: c.contact_name,
            email: c.email,
            industry: c.industry,
          });
        }
        for (const p of profilesRes.data ?? []) {
          matches.push({
            source: "profile",
            company: p.company || p.name,
            name: p.name,
            email: p.email,
            colours: p.brand_colours,
            notes: p.requirements,
          });
        }
        // Dedupe by company+email
        const seen = new Set<string>();
        const unique = matches.filter((m) => {
          const k = `${(m.company ?? "").toLowerCase()}|${(m.email ?? "").toLowerCase()}`;
          if (seen.has(k)) return false;
          seen.add(k);
          return !!m.company;
        });
        setClientMatches(unique.slice(0, 8));
        setClientSearchOpen(unique.length > 0);
      } catch (e) {
        console.error("client search failed", e);
      } finally {
        if (!cancelled) setSearchingClients(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [answers.company, stage]);

  const pickClientMatch = (m: ClientMatch) => {
    setAnswers((a) => ({
      ...a,
      company: m.company,
      industry: a.industry || m.industry || "",
      colour: a.colour || m.colours || "",
    }));
    if (m.name) setClientName((prev) => prev || m.name!);
    if (m.email) setClientEmail((prev) => prev || m.email!);
    if (m.company) setTitle((prev) => prev || `${m.company} v1`);
    setClientSearchOpen(false);
    setDropdownOpen(false);
  };

  // Reset when closed
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStage("company");
        setAnswers({ company: "", industry: "", vibe: "", colour: "", sections: "" });
        setTitle("");
        setClientName("");
        setClientEmail("");
        setDestError(null);
        setBusy(false);
      }, 250);
    }
  }, [open]);

  const currentIndex = STEPS.findIndex((s) => s.key === stage);
  const currentStep = currentIndex >= 0 ? STEPS[currentIndex] : null;

  const buildBrief = (data: Record<StepKey, string>) => {
    const parts: string[] = [];
    for (const s of STEPS) {
      const v = data[s.key].trim();
      if (v) parts.push(`${s.prefix}: ${v}`);
    }
    const company = data.company.trim();
    if (company) {
      parts.push(`The site must be branded as "${company}" — feature this name prominently at the top of the page, in the header/logo, and any branded elements.`);
    }
    return parts.join("\n");
  };

  const applySuggestion = (key: StepKey, value: string) => {
    setAnswers((a) => {
      const current = a[key].trim();
      if (key === "sections") {
        const items = current ? current.split(",").map((s) => s.trim()).filter(Boolean) : [];
        const exists = items.findIndex((s) => s.toLowerCase() === value.toLowerCase());
        if (exists >= 0) items.splice(exists, 1);
        else items.push(value);
        return { ...a, sections: items.join(", ") };
      }
      return { ...a, [key]: value };
    });
  };

  const isSuggestionActive = (key: StepKey, value: string) => {
    const current = answers[key].trim();
    if (!current) return false;
    if (key === "sections") {
      return current
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .includes(value.toLowerCase());
    }
    return current.toLowerCase() === value.toLowerCase();
  };

  const filteredSuggestions = (() => {
    if (!currentStep) return [];
    const list = SUGGESTIONS[currentStep.key];
    if (!list) return [];
    const raw = answers[currentStep.key] ?? "";
    let needle = raw.trim().toLowerCase();
    if (currentStep.key === "sections") {
      const parts = raw.split(",");
      needle = (parts[parts.length - 1] ?? "").trim().toLowerCase();
    }
    if (!needle) return [];
    return list.filter(
      (s) => s.label.toLowerCase().includes(needle) || s.value.toLowerCase().includes(needle),
    );
  })();

  const goNext = () => {
    if (!currentStep) return;
    if (currentIndex === STEPS.length - 1) {
      setStage("destination");
    } else {
      setStage(STEPS[currentIndex + 1].key);
    }
  };

  const goSkip = () => {
    if (!currentStep) return;
    setAnswers((a) => ({ ...a, [currentStep.key]: "" }));
    if (currentIndex === STEPS.length - 1) setStage("destination");
    else setStage(STEPS[currentIndex + 1].key);
  };

  const goBack = () => {
    if (currentIndex > 0) setStage(STEPS[currentIndex - 1].key);
  };

  const sendEmail = async (row: any, name: string | undefined, recipient: string) => {
    try {
      const previewUrl = `${window.location.origin}/preview/${row.slug}`;
      const imageUrl = publicUrl(row.image_path);
      const { error } = await supabase.functions.invoke("send-vision-preview", {
        body: {
          previewId: row.id,
          recipientEmail: recipient,
          clientName: name,
          title: row.title ?? undefined,
          brief: row.brief ?? undefined,
          previewUrl,
          imageUrl,
        },
      });
      if (error) throw error;
      const sentAt = new Date().toISOString();
      await (supabase as any)
        .from("vision_previews")
        .update({ sent_at: sentAt, client_email: recipient })
        .eq("id", row.id);
      toast.success(`Sent to ${recipient}`);
      return { ...row, sent_at: sentAt, client_email: recipient };
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send email");
      return row;
    }
  };

  const generate = async () => {
    const trimmedEmail = clientEmail.trim();
    if (trimmedEmail && !EMAIL_RE.test(trimmedEmail)) {
      setDestError("Please enter a valid email or leave it blank.");
      return;
    }
    const brief = buildBrief(answers);
    if (brief.length < 5) {
      toast.error("Add at least one detail.");
      setStage("company");
      return;
    }
    setDestError(null);
    setBusy(true);
    setStage("generating");
    try {
      const { data, error } = await supabase.functions.invoke("generate-vision", {
        body: { prompt: brief },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const imageUrl: string | undefined = data?.imageUrl;
      if (!imageUrl) throw new Error("No image returned");

      let blob: Blob;
      if (imageUrl.startsWith("data:")) blob = dataUrlToBlob(imageUrl);
      else {
        const res = await fetch(imageUrl);
        if (!res.ok) throw new Error("Failed to fetch generated image");
        blob = await res.blob();
      }

      const slug = makeSlug();
      const path = `${slug}.png`;
      const upload = await supabase.storage.from(BUCKET).upload(path, blob, {
        contentType: blob.type || "image/png",
        upsert: false,
      });
      if (upload.error) throw upload.error;

      const userRes = await supabase.auth.getUser();
      const email = userRes.data.user?.email ?? null;
      const userId = userRes.data.user?.id ?? null;

      const insert = await (supabase as any)
        .from("vision_previews")
        .insert({
          slug,
          brief,
          title: title.trim() || answers.company.trim() || null,
          image_path: path,
          created_by_user_id: userId,
          created_by_email: email,
          client_email: trimmedEmail || null,
        })
        .select()
        .single();
      if (insert.error) throw insert.error;

      let row = insert.data;

      // Extract brand kit so palette/fonts show on thumbnails and preview page
      const publicImg = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
      try {
        const { data: kit } = await supabase.functions.invoke("extract-vision-brand-kit", {
          body: { slug, imageUrl: publicImg, brief },
        });
        if (kit?.palette || kit?.fonts) {
          row = { ...row, palette: kit.palette ?? null, fonts: kit.fonts ?? null };
        }
      } catch (e) {
        console.error("brand kit extract failed", e);
      }

      if (trimmedEmail) {
        row = await sendEmail(row, clientName.trim() || undefined, trimmedEmail);
      }

      onCreated(row);
      toast.success("Preview created — link is ready to share.");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate vision");
      setStage("destination");
    } finally {
      setBusy(false);
    }
  };

  const stepBody = currentStep && (
    <motion.div
      key={currentStep.key}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.18 }}
      className="flex flex-col gap-3"
    >
      <div className="flex items-center justify-between">
        <label className="text-foreground/70 text-xs uppercase tracking-wider">
          Step {currentIndex + 1} of {STEPS.length}
        </label>
        <div className="flex gap-1">
          {STEPS.map((s, i) => (
            <span
              key={s.key}
              className={`h-1 w-6 rounded-full ${i <= currentIndex ? "bg-foreground/70" : "bg-foreground/15"}`}
            />
          ))}
        </div>
      </div>
      <p className="text-foreground text-base font-semibold uppercase tracking-wider">{currentStep.label}</p>
      <p className="text-foreground/60 text-xs text-slate-200 whitespace-pre-wrap">{currentStep.helper}</p>

      <div className="relative">
        {currentStep.multiline ? (
          <textarea
            autoFocus
            value={answers[currentStep.key]}
            onChange={(e) => {
              const v = e.target.value;
              setAnswers((a) => ({ ...a, [currentStep.key]: v }));
              const last = (v.split(",").pop() ?? "").trim();
              setDropdownOpen(last.length >= 3);
            }}
            onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
            placeholder={currentStep.placeholder}
            rows={4}
            maxLength={1000}
            className="w-full bg-foreground/5 border border-foreground/15 rounded-md px-3 py-3 text-foreground placeholder:text-foreground/40 outline-none focus:border-foreground/40 transition resize-none"
          />
        ) : (
          <input
            autoFocus
            type="text"
            value={answers[currentStep.key]}
            onChange={(e) => {
              const v = e.target.value;
              setAnswers((a) => ({ ...a, [currentStep.key]: v }));
              setDropdownOpen(v.trim().length >= 3);
            }}
            onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                goNext();
              }
              if (e.key === "Escape") setDropdownOpen(false);
            }}
            placeholder={currentStep.placeholder}
            maxLength={300}
            className="w-full bg-foreground/5 border border-foreground/15 rounded-md px-3 py-3 text-foreground placeholder:text-foreground/40 outline-none focus:border-foreground/40 transition"
          />
        )}
        {dropdownOpen && SUGGESTIONS[currentStep.key] && filteredSuggestions.length > 0 && (
          <div className="absolute z-20 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-background/95 backdrop-blur-xl border border-foreground/20 rounded-md shadow-xl">
            {filteredSuggestions.map((s) => {
              const active = isSuggestionActive(currentStep.key, s.value);
              return (
                <button
                  key={s.value}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applySuggestion(currentStep.key, s.value)}
                  className={`w-full text-left px-3 py-2 text-sm border-b border-foreground/5 last:border-0 transition ${
                    active ? "bg-foreground/15 text-foreground" : "text-foreground/85 hover:bg-foreground/10"
                  }`}
                >
                  {active ? "✓ " : ""}{s.label}
                </button>
              );
            })}
          </div>
        )}
        {currentStep.key === "company" && clientSearchOpen && clientMatches.length > 0 && (
          <div className="absolute z-30 left-0 right-0 mt-1 max-h-64 overflow-y-auto bg-background/95 backdrop-blur-xl border border-foreground/20 rounded-md shadow-xl">
            <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-foreground/50 border-b border-foreground/10 flex items-center justify-between">
              <span>Existing clients {searchingClients ? "(searching…)" : ""}</span>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => setClientSearchOpen(false)} className="text-foreground/50 hover:text-foreground">×</button>
            </div>
            {clientMatches.map((m, i) => (
              <button
                key={`${m.source}-${i}-${m.company}-${m.email ?? ""}`}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pickClientMatch(m)}
                className="w-full text-left px-3 py-2 text-sm border-b border-foreground/5 last:border-0 transition text-foreground/85 hover:bg-foreground/10"
              >
                <div className="font-medium text-foreground">{m.company}</div>
                <div className="text-xs text-foreground/60 truncate">
                  {[m.name, m.email, m.industry].filter(Boolean).join(" · ")}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {SUGGESTIONS[currentStep.key] && (
        <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto pr-1">
          {SUGGESTIONS[currentStep.key]!.map((s) => {
            const active = isSuggestionActive(currentStep.key, s.value);
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => applySuggestion(currentStep.key, s.value)}
                className={`px-2.5 py-1 rounded-full text-xs border transition ${
                  active
                    ? "bg-foreground text-background border-foreground"
                    : "bg-foreground/5 text-foreground/80 border-foreground/15 hover:border-foreground/40 hover:bg-foreground/10"
                }`}
              >
                {active && currentStep.key === "sections" ? "✓ " : ""}{s.label}
              </button>
            );
          })}
          {currentStep.key === "sections" && answers.sections.trim() && (
            <button
              type="button"
              onClick={() => setAnswers((a) => ({ ...a, sections: "" }))}
              className="px-2.5 py-1 rounded-full text-xs border border-foreground/15 text-foreground/60 hover:text-foreground hover:border-foreground/40 transition"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 mt-1">
        <Button type="button" variant="pricing" onClick={currentIndex === 0 ? goSkip : goBack} className="h-11 font-semibold">
          {currentIndex === 0 ? "Skip" : "Back"}
        </Button>
        <Button type="button" variant="pricing" onClick={goNext} className="h-11 font-semibold">
          {currentIndex === STEPS.length - 1 ? "Continue →" : "Next →"}
        </Button>
      </div>
      {currentIndex > 0 && (
        <button
          type="button"
          onClick={goSkip}
          className="text-xs text-foreground/60 hover:text-foreground underline-offset-4 hover:underline mt-1 self-center"
        >
          Skip this step
        </button>
      )}
    </motion.div>
  );

  const destinationBody = (
    <motion.div
      key="destination"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.18 }}
      className="flex flex-col gap-3"
    >
      <p className="text-foreground text-base font-semibold uppercase tracking-wider">Preview destination</p>
      <p className="text-foreground/60 text-xs text-slate-200">
        Optional — add a client email and we'll auto-send the preview link.
      </p>
      <div className="flex flex-col gap-2">
        <label className="text-foreground/70 text-xs uppercase tracking-wider">Internal title (optional)</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={answers.company.trim() ? `${answers.company.trim()} v1` : "e.g. Acme Florist v1"}
          maxLength={120}
          className="w-full bg-foreground/5 border border-foreground/15 rounded-md px-3 py-3 text-foreground placeholder:text-foreground/40 outline-none focus:border-foreground/40 transition"
        />
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-foreground/70 text-xs uppercase tracking-wider">Client name (optional)</label>
        <input
          type="text"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          placeholder="Jane"
          maxLength={120}
          className="w-full bg-foreground/5 border border-foreground/15 rounded-md px-3 py-3 text-foreground placeholder:text-foreground/40 outline-none focus:border-foreground/40 transition"
        />
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-foreground/70 text-xs uppercase tracking-wider">Client email (optional)</label>
        <input
          type="email"
          inputMode="email"
          value={clientEmail}
          onChange={(e) => { setClientEmail(e.target.value); setDestError(null); }}
          placeholder="client@example.com"
          maxLength={200}
          className="w-full bg-foreground/5 border border-foreground/15 rounded-md px-3 py-3 text-foreground placeholder:text-foreground/40 outline-none focus:border-foreground/40 transition"
        />
      </div>
      {destError && <p className="text-xs text-destructive">{destError}</p>}
      <div className="grid grid-cols-2 gap-2 mt-1">
        <Button type="button" variant="pricing" onClick={() => setStage(STEPS[STEPS.length - 1].key)} className="h-11 font-semibold">
          Back
        </Button>
        <Button type="button" variant="pricing" onClick={() => void generate()} disabled={busy} className="h-11 font-semibold gap-2">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          {clientEmail.trim() ? "Generate & send" : "Generate"}
        </Button>
      </div>
    </motion.div>
  );

  const generatingBody = (
    <motion.div
      key="generating"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center gap-3 py-8"
    >
      <GenerationProgress label="Generating preview…" />
    </motion.div>

  );

  const body = (
    <div className="space-y-4">
      <AnimatePresence mode="wait">
        {stage === "generating" ? generatingBody : stage === "destination" ? destinationBody : stepBody}
      </AnimatePresence>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} dismissible={false}>
        <DrawerContent
          className="border border-white/15 px-4 pb-6 text-foreground shadow-[0_30px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl backdrop-saturate-150"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 50%, rgba(255,255,255,0.08) 100%)",
            WebkitBackdropFilter: "blur(28px) saturate(160%)",
            backdropFilter: "blur(28px) saturate(160%)",
          }}
        >
          <DrawerHeader className="flex items-center justify-between">
            <DrawerTitle className="flex items-center gap-2">
              <Wand2 className="h-4 w-4" /> Generate preview
            </DrawerTitle>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </DrawerHeader>
          {body}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="max-w-2xl border border-white/15 text-foreground shadow-[0_30px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl backdrop-saturate-150"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 50%, rgba(255,255,255,0.08) 100%)",
          WebkitBackdropFilter: "blur(28px) saturate(160%)",
          backdropFilter: "blur(28px) saturate(160%)",
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center gap-2">
            <Wand2 className="h-4 w-4" /> Generate preview
          </DialogTitle>
          <DialogDescription className="sr-only">
            Step-by-step preview generator
          </DialogDescription>
        </DialogHeader>
        {body}
      </DialogContent>
    </Dialog>
  );
}
