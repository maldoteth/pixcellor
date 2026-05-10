import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Sparkles, X, Wand2, Download } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";

interface VisionGeneratorProps {
  hidden?: boolean;
  chatOpen?: boolean;
}

const PROMPT_HELPERS = [
  "Industry / what you sell",
  "Vibe (minimal, bold, playful, luxury, techy)",
  "Primary brand colour",
  "Hero headline idea",
  "Sections you want (pricing, gallery, testimonials…)",
];

export default function VisionGenerator({ hidden = false, chatOpen = false }: VisionGeneratorProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [generatedFor, setGeneratedFor] = useState<string>("");

  const reset = () => {
    setImageUrl(null);
    setGeneratedFor("");
  };

  const generate = async () => {
    const text = prompt.trim();
    if (text.length < 5) {
      toast.error("Tell us a bit more about your dream landing page.");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-vision", {
        body: { prompt: text },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.imageUrl) throw new Error("No image returned");
      setImageUrl(data.imageUrl);
      setGeneratedFor(text);
      toast.success("Your vision is ready ✨");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate vision");
    } finally {
      setBusy(false);
    }
  };

  const orderThisStyle = () => {
    try {
      sessionStorage.setItem(
        "pixcellor:vision-brief",
        JSON.stringify({ prompt: generatedFor, imageUrl, at: Date.now() }),
      );
    } catch { /* ignore */ }
    setOpen(false);
    setTimeout(() => {
      window.dispatchEvent(new Event("pixcellor:open-vision-purchase"));
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

  const trigger = (
    <motion.button
      type="button"
      aria-label="Generate your dream landing page"
      onClick={() => setOpen((v) => !v)}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      className={`absolute right-28 top-4 z-[10000] flex items-center justify-center rounded-sm transition-opacity duration-200 md:right-[136px] md:top-6 lg:pointer-events-auto lg:opacity-100 ${hidden ? "pointer-events-none opacity-0 lg:pointer-events-auto lg:opacity-100" : "opacity-100"} ${isMobile && chatOpen ? "lg:flex hidden" : "flex"} ${isMobile ? "h-[34px] w-[34px]" : "h-[42px] w-[42px]"}`}
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

  const body = (
    <div className="space-y-4">
      {!imageUrl && (
        <>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Describe your dream landing page. The more detail, the closer the result.
            </p>
            <ul className="text-xs text-muted-foreground/80 list-disc pl-5 space-y-0.5">
              {PROMPT_HELPERS.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          </div>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. Boutique London florist. Soft minimal vibe, sage green + cream, hero with weekly bouquet photo, sections for subscriptions, gallery, reviews, contact."
            rows={6}
            className="rounded-none resize-none"
            disabled={busy}
          />
          <Button
            onClick={generate}
            disabled={busy || prompt.trim().length < 5}
            className="w-full gap-2 rounded-none"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            {busy ? "Generating your vision (≈30s)…" : "Generate my landing page"}
          </Button>
        </>
      )}

      {imageUrl && (
        <div className="space-y-3">
          <div className="border border-border/40 bg-black/40 max-h-[55vh] overflow-auto">
            <img src={imageUrl} alt="Your AI-generated landing page vision" className="w-full block" />
          </div>
          <p className="text-xs text-muted-foreground italic line-clamp-2">"{generatedFor}"</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Button onClick={orderThisStyle} className="w-full rounded-none sm:col-span-2">
              Order this style →
            </Button>
            <Button onClick={downloadImage} variant="outline" className="w-full rounded-none gap-2">
              <Download className="h-4 w-4" /> Save
            </Button>
          </div>
          <button
            type="button"
            onClick={reset}
            className="w-full text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
          >
            Try another description
          </button>
        </div>
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
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> See your dream landing page
            </DialogTitle>
            <DialogDescription>
              Describe what you want — we'll generate a desktop concept so you know exactly what you're getting before you order.
            </DialogDescription>
          </DialogHeader>
          {body}
        </DialogContent>
      </Dialog>
    </>
  );
}
