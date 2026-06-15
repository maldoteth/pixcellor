import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function MeetingRedirect() {
  const { code = "" } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const normalized = code.trim().toUpperCase();
      if (!/^[A-Z0-9]{4,12}$/.test(normalized)) {
        setError("Invalid meeting link.");
        return;
      }
      const { data, error: invokeError } = await supabase.functions.invoke("resolve-meeting-code", {
        body: { code: normalized },
      });
      if (cancelled) return;
      if (invokeError || !data?.ok) {
        setError("This meeting link is invalid or has expired.");
        return;
      }
      navigate(`/call/${data.booking_id}?t=${data.token}`, { replace: true });
    })();
    return () => { cancelled = true; };
  }, [code, navigate]);

  return (
    <main className="min-h-dvh flex items-center justify-center bg-background text-foreground p-6">
      <div className="text-center max-w-md">
        {error ? (
          <>
            <h1 className="text-xl font-semibold mb-2">Meeting unavailable</h1>
            <p className="text-sm text-muted-foreground">{error}</p>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 h-6 w-6 animate-spin rounded-full border-2 border-foreground/30 border-t-foreground" />
            <p className="text-sm text-muted-foreground">Opening your meeting…</p>
          </>
        )}
      </div>
    </main>
  );
}
