import { useMemo, useState } from "react";
import { Users, ChevronDown, ChevronRight, Merge, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ContactRow = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  status?: string | null;
  source?: string | null;
  lead_score?: number | null;
  updated_at?: string | null;
};

type DuplicateGroup = {
  key: string;
  reason: string;
  members: ContactRow[];
};

const DISMISS_KEY = "portal_dedup_dismissed";

function loadDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveDismissed(set: Set<string>) {
  try {
    localStorage.setItem(DISMISS_KEY, JSON.stringify([...set]));
  } catch {
    // noop
  }
}

function normalisePhoneKey(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 9) return null;
  return digits.slice(-10);
}

function buildGroups(contacts: ContactRow[], dismissed: Set<string>): DuplicateGroup[] {
  const byEmail = new Map<string, ContactRow[]>();
  const byPhone = new Map<string, ContactRow[]>();

  for (const c of contacts) {
    if (c.status === "archived") continue;
    const email = (c.email ?? "").trim().toLowerCase();
    if (email) {
      const arr = byEmail.get(email) ?? [];
      arr.push(c);
      byEmail.set(email, arr);
    }
    const phoneKey = normalisePhoneKey(c.phone);
    if (phoneKey) {
      const arr = byPhone.get(phoneKey) ?? [];
      arr.push(c);
      byPhone.set(phoneKey, arr);
    }
  }

  const groups: DuplicateGroup[] = [];
  const seenKeys = new Set<string>();

  for (const [email, members] of byEmail) {
    if (members.length < 2) continue;
    const key = `email:${email}`;
    if (dismissed.has(key)) continue;
    seenKeys.add(key);
    groups.push({ key, reason: `Same email: ${email}`, members });
  }
  for (const [phone, members] of byPhone) {
    if (members.length < 2) continue;
    const memberIds = members.map((m) => m.id).sort().join(",");
    // Skip if these exact contacts already appeared via email match
    const overlap = [...seenKeys].some((k) => {
      if (!k.startsWith("email:")) return false;
      const ids = (byEmail.get(k.slice(6)) ?? []).map((m) => m.id).sort().join(",");
      return ids === memberIds;
    });
    if (overlap) continue;
    const key = `phone:${phone}`;
    if (dismissed.has(key)) continue;
    groups.push({ key, reason: `Same phone (…${phone.slice(-4)})`, members });
  }

  // Sort: groups with paid/gold first, then by member count
  return groups.sort((a, b) => b.members.length - a.members.length);
}

export function DuplicateContactsPanel({ contacts, onMerged }: { contacts: ContactRow[]; onMerged?: () => void }) {
  const [dismissed, setDismissed] = useState<Set<string>>(loadDismissed);
  const [expanded, setExpanded] = useState(false);
  const [openGroupKey, setOpenGroupKey] = useState<string | null>(null);
  const [merging, setMerging] = useState(false);
  const [pendingMerge, setPendingMerge] = useState<{ survivor: ContactRow; duplicates: ContactRow[] } | null>(null);

  const groups = useMemo(() => buildGroups(contacts, dismissed), [contacts, dismissed]);

  if (groups.length === 0) return null;

  const dismissGroup = (key: string) => {
    const next = new Set(dismissed);
    next.add(key);
    saveDismissed(next);
    setDismissed(next);
  };

  const doMerge = async () => {
    if (!pendingMerge) return;
    setMerging(true);
    try {
      const { data, error } = await supabase.rpc("merge_contacts", {
        survivor_id: pendingMerge.survivor.id,
        duplicate_ids: pendingMerge.duplicates.map((d) => d.id),
      });
      if (error) throw error;
      toast({ title: "Merged", description: `Combined ${pendingMerge.duplicates.length + 1} records into one.` });
      setPendingMerge(null);
      onMerged?.();
    } catch (e) {
      toast({ title: "Merge failed", description: (e as Error)?.message ?? "Unknown error", variant: "destructive" });
    } finally {
      setMerging(false);
    }
  };

  return (
    <>
      <Card className="rounded-none border-amber-500/40 bg-amber-500/5 p-3 text-sm">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center gap-2 text-left"
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <Users className="h-4 w-4 text-amber-400" />
          <span className="font-medium">
            {groups.length} possible duplicate group{groups.length === 1 ? "" : "s"}
          </span>
          <span className="text-muted-foreground text-xs">
            ({groups.reduce((n, g) => n + g.members.length, 0)} contacts)
          </span>
        </button>

        {expanded && (
          <div className="mt-3 space-y-3">
            {groups.map((group) => {
              const isOpen = openGroupKey === group.key;
              return (
                <div key={group.key} className="rounded-none border border-border/60 bg-background/50 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setOpenGroupKey(isOpen ? null : group.key)}
                      className="flex flex-1 items-center gap-2 text-left"
                    >
                      {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                      <span className="text-xs font-medium">{group.reason}</span>
                      <Badge variant="outline" className="rounded-none text-[10px]">
                        {group.members.length} records
                      </Badge>
                    </button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-muted-foreground"
                      onClick={() => dismissGroup(group.key)}
                    >
                      <X className="mr-1 h-3 w-3" /> Not duplicates
                    </Button>
                  </div>

                  {isOpen && (
                    <div className="mt-2 space-y-2">
                      {group.members.map((m) => (
                        <div
                          key={m.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-none border border-border/40 bg-card/30 px-2 py-1.5"
                        >
                          <div className="min-w-0 flex-1 text-xs">
                            <div className="truncate font-medium">{m.name}</div>
                            <div className="truncate text-muted-foreground">
                              {[m.email, m.phone, m.website].filter(Boolean).join(" · ") || "—"}
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
                              {m.status && <Badge variant="outline" className="rounded-none text-[10px]">{m.status}</Badge>}
                              {m.source && <span>· {m.source}</span>}
                              {m.lead_score != null && <span>· score {m.lead_score}</span>}
                              {m.updated_at && (
                                <span>· updated {new Date(m.updated_at).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 shrink-0 rounded-none text-xs"
                            onClick={() => {
                              const duplicates = group.members.filter((x) => x.id !== m.id);
                              if (duplicates.length === 0 || duplicates.length > 5) return;
                              setPendingMerge({ survivor: m, duplicates });
                            }}
                          >
                            <Merge className="mr-1 h-3 w-3" /> Keep this, merge rest
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <AlertDialog open={!!pendingMerge} onOpenChange={(o) => !o && setPendingMerge(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Merge {pendingMerge?.duplicates.length} contact(s)?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  Survivor: <span className="font-medium">{pendingMerge?.survivor.name}</span>
                </p>
                <p>Will absorb and delete:</p>
                <ul className="list-disc pl-5">
                  {pendingMerge?.duplicates.map((d) => (
                    <li key={d.id}>{d.name} {d.email ? `· ${d.email}` : ""}</li>
                  ))}
                </ul>
                <p className="text-muted-foreground text-xs">
                  All events, callbacks, chat conversations and notes attached to the duplicates will move to the survivor. This cannot be undone.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={merging}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                doMerge();
              }}
              disabled={merging}
            >
              {merging ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Merge className="mr-2 h-3 w-3" />}
              Merge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
