// Renders inside the existing /portal route as a single "Leads" tab for
// partner clients (non-admin users mapped to a contacts.source via the
// partner_accounts table). RLS scopes the contacts query to their leads only.
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { LogOut, Mail, Phone, Search, Inbox } from "lucide-react";

export type PartnerAccount = { email: string; source_key: string; label: string | null };

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

export default function PartnerLeadsView({ partner }: { partner: PartnerAccount }) {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const loadLeads = async () => {
    const { data, error } = await supabase
      .from("contacts")
      .select("id, name, contact_name, email, phone, notes, status, source, created_at")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setLeads((data ?? []) as Lead[]);
    setLoading(false);
  };

  useEffect(() => {
    loadLeads();
    const channel = supabase
      .channel("partner-leads")
      .on("postgres_changes", { event: "*", schema: "public", table: "contacts" }, loadLeads)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

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

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold">{partner.label ?? "Partner"}</h1>
            <p className="text-sm text-muted-foreground">Your dashboard</p>
          </div>
          <Button variant="outline" size="sm" onClick={signOut}><LogOut className="h-4 w-4 mr-1.5" />Sign out</Button>
        </header>

        <Tabs defaultValue="leads" className="w-full">
          <TabsList>
            <TabsTrigger value="leads" className="gap-1.5"><Inbox className="h-4 w-4" />Leads</TabsTrigger>
          </TabsList>
          <TabsContent value="leads" className="mt-4">
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
                {loading ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
                ) : filtered.length === 0 ? (
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
