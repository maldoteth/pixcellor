import { FormEvent, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, User, X } from "lucide-react";
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
import { lovable } from "@/integrations/lovable";
import { useLoginHandoff } from "@/hooks/use-login-handoff";
import { useRequestLoginLink } from "@/hooks/use-request-login-link";

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.77.42 3.44 1.18 4.94l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z" />
    </svg>
  );
}

function CustomerAuthForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [linkSent, setLinkSent] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const handoff = useLoginHandoff("/customer-portal");
  const { requestLink, busy, cooldown } = useRequestLoginLink();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const emailRedirectTo = handoff.start();

    const result = await requestLink(cleanEmail, emailRedirectTo);
    if (result.ok) {
      setLinkSent(true);
      toast.success("Magic link sent. Open it on any device — this tab will log in too.");
    } else if (result.rateLimited) {
      toast.error(`Too many requests. Try again in ${result.retryAfter ?? 30}s.`);
    } else {
      toast.error(result.message ?? "Could not send link");
    }
  };

  const buttonLabel = busy
    ? "Sending…"
    : cooldown > 0
      ? `Resend in ${cooldown}s`
      : linkSent
        ? "Resend magic link"
        : "Send magic link";

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
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>
        <Button type="submit" disabled={busy || cooldown > 0} className="w-full gap-2">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {buttonLabel}
        </Button>
        {linkSent && (
          <p className="text-muted-foreground text-lg text-slate-50 bg-white/0 text-center inline-flex items-center justify-center gap-2 w-full">
            {handoff.status === "claiming" || handoff.status === "claimed" ? (
              <><Loader2 className="h-3 w-3 animate-spin" />Signing you in…</>
            ) : (
              <>Check your inbox — this tab will log in automatically once you click the link.</>
            )}
          </p>
        )}
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">or</span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        disabled={googleBusy}
        className="w-full gap-2"
        onClick={async () => {
          setGoogleBusy(true);
          const result = await lovable.auth.signInWithOAuth("google", {
            redirect_uri: window.location.origin + "/customer-portal",
          });
          if (result.error) {
            toast.error("Could not start Google sign-in");
            setGoogleBusy(false);
            return;
          }
          if (!result.redirected) {
            navigate("/customer-portal", { replace: true });
          }
        }}
      >
        {googleBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
        Continue with Google
      </Button>
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
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      window.dispatchEvent(new Event("pixcellor:customer-access-open"));
    } else {
      window.dispatchEvent(new Event("pixcellor:customer-access-close"));
    }
  }, [open]);

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
      ref={triggerRef}
      type="button"
      aria-label="Customer log in"
      onClick={() => setOpen((current) => !current)}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      initial={{ x: "-50%", y: -8, filter: "blur(10px)" }}
      animate={{ x: "-50%", y: heroReady ? 0 : -8, filter: heroReady ? "blur(0px)" : "blur(10px)" }}
      transition={{ duration: 0.6, delay: 0.16, ease: "easeOut" }}
      className={`group fixed left-[calc(50%+44px)] top-4 z-[10500] flex items-center justify-center rounded-sm overflow-hidden transition-opacity duration-500 ease-out md:left-[calc(50%+52px)] md:top-6 md:z-[10000] ${(hidden || !heroReady) ? "pointer-events-none opacity-0" : "opacity-100"} ${isMobile && chatOpen ? "lg:flex hidden" : "flex"} ${isMobile ? "h-[34px] w-[34px]" : "h-[42px] w-[42px]"}`}
      style={{
        background: "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 50%, rgba(255,255,255,0.08) 100%)",
        backdropFilter: "blur(28px) saturate(160%)",
        WebkitBackdropFilter: "blur(28px) saturate(160%)",
        border: "1px solid rgba(255,255,255,0.2)",
        boxShadow: `
          0 8px 32px rgba(0,0,0,0.3),
          inset 0 1px 1px rgba(255,255,255,0.3),
          inset 0 -1px 1px rgba(0,0,0,0.1)
        `,
      }}
    >
      <div
        className="absolute inset-1 rounded-sm opacity-60 pointer-events-none"
        style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.25) 0%, transparent 50%)" }}
      />
      <span aria-hidden className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 ease-in-out group-hover:translate-x-full" />
      <AnimatePresence mode="wait">
        {open ? (
          <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 180, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }} className="relative z-10">
            <X className="h-4 w-4 text-white drop-shadow-lg" />
          </motion.div>
        ) : (
          <motion.div key="login" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }} className="relative z-10">
            <User className="h-4 w-4 text-white drop-shadow-lg" />
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
          <DrawerContent
            className="border-border bg-background/95 px-4 pb-6 backdrop-blur-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0"
            onInteractOutside={(e) => {
              if (triggerRef.current?.contains(e.target as Node)) e.preventDefault();
            }}
          >
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
        <DialogContent
          className="border-border bg-background/95 backdrop-blur-xl"
          onInteractOutside={(e) => {
            if (triggerRef.current?.contains(e.target as Node)) e.preventDefault();
          }}
        >
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
