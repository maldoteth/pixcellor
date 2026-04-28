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
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const result = mode === "signup"
        ? await supabase.auth.signUp({
            email: cleanEmail,
            password,
            options: { emailRedirectTo: `${window.location.origin}/customer-portal` },
          })
        : await supabase.auth.signInWithPassword({ email: cleanEmail, password });

      if (result.error) throw result.error;

      if (mode === "signup" && !result.data.session) {
        toast.success("Check your email to confirm your customer account.");
        setPassword("");
        setMode("login");
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
      <div className="grid grid-cols-2 rounded-md border border-border bg-muted/30 p-1">
        <Button
          type="button"
          variant={mode === "login" ? "default" : "ghost"}
          onClick={() => setMode("login")}
        >
          Log in
        </Button>
        <Button
          type="button"
          variant={mode === "signup" ? "default" : "ghost"}
          onClick={() => setMode("signup")}
        >
          Sign up
        </Button>
      </div>

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
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={6}
            required
          />
        </div>
        <Button type="submit" disabled={busy} className="w-full gap-2">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === "signup" ? "Create account" : "Log in"}
        </Button>
      </form>

      <p className="text-sm text-muted-foreground leading-relaxed">
        Use the email from checkout to automatically link previous Pixcellor orders.
      </p>
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
    <Button
      variant="outline"
      size="icon"
      aria-label="Customer log in"
      className="fixed right-4 top-4 z-[10000] h-10 w-10 rounded-full border-border bg-background/55 backdrop-blur-xl md:right-6 md:top-6"
    >
      <LogIn className="h-5 w-5" />
    </Button>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="border-border bg-background/95 px-4 pb-6 backdrop-blur-xl">
          <DrawerHeader>
            <DrawerTitle>Customer access</DrawerTitle>
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
          <DialogTitle>Customer access</DialogTitle>
          <DialogDescription>Log in or sign up to view your matched orders.</DialogDescription>
        </DialogHeader>
        <CustomerAuthForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
