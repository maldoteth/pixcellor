import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, LogIn } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";

function CustomerAuthForm({ onSuccess }: { onSuccess: () => void }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const loginResult = await supabase.auth.signInWithPassword({ email: cleanEmail, password });

      if (!loginResult.error) {
        onSuccess();
        navigate("/customer-portal", { replace: true });
        return;
      }

      if (loginResult.error.message.toLowerCase().includes("email not confirmed")) {
        const { error: resendError } = await supabase.auth.resend({
          type: "signup",
          email: cleanEmail,
          options: { emailRedirectTo: `${window.location.origin}/customer-portal` },
        });

        if (resendError) throw resendError;

        toast.success("Confirmation email resent. Check your inbox to activate your account.");
        return;
      }

      const signupResult = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: { emailRedirectTo: `${window.location.origin}/customer-portal` },
      });

      if (signupResult.error) {
        const message = signupResult.error.message.toLowerCase();
        if (message.includes("already") || message.includes("registered")) {
          toast.error("Account found. Check the password and try again.");
          return;
        }
        throw signupResult.error;
      }

      if (signupResult.data.user?.identities?.length === 0) {
        toast.error("Account found. Check the password and try again.");
        return;
      }

      if (!signupResult.data.session) {
        const { error: resendError } = await supabase.auth.resend({
          type: "signup",
          email: cleanEmail,
          options: { emailRedirectTo: `${window.location.origin}/customer-portal` },
        });

        if (resendError) throw resendError;

        toast.success("Confirmation email sent. Check your inbox to activate your account.");
        setPassword("");
        return;
      }

      onSuccess();
      navigate("/customer-portal", { replace: true });
    } catch (error) {
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
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="customer-access-password">Password</Label>
          <Input
            id="customer-access-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={6}
            required
          />
        </div>
        <Button type="submit" disabled={busy} className="w-full gap-2">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Continue
        </Button>
      </form>

    </div>
  );
}

export default function CustomerAccess() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
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

  const trigger = (
    <button
      type="button"
      aria-label="Customer log in"
      className={`fixed right-4 top-4 z-[10000] flex items-center justify-center rounded-sm md:right-6 md:top-6 ${isMobile ? "h-[34px] w-[34px]" : "h-[42px] w-[42px]"}`}
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
      <LogIn className="relative z-10 h-4 w-4 text-white drop-shadow-lg" />
    </button>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="border-border bg-background/95 px-4 pb-6 backdrop-blur-xl">
          <DrawerHeader>
            <DrawerTitle>Log in / Sign up</DrawerTitle>
            <DrawerDescription>Log in or sign up to view your matched orders.</DrawerDescription>
          </DrawerHeader>
          <CustomerAuthForm onSuccess={() => setOpen(false)} />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="border-border bg-background/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle>Log in / Sign up</DialogTitle>
          <DialogDescription>Log in or sign up to view your matched orders.</DialogDescription>
        </DialogHeader>
        <CustomerAuthForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
