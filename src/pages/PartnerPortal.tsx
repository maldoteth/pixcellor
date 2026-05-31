import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import SeoHead from "@/components/SeoHead";
import { LogOut, Mail, Phone, Search } from "lucide-react";

type Lead = {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  status: string;
  source: string;
  created_at: string;
};

type PartnerAccount = { email: string; source_key: string; label: string | null };

export default function PartnerPortal() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [partner, setPartner] = useState<PartnerAccount | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        navigate("/portal-login", { replace: true });
        return;
      }
      const { data: pa, error: paErr } = await supabase
        .from("partner_accounts" as any)
        .select("email, source_key, label")
        .maybeSingle();
      if (!active) return;
      if (paErr || !pa) {
        toast.error("No partner access for this account.");
        await supabase.auth.signOut();
        navigate("/portal-login", { replace: true });
        return;
      }
      setPartner(pa as PartnerAccount);
      const { data: rows, error } = await supabase
        .from("contacts")
        .select("id, name, contact_name, email, phone, notes, status, source, created_at")
        .order("created_at", { ascending: false });
      if (!active) return;
      if (error) {
        toast.error(error.message);
      } else {
        setLeads((rows ?? []) as Lead[]);
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [navigate]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter((l) =>
      [l.name, l.contact_name, l.email, l.phone, l.notes].some((v) => v?.toLowerCase().includes(q))
    );
  }, [leads, query]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/portal-login", { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground/60 flex items-center justify-center text-sm">
        Loading your leads…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6">
      <SeoHead title="Leads · Pixcellor partner portal" description="Your incoming leads" path="/partner" noindex />
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold">{partner?.label ?? "Partner"} · Leads</h1>
            <p className="text-sm text-muted-foreground">Every enquiry submitted through your website lives here.</p>
          </div>
          <Button variant="outline" size="sm" onClick={signOut}><LogOut className="h-4 w-4 mr-1.5" />Sign out</Button>
        </header>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
            <CardTitle className="text-base">All leads ({leads.length})</CardTitle>
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, email, phone, notes"
                className="pl-8"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No leads yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Received</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="font-medium">{l.contact_name || l.name}</TableCell>
                        <TableCell>
                          <div className="space-y-1 text-xs">
                            {l.email && (
                              <a href={`mailto:${l.email}`} className="flex items-center gap-1.5 hover:underline">
                                <Mail className="h-3 w-3" />{l.email}
                              </a>
                            )}
                            {l.phone && (
                              <a href={`tel:${l.phone}`} className="flex items-center gap-1.5 hover:underline">
                                <Phone className="h-3 w-3" />{l.phone}
                              </a>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-sm">
                          <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">{l.notes || "—"}</p>
                        </TableCell>
                        <TableCell><Badge variant="secondary" className="capitalize">{l.status}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(l.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
