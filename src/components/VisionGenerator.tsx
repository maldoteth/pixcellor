import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Sparkles, X, Wand2 } from "lucide-react";
import GenerationProgress from "./GenerationProgress";
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
import { useHeroReady } from "@/hooks/use-hero-ready";
import { supabase } from "@/integrations/supabase/client";

interface VisionGeneratorProps {
  hidden?: boolean;
  chatOpen?: boolean;
}

type StepKey = "company" | "industry" | "vibe" | "colour" | "headline" | "sections";
type Stage = StepKey | "contact" | "generating" | "result" | "refine";

const CONTACT_EMAIL_KEY = "pixcellor:contact-email";
const CONTACT_PHONE_KEY = "pixcellor:contact-phone";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface StepDef {
  key: StepKey;
  label: string;
  helper: string;
  placeholder: string;
  multiline?: boolean;
  prefix: string; // how it appears in the brief
}

const STEPS: StepDef[] = [
  {
    key: "company",
    label: "What's your company or brand name?",
    helper: "We'll brand the whole site around this — logo, header, top of page.",
    placeholder: "e.g. Acme Florist",
    prefix: "Company / brand name",
  },
  {
    key: "industry",
    label: "What's your industry or what do you sell?",
    helper: "Tap a suggestion or type your own.",
    placeholder: "e.g. boutique London florist",
    prefix: "Business",
  },
  {
    key: "vibe",
    label: "Pick a vibe",
    helper: "Tap any that feel right — or type your own.",
    placeholder: "e.g. minimal & luxury",
    prefix: "Vibe",
  },
  {
    key: "colour",
    label: "Primary brand colour(s)",
    helper: "Tap a palette or describe your own.",
    placeholder: "e.g. sage green & cream",
    prefix: "Colours",
  },
  {
    key: "headline",
    label: "Main headline (the big line at the top of the page)",
    helper: "A short tagline — we'll polish it.",
    placeholder: "e.g. Bouquets that say it better",
    prefix: "Headline",
  },
  {
    key: "sections",
    label: "Pages & special requests you want",
    helper: "Tap to add — these are the parts of your website.",
    placeholder: "Tap suggestions below or type your own",
    multiline: true,
    prefix: "Sections",
  },
];

const SUGGESTIONS: Partial<Record<StepKey, { label: string; value: string }[]>> = {
  industry: [
    { label: "Florist", value: "boutique florist" },
    { label: "Restaurant / café", value: "restaurant / café" },
    { label: "Bar / pub", value: "bar / pub" },
    { label: "Bakery", value: "artisan bakery" },
    { label: "Coffee shop", value: "speciality coffee shop" },
    { label: "Photographer", value: "freelance photographer" },
    { label: "Videographer", value: "videographer / film studio" },
    { label: "Wedding planner", value: "wedding planner" },
    { label: "Event planner", value: "events & private hire" },
    { label: "Plumber", value: "plumber" },
    { label: "Electrician", value: "electrician" },
    { label: "Builder", value: "builder / construction" },
    { label: "Landscaper", value: "landscaper / gardener" },
    { label: "Cleaner", value: "cleaning service" },
    { label: "Removals", value: "removals & man-with-a-van" },
    { label: "Hair salon", value: "hair salon" },
    { label: "Barber", value: "barber shop" },
    { label: "Beauty / spa", value: "beauty salon & spa" },
    { label: "Nail studio", value: "nail studio" },
    { label: "Tattoo studio", value: "tattoo studio" },
    { label: "Personal trainer", value: "personal trainer" },
    { label: "Gym / studio", value: "gym / fitness studio" },
    { label: "Yoga / pilates", value: "yoga & pilates studio" },
    { label: "Coach / consultant", value: "personal coach / consultant" },
    { label: "Therapist", value: "therapist / counsellor" },
    { label: "Dentist", value: "dental practice" },
    { label: "Doctor / clinic", value: "private clinic" },
    { label: "Vet", value: "veterinary practice" },
    { label: "Solicitor / lawyer", value: "law firm" },
    { label: "Accountant", value: "accountancy practice" },
    { label: "Estate agent", value: "estate agent" },
    { label: "Architect", value: "architecture studio" },
    { label: "Interior designer", value: "interior design studio" },
    { label: "Online shop", value: "ecommerce / online shop" },
    { label: "Fashion brand", value: "fashion / clothing brand" },
    { label: "Jewellery brand", value: "jewellery brand" },
    { label: "Skincare brand", value: "skincare brand" },
    { label: "Food brand", value: "food & drink brand" },
    { label: "SaaS", value: "software / SaaS product" },
    { label: "Mobile app", value: "mobile app" },
    { label: "Agency", value: "creative / marketing agency" },
    { label: "Charity", value: "charity / non-profit" },
    { label: "School / tutor", value: "school / private tutor" },
    { label: "Hotel / B&B", value: "hotel / B&B" },
    { label: "Holiday let", value: "holiday let / Airbnb host" },
    { label: "Driving instructor", value: "driving instructor" },
    { label: "Car dealer", value: "car dealership" },
    { label: "Car detailer", value: "car detailing & valeting" },
    { label: "DJ / musician", value: "DJ / musician / band" },
  ],
  vibe: [
    { label: "Minimal & clean", value: "minimal & clean" },
    { label: "Luxury & elegant", value: "luxury & elegant" },
    { label: "Bold & punchy", value: "bold & punchy" },
    { label: "Playful & fun", value: "playful & fun" },
    { label: "Editorial / magazine", value: "editorial / magazine" },
    { label: "Modern & techy", value: "modern & techy" },
    { label: "Warm & friendly", value: "warm & friendly" },
    { label: "Dark mode premium", value: "dark mode, premium" },
    { label: "Funky", value: "funky, eclectic, expressive" },
    { label: "Abstract", value: "abstract, artistic shapes" },
    { label: "Modern", value: "modern, contemporary" },
    { label: "Futuristic", value: "futuristic, next-gen" },
    { label: "Glassmorphism", value: "glassmorphism, frosted glass" },
    { label: "Neumorphism", value: "soft neumorphism" },
    { label: "Brutalist", value: "brutalist, raw" },
    { label: "Y2K retro", value: "Y2K retro" },
    { label: "90s nostalgia", value: "90s nostalgia" },
    { label: "Retro 70s", value: "70s retro, groovy" },
    { label: "Art deco", value: "art deco, gold accents" },
    { label: "Hand-drawn", value: "hand-drawn, illustrative" },
    { label: "Watercolour", value: "watercolour, soft" },
    { label: "Cinematic", value: "cinematic, dramatic" },
    { label: "Futuristic", value: "futuristic, sci-fi" },
    { label: "Liquid glass", value: "liquid glass, abstract bubbles" },
    { label: "Organic / nature", value: "organic, natural, earthy" },
    { label: "Scandi", value: "scandi minimal, airy" },
    { label: "Japandi", value: "Japandi, calm & considered" },
    { label: "Industrial", value: "industrial, concrete & steel" },
    { label: "Vintage / antique", value: "vintage, antique" },
    { label: "Pastel & dreamy", value: "pastel, dreamy" },
    { label: "Neon / cyberpunk", value: "neon, cyberpunk" },
    { label: "Monochrome", value: "strict monochrome" },
    { label: "Maximalist", value: "maximalist, layered" },
    { label: "Corporate trust", value: "corporate, trustworthy" },
  ],
  colour: [
    { label: "Black & white", value: "black & white" },
    { label: "All-black", value: "all-black with white text" },
    { label: "All-white", value: "all-white with black text" },
    { label: "Sage & cream", value: "sage green & cream" },
    { label: "Navy & gold", value: "navy & gold" },
    { label: "Burgundy & cream", value: "burgundy & cream" },
    { label: "Pastel pinks", value: "soft pastel pinks" },
    { label: "Pastel blues", value: "soft pastel blues" },
    { label: "Earthy tones", value: "warm earthy tones" },
    { label: "Terracotta", value: "terracotta & sand" },
    { label: "Vibrant blue", value: "vibrant blue accents" },
    { label: "Electric purple", value: "electric purple" },
    { label: "Forest green", value: "deep forest green" },
    { label: "Olive & cream", value: "olive green & cream" },
    { label: "Monochrome dark", value: "monochrome dark" },
    { label: "Monochrome light", value: "monochrome light" },
    { label: "Sunset orange", value: "sunset orange & pink" },
    { label: "Mustard yellow", value: "mustard yellow & black" },
    { label: "Mint & coral", value: "mint green & coral" },
    { label: "Rose gold", value: "rose gold & ivory" },
    { label: "Champagne", value: "champagne & charcoal" },
    { label: "Teal & coral", value: "teal & coral" },
    { label: "Crimson & black", value: "crimson red & black" },
    { label: "Cobalt & white", value: "cobalt blue & white" },
    { label: "Emerald & gold", value: "emerald green & gold" },
    { label: "Lavender & lilac", value: "lavender & lilac" },
    { label: "Greyscale", value: "greyscale, no colour" },
    { label: "Neon brights", value: "neon brights on black" },
  ],
  sections: [
    { label: "About us", value: "About us" },
    { label: "Our story", value: "Our story" },
    { label: "Services", value: "Services" },
    { label: "What we do", value: "What we do" },
    { label: "How it works", value: "How it works" },
    { label: "Pricing", value: "Pricing" },
    { label: "Packages", value: "Packages" },
    { label: "Gallery / portfolio", value: "Gallery / portfolio" },
    { label: "Before & after", value: "Before & after" },
    { label: "Case studies", value: "Case studies" },
    { label: "Testimonials / reviews", value: "Testimonials / reviews" },
    { label: "Trust badges", value: "Trust badges & logos" },
    { label: "Awards", value: "Awards & press" },
    { label: "FAQ", value: "FAQ" },
    { label: "Contact form", value: "Contact form" },
    { label: "Map / location", value: "Map & location" },
    { label: "Opening hours", value: "Opening hours" },
    { label: "Booking / calendar", value: "Booking calendar" },
    { label: "Quote calculator", value: "Instant quote calculator" },
    { label: "Online shop", value: "Online shop" },
    { label: "Product list", value: "Product list" },
    { label: "Menu (food)", value: "Food / drinks menu" },
    { label: "Blog / news", value: "Blog / news" },
    { label: "Team", value: "Team" },
    { label: "Careers", value: "Careers / jobs" },
    { label: "Newsletter signup", value: "Newsletter signup" },
    { label: "Lead magnet", value: "Free download / lead magnet" },
    { label: "Video showreel", value: "Video showreel" },
    { label: "Press / media", value: "Press & media" },
    { label: "Partners", value: "Partners & sponsors" },
    { label: "Sustainability", value: "Sustainability statement" },
    { label: "Live chat", value: "Live chat / WhatsApp" },
    { label: "Members area", value: "Members / login area" },
    { label: "Events", value: "Events & calendar" },
    { label: "Donations", value: "Donations / support us" },
    { label: "Instagram feed", value: "Instagram feed" },
    { label: "Process / timeline", value: "Process / timeline" },
    { label: "Comparison table", value: "Comparison table" },
    { label: "Stats / numbers", value: "Stats / impact numbers" },
    { label: "Sticky CTA bar", value: "Sticky call-to-action bar" },
  ],
};

export default function VisionGenerator({ hidden = false, chatOpen = false }: VisionGeneratorProps) {
  const isMobile = useIsMobile();
  const heroReady = useHeroReady();
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>("company");
  const [answers, setAnswers] = useState<Record<StepKey, string>>({
    company: "",
    industry: "",
    vibe: "",
    colour: "",
    headline: "",
    sections: "",
  });
  const [busy, setBusy] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [generatedFor, setGeneratedFor] = useState<string>("");
  const [refineInstruction, setRefineInstruction] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [contactEmail, setContactEmail] = useState<string>(() => {
    try { return localStorage.getItem(CONTACT_EMAIL_KEY) ?? ""; } catch { return ""; }
  });
  const [contactPhone, setContactPhone] = useState<string>(() => {
    try { return localStorage.getItem(CONTACT_PHONE_KEY) ?? ""; } catch { return ""; }
  });
  const [contactError, setContactError] = useState<string | null>(null);

  useEffect(() => {
    setDropdownOpen(false);
  }, [stage]);

  const reset = () => {
    setImageUrl(null);
    setGeneratedFor("");
    setRefineInstruction("");
    setAnswers({ company: "", industry: "", vibe: "", colour: "", headline: "", sections: "" });
    setStage("company");
  };

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

  const getVisitorId = (): string => {
    try {
      let v = localStorage.getItem("pixcellor:visitor_id");
      if (!v) {
        v = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
        localStorage.setItem("pixcellor:visitor_id", v);
      }
      return v;
    } catch { return ""; }
  };

  const generate = async (finalAnswers: Record<StepKey, string>) => {
    const brief = buildBrief(finalAnswers);
    if (brief.length < 5) {
      toast.error("Tell us at least one detail about your dream website.");
      setStage("industry");
      return;
    }
    setBusy(true);
    setStage("generating");
    try {
      const { data, error } = await supabase.functions.invoke("generate-vision", {
        body: {
          prompt: brief,
          meta: {
            source: "vision_generator",
            visitor_id: getVisitorId(),
            company: finalAnswers.company?.trim() || null,
            email: contactEmail.trim() || null,
            phone: contactPhone.trim() || null,
          },
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.imageUrl) throw new Error("No image returned");
      setImageUrl(data.imageUrl);
      setGeneratedFor(brief);
      setStage("result");
      toast.success("Your vision is ready ✨");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate vision");
      setStage(STEPS[STEPS.length - 1].key);
    } finally {
      setBusy(false);
    }
  };

  const currentIndex = STEPS.findIndex((s) => s.key === stage);
  const currentStep = currentIndex >= 0 ? STEPS[currentIndex] : null;

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
      setStage("contact");
    } else {
      setStage(STEPS[currentIndex + 1].key);
    }
  };

  const goSkip = () => {
    if (!currentStep) return;
    const cleared = { ...answers, [currentStep.key]: "" };
    setAnswers(cleared);
    if (currentIndex === STEPS.length - 1) {
      setStage("contact");
    } else {
      setStage(STEPS[currentIndex + 1].key);
    }
  };

  const goBack = () => {
    if (currentIndex > 0) setStage(STEPS[currentIndex - 1].key);
  };

  const submitContact = () => {
    const email = contactEmail.trim();
    const phone = contactPhone.trim();
    if (!EMAIL_RE.test(email)) {
      setContactError("Please enter a valid email address.");
      return;
    }
    if (phone && phone.replace(/\D/g, "").length < 7) {
      setContactError("Please enter a valid phone number, or leave it blank.");
      return;
    }
    setContactError(null);
    try {
      localStorage.setItem(CONTACT_EMAIL_KEY, email);
      if (phone) localStorage.setItem(CONTACT_PHONE_KEY, phone);
      else localStorage.removeItem(CONTACT_PHONE_KEY);
    } catch { /* ignore */ }
    void generate(answers);
  };

  const orderThisStyle = () => {
    try {
      sessionStorage.setItem(
        "pixcellor:consultation-context",
        JSON.stringify({
          imageUrl,
          brief: generatedFor,
          company: answers.company,
          email: contactEmail.trim() || null,
          phone: contactPhone.trim() || null,
          orderRequest: true,
          at: Date.now(),
        }),
      );
    } catch { /* ignore */ }
    setOpen(false);
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent("pixcellor:open-letstalk", { detail: { mode: "consultation" } }),
      );
    }, 200);
  };

  const downloadImage = () => {
    if (!imageUrl) return;
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = "pixcellor-vision.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const requestConsultation = () => {
    try {
      sessionStorage.setItem(
        "pixcellor:consultation-context",
        JSON.stringify({
          imageUrl,
          brief: generatedFor,
          company: answers.company,
          email: contactEmail.trim() || null,
          phone: contactPhone.trim() || null,
          at: Date.now(),
        }),
      );
    } catch { /* ignore */ }
    setOpen(false);
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent("pixcellor:open-letstalk", { detail: { mode: "consultation" } }),
      );
    }, 200);
  };

  const refineVision = async () => {
    const ins = refineInstruction.trim();
    if (ins.length < 3 || !imageUrl) {
      toast.error("Tell us what to change.");
      return;
    }
    const previousUrl = imageUrl;
    const previousPrompt = generatedFor;
    setBusy(true);
    setStage("generating");
    try {
      const { data, error } = await supabase.functions.invoke("generate-vision", {
        body: {
          imageUrl: previousUrl,
          instruction: ins,
          meta: {
            source: "vision_generator_refine",
            visitor_id: getVisitorId(),
            company: answers.company?.trim() || null,
            email: contactEmail.trim() || null,
            phone: contactPhone.trim() || null,
          },
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const url = data?.imageUrl ?? previousUrl;
      setImageUrl(url);
      setGeneratedFor(`${previousPrompt}\n\nRefinement: ${ins}`);
      setRefineInstruction("");
      setStage("result");
      toast.success("Updated ✨");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't refine — please try again.");
      setStage("result");
    } finally {
      setBusy(false);
    }
  };

  const trigger = (
    <motion.button
      type="button"
      aria-label="Generate your dream landing page"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      initial={{ x: "-50%", y: -8, filter: "blur(10px)" }}
      animate={{ x: "-50%", y: heroReady ? 0 : -8, filter: heroReady ? "blur(0px)" : "blur(10px)" }}
      transition={{ duration: 0.6, delay: 0, ease: "easeOut" }}
      className={`fixed left-[calc(50%-44px)] top-4 z-[10000] flex items-center justify-center rounded-sm transition-opacity duration-200 md:left-[calc(50%-52px)] md:top-6 ${(hidden || !heroReady) && !open ? "pointer-events-none opacity-0" : "opacity-100 pointer-events-auto"} ${isMobile && chatOpen && !open ? "lg:flex hidden" : "flex"} ${isMobile ? "h-[34px] w-[34px]" : "h-[42px] w-[42px]"}`}
      style={{
        background: "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.05) 100%)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.22)",
        boxShadow:
          "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.3), inset 0 -1px 1px rgba(0,0,0,0.1)",
      }}
    >
      <div
        className="absolute inset-1 rounded-sm opacity-60"
        style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.25) 0%, transparent 50%)" }}
      />
      <AnimatePresence mode="wait">
        {open ? (
          <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }} className="relative z-10">
            <X className="h-4 w-4 text-white drop-shadow-lg" />
          </motion.div>
        ) : (
          <motion.div key="s" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }} className="relative z-10">
            <Sparkles className="h-4 w-4 text-white drop-shadow-lg" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );

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
      <p className="text-foreground text-base font-semibold">{currentStep.label}</p>
      <p className="text-foreground/60 text-xs">{currentStep.helper}</p>

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
        <Button
          type="button"
          variant="pricing"
          onClick={currentIndex === 0 ? goSkip : goBack}
          className="h-11 font-semibold"
        >
          {currentIndex === 0 ? "Skip" : "Back"}
        </Button>
        <Button
          type="button"
          variant="pricing"
          onClick={goNext}
          className="h-11 font-semibold"
        >
          {currentIndex === STEPS.length - 1 ? "Generate ✨" : "Next →"}
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

  const body = (
    <div className="space-y-4">
      <AnimatePresence mode="wait">
        {stage === "generating" ? (
          <motion.div
            key="generating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full"
          >
            <GenerationProgress />
          </motion.div>
        ) : stage === "result" && imageUrl ? (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <div tabIndex={-1} className="border border-border/40 bg-black/40 max-h-[55vh] overflow-auto outline-none focus:outline-none focus-visible:outline-none">
              <img src={imageUrl} alt="Your AI-generated landing page vision" className="w-full block" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button onClick={orderThisStyle} className="w-full rounded-none">
                Use this as style guide
              </Button>
              <Button onClick={requestConsultation} variant="outline" className="w-full rounded-none">
                Request custom sample
              </Button>
            </div>
          </motion.div>
        ) : stage === "refine" && imageUrl ? (
          <motion.div
            key="refine"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <p className="text-foreground text-base font-semibold">What would you like to tweak?</p>
            <p className="text-foreground/70 text-xs">Describe any changes — colours, layout, copy, sections, imagery.</p>
            <div className="border border-border/40 bg-black/40 max-h-[22vh] overflow-hidden">
              <img src={imageUrl} alt="Current sample" className="w-full block" />
            </div>
            <textarea
              autoFocus
              value={refineInstruction}
              onChange={(e) => setRefineInstruction(e.target.value)}
              placeholder="e.g. make the hero darker, add a pricing section, swap to sage green"
              rows={3}
              className="w-full bg-transparent border border-border/40 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-foreground/60 resize-none"
            />
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => { setRefineInstruction(""); setStage("result"); }} className="w-full rounded-none">
                Back
              </Button>
              <Button onClick={refineVision} disabled={refineInstruction.trim().length < 3} className="w-full rounded-none">
                Regenerate
              </Button>
            </div>
          </motion.div>
        ) : (
          stepBody
        )}
      </AnimatePresence>
      {stage !== "generating" && stage !== "result" && stage !== "refine" && !busy && (
        <p className="text-[11px] text-muted-foreground/70 text-center flex items-center justify-center gap-1">
          <Wand2 className="h-3 w-3" /> Skip anything you're not sure about — we'll fill the gaps.
        </p>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <>
        {trigger}
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent className="border-border bg-background/95 px-4 pb-6 backdrop-blur-xl">
            <DrawerHeader>
              <DrawerTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" /> See your dream site
              </DrawerTitle>
            </DrawerHeader>
            {body}
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <>
      {trigger}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-border bg-background/95 backdrop-blur-xl max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center gap-2">
              <Sparkles className="h-4 w-4" /> See your dream landing page
            </DialogTitle>
            <DialogDescription>
              Generate a desktop concept of your site for use as a reference guide.
            </DialogDescription>
          </DialogHeader>
          {body}
        </DialogContent>
      </Dialog>
    </>
  );
}
