import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Globe, Loader2, Search, Sparkles, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export type DomainChoice =
  | { kind: "skip" }
  | { kind: "own" }
  | { kind: "buy"; domain: string; topUpGbp: number; freeWithPackage: boolean };

type Suggestion = {
  domain: string;
  tld: string;
  priceGbp: number | null;
  topUpGbp: number;
  freeWithPackage: boolean;
  renewalGbp?: number | null;
};

type Primary = {
  domain: string;
  available: boolean | null;
  isPremium?: boolean;
  priceGbp: number | null;
  topUpGbp: number;
  freeWithPackage: boolean;
  rateLimited?: boolean;
  error?: string;
};

interface Props {
  onChoose: (choice: DomainChoice) => void;
  submitting?: boolean;
}

const DomainPicker = ({ onChoose, submitting }: Props) => {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [primary, setPrimary] = useState<Primary | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<{ domain: string; topUpGbp: number; freeWithPackage: boolean } | null>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (!query.trim() || query.trim().length < 2) {
      setPrimary(null);
      setSuggestions([]);
      setError(null);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: fnErr } = await supabase.functions.invoke("domain-search", {
          body: { query: query.trim() },
        });
        if (fnErr) throw fnErr;
        if (data?.error) throw new Error(data.error);
        setPrimary(data?.primary ?? null);
        setSuggestions(Array.isArray(data?.suggestions) ? data.suggestions : []);
      } catch (e: any) {
        setError(e?.message || "Couldn't search right now");
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query]);

  const badgeFor = (freeWithPackage: boolean, topUpGbp: number, priceGbp: number | null) => {
    if (freeWithPackage) return <span className="text-xs font-semibold text-emerald-400">Free with your package</span>;
    if (topUpGbp > 0) return <span className="text-xs font-semibold text-foreground/80">+£{topUpGbp.toFixed(2)} one-off</span>;
    if (priceGbp !== null) return <span className="text-xs text-foreground/60">£{priceGbp.toFixed(2)}/yr</span>;
    return null;
  };

  const renderRow = (
    domain: string,
    available: boolean | null,
    isPremium: boolean | undefined,
    priceGbp: number | null,
    topUpGbp: number,
    freeWithPackage: boolean,
  ) => {
    const isSelected = selected?.domain === domain;
    const disabled = available === false || isPremium || available === null;
    return (
      <button
        key={domain}
        type="button"
        disabled={disabled || submitting}
        onClick={() => setSelected({ domain, topUpGbp, freeWithPackage })}
        className={`w-full text-left rounded-md border px-3 py-2.5 transition flex items-center gap-2 ${
          isSelected
            ? "border-foreground/60 bg-foreground/10"
            : "border-foreground/15 bg-foreground/5 hover:border-foreground/30"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <Globe className="h-4 w-4 text-foreground/60 shrink-0" />
        <span className="flex-1 truncate font-medium text-sm">{domain}</span>
        {available === false && <span className="text-xs text-foreground/50">Taken</span>}
        {isPremium && <span className="text-xs text-foreground/50">Premium</span>}
        {available !== false && !isPremium && badgeFor(freeWithPackage, topUpGbp, priceGbp)}
        {isSelected && <Check className="h-4 w-4 text-foreground" />}
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <label className="text-foreground/70 text-xs uppercase tracking-wider">
        Want a domain too? We'll register it after payment.
      </label>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
        <input
          type="text"
          inputMode="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(null);
          }}
          placeholder="Search e.g. mybrand or mybrand.com"
          disabled={submitting}
          className="w-full bg-foreground/5 border border-foreground/15 rounded-md pl-9 pr-9 py-3 text-foreground placeholder:text-foreground/40 outline-none focus:border-foreground/40 transition"
          maxLength={120}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-foreground/40 hover:text-foreground"
            aria-label="Clear"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="min-h-[40px]">
        {loading && (
          <div className="flex flex-col gap-1.5">
            <span className="text-foreground/60 text-xs">Checking availability…</span>
            <div className="h-1 w-full overflow-hidden rounded-full bg-foreground/10">
              <motion.div
                className="h-full w-1/3 rounded-full bg-foreground"
                initial={{ x: "-100%" }}
                animate={{ x: "300%" }}
                transition={{ repeat: Infinity, duration: 1.1, ease: "easeInOut" }}
              />
            </div>
          </div>
        )}
        {error && <p className="text-red-400 text-xs">{error}</p>}

        <AnimatePresence>
          {primary && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-1.5"
            >
              {renderRow(
                primary.domain,
                primary.available,
                primary.isPremium,
                primary.priceGbp,
                primary.topUpGbp,
                primary.freeWithPackage,
              )}
              {suggestions.length > 0 && (
                <>
                  <div className="flex items-center gap-2 text-foreground/50 text-[11px] uppercase tracking-wider mt-2">
                    <Sparkles className="h-3 w-3" /> Suggestions
                  </div>
                  <div className="flex flex-col gap-1.5 max-h-[180px] overflow-y-auto pr-1">
                    {suggestions.slice(0, 6).map((s) =>
                      renderRow(s.domain, true, false, s.priceGbp, s.topUpGbp, s.freeWithPackage),
                    )}
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex flex-col gap-2 mt-1">
        <Button
          type="button"
          variant="pricing"
          disabled={!selected || submitting}
          onClick={() =>
            selected &&
            onChoose({
              kind: "buy",
              domain: selected.domain,
              topUpGbp: selected.topUpGbp,
              freeWithPackage: selected.freeWithPackage,
            })
          }
          className="h-12 font-semibold"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : selected ? (
            selected.freeWithPackage
              ? `Add ${selected.domain} (free) & pay`
              : `Add ${selected.domain} (+£${selected.topUpGbp.toFixed(2)}) & pay`
          ) : (
            "Pick a domain to add"
          )}
        </Button>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={() => onChoose({ kind: "own" })}
            className="flex-1 h-11 text-sm"
          >
            I'll use my own
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={() => onChoose({ kind: "skip" })}
            className="flex-1 h-11 text-sm"
          >
            Skip — pay now
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DomainPicker;
