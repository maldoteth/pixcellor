import { useMemo, useRef, useState } from "react";
import { Upload, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

type ImportResult = { ok: boolean; error?: string };

export type CsvImportColumn = {
  key: string;
  label: string;
  required?: boolean;
  aliases?: string[];
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  columns: CsvImportColumn[];
  /** Called for each parsed row. Return {ok:true} on success. */
  importRow: (row: Record<string, string>) => Promise<ImportResult>;
  onDone?: () => void;
};

// Minimal RFC-4180 CSV parser (handles quoted fields and escaped quotes).
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else { field += ch; }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { row.push(field); field = ""; }
      else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        row.push(field); field = "";
        if (row.length > 1 || row[0] !== "") rows.push(row);
        row = [];
      } else { field += ch; }
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

export function CsvImportDialog({ open, onOpenChange, title, description, columns, importRow, onDone }: Props) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({}); // key -> header
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, ok: 0, failed: 0, errors: [] as string[] });

  const normalizedHeaders = useMemo(() => headers.map((h, i) => ({ index: i, raw: h, norm: norm(h) })), [headers]);

  const autoMap = (hdrs: string[]) => {
    const m: Record<string, string> = {};
    for (const col of columns) {
      const candidates = [col.key, col.label, ...(col.aliases ?? [])].map(norm);
      const found = hdrs.findIndex((h) => candidates.includes(norm(h)));
      if (found >= 0) m[col.key] = hdrs[found];
    }
    setMapping(m);
  };

  const handleFile = async (file: File) => {
    const text = await file.text();
    const parsed = parseCsv(text);
    if (parsed.length === 0) { toast({ title: "Empty CSV", variant: "destructive" }); return; }
    const hdrs = parsed[0].map((h) => h.trim());
    const dataRows = parsed.slice(1).filter((r) => r.some((c) => c && c.trim() !== ""));
    setHeaders(hdrs);
    setRows(dataRows);
    setProgress({ done: 0, ok: 0, failed: 0, errors: [] });
    autoMap(hdrs);
  };

  const runImport = async () => {
    for (const col of columns) {
      if (col.required && !mapping[col.key]) {
        toast({ title: `Map a column for "${col.label}"`, variant: "destructive" });
        return;
      }
    }
    setImporting(true);
    const errs: string[] = [];
    let ok = 0; let failed = 0;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const obj: Record<string, string> = {};
      for (const col of columns) {
        const hdr = mapping[col.key];
        if (!hdr) continue;
        const idx = headers.indexOf(hdr);
        obj[col.key] = (r[idx] ?? "").trim();
      }
      try {
        const res = await importRow(obj);
        if (res.ok) ok++; else { failed++; if (res.error) errs.push(`Row ${i + 2}: ${res.error}`); }
      } catch (e: any) {
        failed++; errs.push(`Row ${i + 2}: ${e?.message ?? "Unknown error"}`);
      }
      setProgress({ done: i + 1, ok, failed, errors: errs.slice(0, 20) });
    }
    setImporting(false);
    toast({ title: `Import complete`, description: `${ok} added, ${failed} failed` });
    if (ok > 0) onDone?.();
  };

  const downloadTemplate = () => {
    const csv = columns.map((c) => c.label).join(",") + "\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${title.toLowerCase().replace(/\s+/g, "-")}-template.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => { setRows([]); setHeaders([]); setMapping({}); setProgress({ done: 0, ok: 0, failed: 0, errors: [] }); if (fileRef.current) fileRef.current.value = ""; };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} className="text-sm" />
            <Button variant="ghost" size="sm" onClick={downloadTemplate} className="gap-1.5"><Download className="h-3.5 w-3.5" />Template</Button>
          </div>

          <div className="rounded-md border p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Expected columns</p>
            <p>{columns.map((c) => `${c.label}${c.required ? "*" : ""}`).join(" · ")}</p>
            <p className="mt-1">Headers are auto-matched. You can adjust the mapping below before importing.</p>
          </div>

          {headers.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Map columns ({rows.length} rows detected)</div>
              <div className="grid gap-2 sm:grid-cols-2">
                {columns.map((col) => (
                  <label key={col.key} className="flex items-center gap-2 text-sm">
                    <span className="w-36 shrink-0 text-muted-foreground">{col.label}{col.required && <span className="text-destructive"> *</span>}</span>
                    <select
                      className="flex-1 rounded-md border bg-background px-2 py-1 text-sm"
                      value={mapping[col.key] ?? ""}
                      onChange={(e) => setMapping({ ...mapping, [col.key]: e.target.value })}
                    >
                      <option value="">— skip —</option>
                      {normalizedHeaders.map((h) => <option key={h.index} value={h.raw}>{h.raw}</option>)}
                    </select>
                  </label>
                ))}
              </div>
            </div>
          )}

          {progress.done > 0 && (
            <div className="rounded-md border p-3 text-xs">
              <div className="font-medium text-foreground">{progress.done} / {rows.length} processed · {progress.ok} ok · {progress.failed} failed</div>
              {progress.errors.length > 0 && (
                <ul className="mt-2 max-h-32 overflow-y-auto list-disc pl-5 text-destructive">
                  {progress.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={runImport} disabled={importing || rows.length === 0} className="gap-2">
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {importing ? "Importing…" : `Import ${rows.length || ""}`.trim()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CsvImportDialog;
