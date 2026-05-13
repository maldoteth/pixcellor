import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SeoHead from "@/components/SeoHead";

export default function Unsubscribe() {
  const token = useMemo(() => new URLSearchParams(window.location.search).get("token"), []);
  const [state, setState] = useState<"loading" | "valid" | "invalid" | "used" | "success" | "error">("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const validate = async () => {
      if (!token) {
        setState("invalid");
        return;
      }
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const response = await fetch(`${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`, {
          headers: { apikey: anonKey },
        });
        const data = await response.json();
        if (data.valid) setState("valid");
        else if (data.reason === "already_unsubscribed") setState("used");
        else setState("invalid");
      } catch {
        setState("error");
      }
    };
    validate();
  }, [token]);

  const confirmUnsubscribe = async () => {
    if (!token) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", { body: { token } });
      if (error) throw error;
      setState(data?.reason === "already_unsubscribed" ? "used" : "success");
    } catch {
      setState("error");
    } finally {
      setBusy(false);
    }
  };

  const copy = {
    loading: ["Checking link…", "Please wait while we verify your unsubscribe request."],
    valid: ["Unsubscribe from Pixcellor emails?", "Confirm below and we’ll stop sending app emails to this address."],
    invalid: ["This link is invalid", "The unsubscribe link is missing, expired, or no longer available."],
    used: ["Already unsubscribed", "This address has already been removed from Pixcellor app emails."],
    success: ["You’re unsubscribed", "We’ve removed this address from Pixcellor app emails."],
    error: ["Something went wrong", "Please try again, or reply to a Pixcellor email and we’ll help."],
  }[state];

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <SeoHead
        title="Unsubscribe · Pixcellor™"
        description="Manage your Pixcellor email subscription preferences and unsubscribe from marketing or transactional updates at any time."
        path="/unsubscribe"
        noindex
      />
      <Card className="w-full max-w-md border-border/60 bg-card/80">
        <CardHeader>
          <p className="text-xs font-semibold text-muted-foreground">Pixcellor™</p>
          <CardTitle>{copy[0]}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{copy[1]}</p>
          {state === "valid" && (
            <Button onClick={confirmUnsubscribe} disabled={busy} className="w-full">
              {busy ? "Confirming…" : "Confirm unsubscribe"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
