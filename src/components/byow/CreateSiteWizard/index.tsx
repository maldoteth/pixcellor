import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Loader2, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { TEMPLATES, type TemplatePreset } from "./templates";
import { FONT_PRESETS, type FontTriple, ensureFontLoaded } from "./fontPresets";

type Brand = {
  logo_url?: string;
  colors: { primary: string; accent: string; bg: string; surface: string; text: string; muted: string };
  fonts: { title: string; subtitle: string; body: string };
  font_href?: string;
};

const DEFAULT_BRAND: Brand = {
  colors: { primary: "#111111", accent: "#FF6B35", bg: "#FFFFFF", surface: "#F6F6F6", text: "#0A0A0A", muted: "#6B6B6B" },
  fonts: { title: "system-ui", subtitle: "system-ui", body: "system-ui" },
};

const STEPS = ["Brief", "Template", "Branding", "Generate"] as const;

export default function CreateSiteWizard() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [brief, setBrief] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [email, setEmail] = useState("");
  const [template, setTemplate] = useState<TemplatePreset | null>(null);
  const [brand, setBrand] = useState<Brand>(DEFAULT_BRAND);
  const [fontKey, setFontKey] = useState<string>("system");
  const [logoFile, setLogoFile] = useState<string>("");
  const [generating, setGenerating] = useState(false);

  const canNext = () => {
    if (step === 0) return displayName.trim().length >= 2 && brief.trim().length >= 10;
    return true;
  };

  const pickFont = (f: FontTriple) => {
    setFontKey(f.key);
    if (f.googleHref) ensureFontLoaded(f.googleHref);
    setBrand((b) => ({ ...b, fonts: { title: f.title, subtitle: f.subtitle, body: f.body }, font_href: f.googleHref }));
  };

  const onLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      toast.error("Logo must be under 500KB");
      return;
    }
    const dataUrl = await new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
    setLogoFile(dataUrl);
    setBrand((b) => ({ ...b, logo_url: dataUrl }));
  };

  const generate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("byow-generate-site", {
        body: {
          brief,
          display_name: displayName,
          business_type: businessType || template?.industry,
          email: email || undefined,
          brand,
          template_key: template?.key,
          template_seed: template?.seed,
        },
      });
      if (error) throw error;
      if (!data?.ref) throw new Error("No ref returned");
      toast.success("Your site is live in preview!");
      nav(`/s/${data.ref}`);
    } catch (e: any) {
      toast.error(e.message || "Couldn't generate. Try again.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 md:p-10">
      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((label, i) => {
          const active = i === step;
          const done = i < step;
          return (
            <div key={label} className="flex items-center gap-2 flex-1">
              <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-semibold ${
                active ? "bg-white text-black" : done ? "bg-white/30 text-white" : "bg-white/10 text-white/40"
              }`}>
                {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <div className={`text-xs uppercase tracking-wider ${active ? "text-white" : "text-white/40"}`}>{label}</div>
              {i < STEPS.length - 1 && <div className="flex-1 h-px bg-white/10" />}
            </div>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div key="brief" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
            <div>
              <label className="text-xs uppercase tracking-wider text-white/50">Site name</label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g. Acme Bakery" className="mt-1 bg-white/5 border-white/10 text-white h-11" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-white/50">What does the business do?</label>
              <Textarea value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="One or two sentences. Who you serve, what you sell, what makes you different." className="mt-1 bg-white/5 border-white/10 text-white min-h-[100px]" />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs uppercase tracking-wider text-white/50">Industry / type (optional)</label>
                <Input value={businessType} onChange={(e) => setBusinessType(e.target.value)} placeholder="Bakery, SaaS, salon, consultant…" className="mt-1 bg-white/5 border-white/10 text-white h-11" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-white/50">Email (optional, to claim later)</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@business.com" className="mt-1 bg-white/5 border-white/10 text-white h-11" />
              </div>
            </div>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div key="template" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
            <div className="text-sm text-white/60 mb-2">Pick a starting template — or skip and we'll generate fresh.</div>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
              <button
                onClick={() => setTemplate(null)}
                className={`text-left rounded-xl border p-4 transition-colors ${
                  template === null ? "border-white bg-white/10" : "border-white/10 bg-white/[0.02] hover:border-white/30"
                }`}
              >
                <Sparkles className="h-4 w-4" />
                <div className="text-sm font-semibold mt-2">Generate fresh</div>
                <div className="text-[11px] text-white/50 mt-1">AI builds the layout from your brief.</div>
              </button>
              {TEMPLATES.map((t) => {
                const active = template?.key === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTemplate(t)}
                    className={`text-left rounded-xl border p-4 transition-colors ${
                      active ? "border-white bg-white/10" : "border-white/10 bg-white/[0.02] hover:border-white/30"
                    }`}
                  >
                    <div className="text-[10px] uppercase tracking-wider text-white/40">{t.industry}</div>
                    <div className="text-sm font-semibold mt-1">{t.label}</div>
                    <div className="text-[11px] text-white/50 mt-1 leading-relaxed">{t.blurb}</div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="brand" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-6">
            {/* Logo */}
            <div>
              <label className="text-xs uppercase tracking-wider text-white/50">Logo (optional, &lt;500KB)</label>
              <div className="mt-2 flex items-center gap-4">
                <label className="cursor-pointer rounded-lg border border-dashed border-white/20 px-4 py-3 text-sm hover:border-white/40">
                  {logoFile ? "Change logo" : "Upload logo"}
                  <input type="file" accept="image/*" className="hidden" onChange={onLogoChange} />
                </label>
                {logoFile && <img src={logoFile} alt="" className="h-12 w-auto rounded bg-white/5 p-1" />}
              </div>
            </div>

            {/* Colors */}
            <div>
              <label className="text-xs uppercase tracking-wider text-white/50 mb-3 block">Brand colours</label>
              <div className="grid sm:grid-cols-3 md:grid-cols-6 gap-3">
                {(Object.keys(brand.colors) as (keyof Brand["colors"])[]).map((k) => (
                  <div key={k}>
                    <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">{k}</div>
                    <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-2">
                      <input
                        type="color"
                        value={brand.colors[k]}
                        onChange={(e) => setBrand({ ...brand, colors: { ...brand.colors, [k]: e.target.value } })}
                        className="h-8 w-8 rounded cursor-pointer bg-transparent border-0"
                      />
                      <input
                        type="text"
                        value={brand.colors[k]}
                        onChange={(e) => setBrand({ ...brand, colors: { ...brand.colors, [k]: e.target.value } })}
                        className="bg-transparent text-xs w-full outline-none text-white"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Fonts */}
            <div>
              <label className="text-xs uppercase tracking-wider text-white/50 mb-3 block">Font pairing (title / subtitle / body)</label>
              <div className="grid sm:grid-cols-2 gap-2">
                {FONT_PRESETS.map((f) => {
                  const active = fontKey === f.key;
                  return (
                    <button
                      key={f.key}
                      onClick={() => pickFont(f)}
                      className={`text-left rounded-lg border p-3 transition-colors ${
                        active ? "border-white bg-white/10" : "border-white/10 bg-white/[0.02] hover:border-white/30"
                      }`}
                    >
                      <div className="text-[10px] uppercase tracking-wider text-white/40">{f.label}</div>
                      <div className="mt-1.5 text-lg" style={{ fontFamily: `'${f.title}', system-ui` }}>Headline preview</div>
                      <div className="text-xs text-white/60" style={{ fontFamily: `'${f.body}', system-ui` }}>
                        Body sample text rendered in the body font.
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="gen" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="text-center py-8">
            <div className="text-xs uppercase tracking-wider text-white/40">Ready to ship</div>
            <h3 className="text-2xl md:text-3xl font-light mt-3">Generate your site</h3>
            <p className="text-white/60 mt-3 max-w-md mx-auto text-sm">
              We'll generate a full single-page site using your brief, brand and {template ? `the ${template.label} template` : "a fresh layout"}.
              Takes ~10 seconds. Free to preview.
            </p>
            <Button
              onClick={generate}
              disabled={generating}
              className="mt-8 bg-white text-black hover:bg-white/90 h-12 px-8"
            >
              {generating ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating…</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" /> Generate my site</>
              )}
            </Button>
            <p className="text-[11px] text-white/40 mt-4">
              You'll get a shareable preview URL. Publish to a permanent address with any plan.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nav */}
      <div className="mt-10 flex items-center justify-between">
        <Button
          variant="ghost"
          disabled={step === 0 || generating}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          className="text-white/70 hover:text-white hover:bg-white/5"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        {step < STEPS.length - 1 && (
          <Button
            disabled={!canNext()}
            onClick={() => setStep((s) => s + 1)}
            className="bg-white text-black hover:bg-white/90"
          >
            Next <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
