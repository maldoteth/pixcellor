import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, LogIn, X } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useIsMobile } from "@/hooks/use-mobile";
import { useHeroReady } from "@/hooks/use-hero-ready";
import { supabase } from "@/integrations/supabase/client";

function CustomerAuthForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [linkSent, setLinkSent] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/customer-portal`,
          shouldCreateUser: true,
        },
      });

      if (error) throw error;

      setLinkSent(true);
      toast.success("Magic link sent. Check your inbox to continue.");
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      if (message.includes("rate limit")) {
        setLinkSent(true);
        toast.success("A login link was already sent recently. Check your inbox.");
        return;
      }
      toast.error(error instanceof Error ? error.message : "Could not continue");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="customer-access-email">Email</Label>
          <Input
            id="customer-access-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setLinkSent(false);
            }}
            placeholder="you@example.com"
            required
          />
        </div>
        <Button type="submit" disabled={busy || linkSent} className="w-full gap-2">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {linkSent ? "Magic link sent" : "Send magic link"}
        </Button>
      </form>

    </div>
  );
}

interface CustomerAccessProps {
  hidden?: boolean;
  chatOpen?: boolean;
}

export default function CustomerAccess({ hidden = false, chatOpen = false }: CustomerAccessProps) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const heroReady = useHeroReady();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setOpen(false);
        navigate("/customer-portal");
      }
    });
  }, [navigate, open]);

  useEffect(() => {
    const openLogin = () => setOpen(true);
    window.addEventListener("pixcellor:open-login", openLogin);
    return () => window.removeEventListener("pixcellor:open-login", openLogin);
  }, []);

  const trigger = (
    <motion.button
      type="button"
      aria-label="Customer log in"
      onClick={() => setOpen((current) => !current)}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      initial={{ x: "-50%", y: -8, filter: "blur(10px)" }}
      animate={{ x: "-50%", y: heroReady ? 0 : -8, filter: heroReady ? "blur(0px)" : "blur(10px)" }}
      transition={{ duration: 0.6, delay: 0.16, ease: "easeOut" }}
      className={`fixed left-[calc(50%+44px)] top-4 z-[10000] flex items-center justify-center rounded-sm transition-opacity duration-200 md:left-[calc(50%+52px)] md:top-6 ${(hidden || !heroReady) ? "pointer-events-none opacity-0" : "opacity-100"} ${isMobile && chatOpen ? "lg:flex hidden" : "flex"} ${isMobile ? "h-[34px] w-[34px]" : "h-[42px] w-[42px]"}`}
      style={{
        background: "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.2)",
        boxShadow: `
          0 8px 32px rgba(0,0,0,0.3),
          inset 0 1px 1px rgba(255,255,255,0.3),
          inset 0 -1px 1px rgba(0,0,0,0.1)
        `,
      }}
    >
      <div
        className="absolute inset-1 rounded-sm opacity-60"
        style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.25) 0%, transparent 50%)" }}
      />
      <AnimatePresence mode="wait">
        {open ? (
          <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 180, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }} className="relative z-10">
            <X className="h-4 w-4 text-white drop-shadow-lg" />
          </motion.div>
        ) : (
          <motion.div key="login" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }} className="relative z-10">
            <LogIn className="h-4 w-4 text-white drop-shadow-lg" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );

  if (isMobile) {
    return (
      <>
        {trigger}
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent className="border-border bg-background/95 px-4 pb-6 backdrop-blur-xl">
            <DrawerHeader>
              <DrawerTitle>Log in / Sign up</DrawerTitle>
            </DrawerHeader>
            <CustomerAuthForm />
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <>
      {trigger}
      <Dialog open={open} onOpenChange={setOpen} modal={false}>
        <DialogContent className="border-border bg-background/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle>Log in / Sign up</DialogTitle>
            <DialogDescription className="sr-only">
              Enter your email address to receive a secure magic link for the customer portal.
            </DialogDescription>
          </DialogHeader>
          <CustomerAuthForm />
        </DialogContent>
      </Dialog>
    </>
  );
}
