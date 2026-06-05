import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

export default function VacancyRespond() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const action = params.get("action");
  const [state, setState] = useState<"loading" | "ok" | "error" | "already">("loading");
  const [message, setMessage] = useState<string>("");
  const [meta, setMeta] = useState<{ vacancyTitle?: string; clientName?: string; status?: string }>({});

  useEffect(() => {
    (async () => {
      if (!token || !action || !["confirm", "decline"].includes(action)) {
        setState("error"); setMessage("Invalid invitation link."); return;
      }
      const { data, error } = await supabase.functions.invoke("vacancy-respond", { body: { token, action } });
      if (error) { setState("error"); setMessage(error.message); return; }
      if ((data as any)?.alreadyResponded) {
        setState("already"); setMeta({ status: (data as any).status }); return;
      }
      setMeta(data as any);
      setState("ok");
    })();
  }, [token, action]);

  const isConfirm = action === "confirm";
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <div className="max-w-md w-full border border-border bg-card p-8 rounded-lg text-center">
        {state === "loading" && (<><Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" /><p className="text-muted-foreground">Recording your response…</p></>)}
        {state === "ok" && (
          <>
            {isConfirm ? <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" /> : <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />}
            <h1 className="text-2xl font-bold mb-2">{isConfirm ? "You're booked!" : "Response recorded"}</h1>
            <p className="text-muted-foreground">{isConfirm ? `Thanks for confirming${meta.vacancyTitle ? ` for ${meta.vacancyTitle}` : ""}. We've sent a confirmation email — the shift will appear in your candidate calendar.` : "Thanks for letting us know. We'll keep you in mind for the next opportunity."}</p>
          </>
        )}
        {state === "already" && (<><AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" /><h1 className="text-2xl font-bold mb-2">Already responded</h1><p className="text-muted-foreground">This invitation was already marked as <b>{meta.status}</b>.</p></>)}
        {state === "error" && (<><XCircle className="h-12 w-12 text-destructive mx-auto mb-4" /><h1 className="text-2xl font-bold mb-2">Something went wrong</h1><p className="text-muted-foreground">{message}</p></>)}
      </div>
    </div>
  );
}
