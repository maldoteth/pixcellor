import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  CheckCircle2, XCircle, Clock, Upload, FileText, ExternalLink, Trash2, Loader2, ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

export type KycDoc = {
  id: string;
  candidate_id: string;
  kind: string;
  category: string;
  label: string | null;
  file_url: string;
  filename: string | null;
  size_bytes: number | null;
  mime_type: string | null;
  expires_at: string | null;
  status: "pending" | "verified" | "rejected";
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export const KYC_CATEGORIES: Array<{ value: string; label: string; hint: string }> = [
  { value: "right_to_work", label: "Right to work", hint: "Passport, BRP, share code screenshot" },
  { value: "trade_ticket", label: "Trade tickets", hint: "CSCS, IPAF, PASMA, etc." },
  { value: "qualification", label: "Qualifications", hint: "Degrees, diplomas, training certificates" },
  { value: "id_address", label: "ID & address", hint: "Driving licence, utility bill, bank statement" },
];

export const STATUS_STYLE: Record<KycDoc["status"], { label: string; cls: string; Icon: typeof Clock }> = {
  pending: { label: "Pending review", cls: "bg-amber-500/15 text-amber-400 border-amber-500/30", Icon: Clock },
  verified: { label: "Verified", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", Icon: CheckCircle2 },
  rejected: { label: "Rejected", cls: "bg-red-500/15 text-red-400 border-red-500/30", Icon: XCircle },
};

function formatBytes(n: number | null) {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

async function signedUrl(filePath: string) {
  // file_url may already be a signed/public URL; only re-sign when it looks like a storage path
  if (filePath.startsWith("http")) return filePath;
  const { data } = await supabase.storage.from("candidate-files").createSignedUrl(filePath, 60 * 60 * 24);
  return data?.signedUrl ?? null;
}

/**
 * Shared KYC document UI. Works in two modes:
 *  - `mode="staff"` with a `candidateId`: uses admin RPCs (`portal_*`) for list/upload/review/delete.
 *  - `mode="candidate"`: uses self-service RPCs and reads/uploads to the candidate's own folder.
 */
export default function KycDocuments({
  mode,
  candidateId,
}: {
  mode: "staff" | "candidate";
  candidateId?: string;
}) {
  const [docs, setDocs] = useState<KycDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pickerCategory, setPickerCategory] = useState<string>(KYC_CATEGORIES[0].value);
  const [pickerLabel, setPickerLabel] = useState<string>("");
  const [pickerExpiry, setPickerExpiry] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [reviewing, setReviewing] = useState<{ doc: KycDoc; next: "verified" | "rejected" } | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  // For candidate self-upload we need to know our own candidate_id (for the storage path)
  const [selfCandidateId, setSelfCandidateId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    if (mode === "staff") {
      if (!candidateId) { setDocs([]); setLoading(false); return; }
      const { data, error } = await (supabase as any).rpc("portal_list_candidate_documents", { _candidate_id: candidateId });
      if (error) toast.error(error.message);
      setDocs((data as KycDoc[]) ?? []);
    } else {
      // Make sure candidates.user_id is linked to the auth user before listing.
      try { await supabase.rpc("candidate_link_self" as never); } catch { /* noop */ }
      const { data, error } = await (supabase as any).rpc("candidate_list_my_documents");
      if (error) toast.error(error.message);
      const rows = (data as KycDoc[]) ?? [];
      setDocs(rows);
      if (rows.length > 0) setSelfCandidateId(rows[0].candidate_id);
      else {
        const { data: me } = await (supabase as any).from("candidates").select("id").maybeSingle();
        if (me?.id) setSelfCandidateId(me.id);
      }
    }
    setLoading(false);
  }, [mode, candidateId]);

  useEffect(() => { void load(); }, [load]);

  const onUpload = async (file: File) => {
    if (file.size > 20 * 1024 * 1024) { toast.error("Max file size is 20MB"); return; }
    setUploading(true);
    try {
      const ownerId = mode === "staff" ? candidateId : selfCandidateId;
      if (!ownerId) throw new Error("Could not find candidate record");
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${ownerId}/kyc/${Date.now()}-${safeName}`;
      const { error: upErr } = await supabase.storage
        .from("candidate-files")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) throw upErr;
      // Store the storage path rather than a (soon-to-expire) signed URL.
      const fileUrl = path;
      const expires = pickerExpiry ? pickerExpiry : null;
      if (mode === "staff") {
        const { error } = await (supabase as any).rpc("portal_add_candidate_document", {
          _candidate_id: ownerId,
          _kind: pickerCategory,
          _file_url: fileUrl,
          _filename: file.name,
          _size_bytes: file.size,
          _mime_type: file.type,
          _category: pickerCategory,
          _label: pickerLabel.trim() || null,
          _expires_at: expires,
        });
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).rpc("candidate_self_add_document", {
          _category: pickerCategory,
          _label: pickerLabel.trim() || null,
          _file_url: fileUrl,
          _filename: file.name,
          _size_bytes: file.size,
          _mime_type: file.type,
          _expires_at: expires,
        });
        if (error) throw error;
      }
      toast.success("Document uploaded");
      setPickerLabel("");
      setPickerExpiry("");
      if (fileRef.current) fileRef.current.value = "";
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const openFile = async (d: KycDoc) => {
    const url = await signedUrl(d.file_url);
    if (url) window.open(url, "_blank", "noopener");
    else toast.error("File link expired or unavailable");
  };

  const deleteDoc = async (d: KycDoc) => {
    if (!confirm("Delete this document?")) return;
    if (mode === "staff") {
      const { error } = await (supabase as any).rpc("portal_delete_candidate_document", { _id: d.id });
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await (supabase as any).rpc("candidate_delete_my_document", { _id: d.id });
      if (error) { toast.error(error.message); return; }
    }
    // Best-effort storage cleanup (admin-only delete policy will silently fail for candidates not owning the path)
    if (!d.file_url.startsWith("http")) {
      await supabase.storage.from("candidate-files").remove([d.file_url]).catch(() => undefined);
    }
    toast.success("Removed");
    await load();
  };

  const submitReview = async () => {
    if (!reviewing) return;
    const { error } = await (supabase as any).rpc("portal_set_document_status", {
      _id: reviewing.doc.id,
      _status: reviewing.next,
      _note: reviewNote.trim() || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success(reviewing.next === "verified" ? "Marked verified" : "Marked rejected");
    setReviewing(null);
    setReviewNote("");
    await load();
  };

  const grouped = KYC_CATEGORIES.map((c) => ({ ...c, items: docs.filter((d) => (d.category ?? d.kind) === c.value) }));
  const other = docs.filter((d) => !KYC_CATEGORIES.some((c) => c.value === (d.category ?? d.kind)));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <div className="text-sm font-medium">KYC documents</div>
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
      </div>

      <Card className="p-3 space-y-3">
        <div className="text-xs font-medium">Upload a document</div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <div>
            <Label className="text-xs">Category</Label>
            <Select value={pickerCategory} onValueChange={setPickerCategory}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {KYC_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {KYC_CATEGORIES.find((c) => c.value === pickerCategory)?.hint}
            </p>
          </div>
          <div>
            <Label className="text-xs">Label (e.g. "Passport", "CSCS card")</Label>
            <Input value={pickerLabel} onChange={(e) => setPickerLabel(e.target.value)} className="h-9" />
          </div>
          <div>
            <Label className="text-xs">Expiry (optional)</Label>
            <Input type="date" value={pickerExpiry} onChange={(e) => setPickerExpiry(e.target.value)} className="h-9" />
          </div>
          <div className="flex items-end">
            <label className="w-full cursor-pointer">
              <input
                ref={fileRef}
                type="file"
                accept="image/*,.pdf,.doc,.docx"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); }}
              />
              <Button asChild className="w-full" disabled={uploading}>
                <span>
                  {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  Upload file
                </span>
              </Button>
            </label>
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        {grouped.map((g) => (
          <div key={g.value} className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-medium">
              <span>{g.label}</span>
              <span className="text-muted-foreground">({g.items.length})</span>
            </div>
            {g.items.length === 0 ? (
              <p className="text-[11px] text-muted-foreground italic">No {g.label.toLowerCase()} uploaded.</p>
            ) : (
              <div className="space-y-1.5">
                {g.items.map((d) => (
                  <DocRow key={d.id} d={d} mode={mode} onOpen={() => openFile(d)} onDelete={() => deleteDoc(d)}
                          onReview={(next) => { setReviewing({ doc: d, next }); setReviewNote(d.review_note ?? ""); }} />
                ))}
              </div>
            )}
          </div>
        ))}
        {other.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs font-medium">Other</div>
            <div className="space-y-1.5">
              {other.map((d) => (
                <DocRow key={d.id} d={d} mode={mode} onOpen={() => openFile(d)} onDelete={() => deleteDoc(d)}
                        onReview={(next) => { setReviewing({ doc: d, next }); setReviewNote(d.review_note ?? ""); }} />
              ))}
            </div>
          </div>
        )}
      </div>

      <Dialog open={!!reviewing} onOpenChange={(o) => { if (!o) { setReviewing(null); setReviewNote(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {reviewing?.next === "verified" ? "Mark as verified" : "Mark as rejected"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <div className="text-muted-foreground text-xs">
              {reviewing?.doc.label ?? reviewing?.doc.filename ?? "Document"}
            </div>
            <Label className="text-xs">Note to candidate (optional)</Label>
            <Textarea rows={3} value={reviewNote} onChange={(e) => setReviewNote(e.target.value)}
                      placeholder={reviewing?.next === "rejected" ? "Tell them what's wrong / what to re-upload" : "Optional internal note"} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReviewing(null); setReviewNote(""); }}>Cancel</Button>
            <Button onClick={submitReview} variant={reviewing?.next === "rejected" ? "destructive" : "default"}>
              {reviewing?.next === "verified" ? "Verify" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DocRow({
  d, mode, onOpen, onDelete, onReview,
}: {
  d: KycDoc;
  mode: "staff" | "candidate";
  onOpen: () => void;
  onDelete: () => void;
  onReview: (next: "verified" | "rejected") => void;
}) {
  const s = STATUS_STYLE[d.status] ?? STATUS_STYLE.pending;
  const StatusIcon = s.Icon;
  const canDelete = mode === "staff" || d.status === "pending";
  const isExpired = d.expires_at && new Date(d.expires_at) < new Date();
  return (
    <Card className="p-2.5">
      <div className="flex items-start gap-2">
        <FileText className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <button onClick={onOpen} className="text-sm font-medium truncate hover:underline text-left">
              {d.label || d.filename || "Document"}
            </button>
            <Badge variant="outline" className={`text-[10px] gap-1 ${s.cls}`}>
              <StatusIcon className="h-3 w-3" />
              {s.label}
            </Badge>
            {isExpired && (
              <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-400 border-red-500/30">Expired</Badge>
            )}
          </div>
          <div className="mt-0.5 text-[10px] text-muted-foreground truncate">
            {d.filename ? `${d.filename} · ` : ""}{formatBytes(d.size_bytes)}
            {d.expires_at ? ` · expires ${new Date(d.expires_at).toLocaleDateString()}` : ""}
            {" · uploaded "}{new Date(d.created_at).toLocaleDateString()}
          </div>
          {d.review_note && (
            <div className="mt-1 text-[11px] italic text-muted-foreground">"{d.review_note}"</div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onOpen} title="Open">
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
          {mode === "staff" && d.status !== "verified" && (
            <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-500 hover:text-emerald-400" onClick={() => onReview("verified")} title="Verify">
              <CheckCircle2 className="h-4 w-4" />
            </Button>
          )}
          {mode === "staff" && d.status !== "rejected" && (
            <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-400" onClick={() => onReview("rejected")} title="Reject">
              <XCircle className="h-4 w-4" />
            </Button>
          )}
          {canDelete && (
            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={onDelete} title="Delete">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
