import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const PORTAL_ACCESS_CODE = "42069";
const PORTAL_ACCESS_STORAGE_KEY = "pixcellor_portal_access_code";

export default function PortalAuth() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(PORTAL_ACCESS_STORAGE_KEY) === PORTAL_ACCESS_CODE) {
      navigate("/portal", { replace: true });
    }
  }, [navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const cleanCode = code.trim();
    if (!/^\d{5}$/.test(cleanCode)) {
      toast.error("Enter the 5-digit access code.");
      setBusy(false);
      return;
    }
    if (cleanCode !== PORTAL_ACCESS_CODE) {
      toast.error("Wrong access code.");
      setBusy(false);
      return;
    }
    sessionStorage.setItem(PORTAL_ACCESS_STORAGE_KEY, cleanCode);
    navigate("/portal", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Pixcellor Dev Portal</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              placeholder="Access code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 5))}
              required
              minLength={5}
              maxLength={5}
            />
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "…" : "Enter portal"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export { PORTAL_ACCESS_CODE, PORTAL_ACCESS_STORAGE_KEY };