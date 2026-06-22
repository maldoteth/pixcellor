import { useEffect, useRef, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type CompaniesHouseSelection = {
  company: string;
  /** Title-cased first active director, when available. */
  director?: string;
  address_line1?: string;
  city?: string;
  postcode?: string;
  country?: string;
  /** Composed address line — convenient for CRM `location` columns. */
  location?: string;
  company_number?: string;
};

type CHHit = { company_number: string; title: string; address_snippet: string; status?: string };

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSelect: (selection: CompaniesHouseSelection) => void;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
};

/**
 * Reusable Companies House typeahead input. Wraps a shadcn <Input/>, performs
 * debounced search against the `companies-house-search` edge function, and
 * fires `onSelect` with the full company profile (incl. first director and
 * registered address) when the user picks a result.
 */
export function CompaniesHouseInput({
  value,
  onChange,
  onSelect,
  placeholder = "Start typing to search…",
  autoFocus,
  disabled,
  id,
  className,
}: Props) {
  const [hits, setHits] = useState<CHHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [picking, setPicking] = useState(false);
  const timerRef = useRef<number | null>(null);
  const reqId = useRef(0);

  useEffect(() => () => { if (timerRef.current) window.clearTimeout(timerRef.current); }, []);

  const search = (raw: string) => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    const term = raw.trim();
    if (term.length < 2) { setHits([]); setOpen(false); return; }
    timerRef.current = window.setTimeout(async () => {
      const id = ++reqId.current;
      setLoading(true);
      try {
        const projectRef = (import.meta as any).env.VITE_SUPABASE_PROJECT_ID;
        const anon = (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const url = `https://${projectRef}.supabase.co/functions/v1/companies-house-search?q=${encodeURIComponent(term)}`;
        const r = await fetch(url, { headers: { Authorization: `Bearer ${anon}`, apikey: anon } });
        const json = await r.json();
        if (id !== reqId.current) return;
        setHits(Array.isArray(json?.items) ? json.items : []);
        setOpen(true);
      } catch {
        if (id === reqId.current) setHits([]);
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    }, 280);
  };

  const pick = async (hit: CHHit) => {
    setOpen(false);
    setPicking(true);
    onChange(hit.title);
    try {
      const projectRef = (import.meta as any).env.VITE_SUPABASE_PROJECT_ID;
      const anon = (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const url = `https://${projectRef}.supabase.co/functions/v1/companies-house-search?number=${encodeURIComponent(hit.company_number)}`;
      const r = await fetch(url, { headers: { Authorization: `Bearer ${anon}`, apikey: anon } });
      const json = await r.json();
      const company = (json?.company_name as string) || hit.title;
      const director = json?.directors?.[0]?.name as string | undefined;
      const address_line1 = json?.address?.address_line1 as string | undefined;
      const city = json?.address?.city as string | undefined;
      const postcode = json?.address?.postcode as string | undefined;
      const country = json?.address?.country as string | undefined;
      const location = [address_line1, city, postcode, country]
        .map((s) => (typeof s === "string" ? s.trim() : ""))
        .filter(Boolean)
        .join(", ") || undefined;
      onSelect({
        company,
        director,
        address_line1,
        city,
        postcode,
        country,
        location,
        company_number: hit.company_number,
      });
    } catch {
      // Falls back to just setting the company name — user can fill the rest manually.
      onSelect({ company: hit.title, company_number: hit.company_number });
    } finally {
      setPicking(false);
    }
  };

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Input
          id={id}
          autoComplete="off"
          autoFocus={autoFocus}
          disabled={disabled || picking}
          value={value}
          onChange={(e) => { onChange(e.target.value); search(e.target.value); }}
          onFocus={() => { if (hits.length) setOpen(true); }}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          className="pr-9"
        />
        <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
          {loading || picking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </div>
      </div>
      {open && hits.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-64 overflow-auto rounded-md border border-border bg-popover shadow-lg">
          <div className="px-3 py-2 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border/60">
            Companies House
          </div>
          {hits.map((h) => (
            <button
              key={h.company_number}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(h)}
              className="block w-full text-left px-3 py-2 hover:bg-muted/60 border-b border-border/40 last:border-0"
            >
              <div className="text-sm font-medium">{h.title}</div>
              <div className="text-xs text-muted-foreground truncate">{h.company_number} · {h.address_snippet}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default CompaniesHouseInput;
