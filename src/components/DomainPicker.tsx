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
  estimated?: boolean;
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
  onBack?: () => void;
  submitting?: boolean;
}

const LOADING_MESSAGES = [
  "Searching now…",
  "Finding best options…",
  "Checking multiple registrars…",
  "Comparing best prices…",
  "Aggregating data…",
  "Nearly there…",
];

const DomainPicker = ({ onChoose, onBack, submitting }: Props) => {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [primary, setPrimary] = useState<Primary | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<{ domain: string; topUpGbp: number; freeWithPackage: boolean } | null>(null);
  const [verifyingDomain, setVerifyingDomain] = useState<string | null>(null);
  // Cache verified-on-click suggestion results so we don't re-hit the API.
  const [verifiedSuggestions, setVerifiedSuggestions] = useState<Record<string, { priceGbp: number | null; topUpGbp: number; available: boolean | null; isPremium: boolean }>>({});
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
      setVerifiedSuggestions({});
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

  // Cycle loading messages while a search is in flight.
  useEffect(() => {
    if (!loading) return;
    setLoadingMsgIdx(0);
    const id = window.setInterval(() => {
      setLoadingMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 900);
    return () => window.clearInterval(id);
  }, [loading]);

  const verifyAndSelect = async (domain: string, fallbackTopUp: number, freeWithPackage: boolean) => {
    // If already verified, just select it.
    const cached = verifiedSuggestions[domain];
    if (cached) {
      if (cached.available === false || cached.priceGbp == null) {
        setError(cached.available === false ? `${domain} is already taken` : `Couldn't price ${domain}`);
        return;
      }
      setError(null);
      setSelected({ domain, topUpGbp: cached.topUpGbp, freeWithPackage });
      return;
    }
    setVerifyingDomain(domain);
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("domain-search", {
        body: { query: domain, mode: "verify" },
      });
      if (fnErr) throw fnErr;
      if (data?.error) throw new Error(data.error);
      const p = data?.primary;
      if (!p) throw new Error("No price returned");
      const result = {
        priceGbp: p.priceGbp ?? null,
        topUpGbp: Number(p.topUpGbp ?? 0),
        available: p.available ?? null,
        isPremium: !!p.isPremium,
      };
      setVerifiedSuggestions((prev) => ({ ...prev, [domain]: result }));
      if (result.available === false) {
        setError(`${domain} is already taken`);
        return;
      }
      if (!Number.isFinite(result.topUpGbp) || result.topUpGbp <= 0) {
        setError(`Couldn't price ${domain} right now`);
        return;
      }
      setSelected({ domain, topUpGbp: result.topUpGbp, freeWithPackage });
    } catch (e: any) {
      setError(e?.message || `Couldn't verify ${domain}`);
    } finally {
      setVerifyingDomain(null);
    }
  };

  const badgeFor = (_freeWithPackage: boolean, topUpGbp: number, priceGbp: number | null, estimated?: boolean) => {
    const prefix = estimated ? "from " : "";
    if (topUpGbp > 0) return <span className="text-xs font-semibold text-foreground/80">{prefix}£{topUpGbp.toFixed(2)} first yr</span>;
    if (priceGbp !== null) return <span className="text-xs text-foreground/60">{prefix}£{priceGbp.toFixed(2)}/yr</span>;
    return null;
  };

  const renderRow = (
    domain: string,
    available: boolean | null,
    isPremium: boolean | undefined,
    priceGbp: number | null,
    topUpGbp: number,
    freeWithPackage: boolean,
    estimated?: boolean,
  ) => {
    const verified = verifiedSuggestions[domain];
    // After verify, the verified data wins over the estimated badge.
    const effectiveAvailable = verified ? verified.available : available;
    const effectivePrice = verified ? verified.priceGbp : priceGbp;
    const effectiveTopUp = verified ? verified.topUpGbp : topUpGbp;
    const effectivePremium = verified ? verified.isPremium : isPremium;
    const effectiveEstimated = verified ? false : estimated;

    const isSelected = selected?.domain === domain;
    const isVerifying = verifyingDomain === domain;
    // Taken domains can't be bought. Premium domains CAN be bought (real price shown).
    const disabled = effectiveAvailable === false || (!verified && estimated && effectiveAvailable === null && false);
    return (
      <button
        key={domain}
        type="button"
        disabled={disabled || submitting || isVerifying}
        onClick={() => {
          if (estimated && !verified) {
            void verifyAndSelect(domain, topUpGbp, freeWithPackage);
          } else {
            setSelected({ domain, topUpGbp: effectiveTopUp, freeWithPackage });
          }
        }}
        className={`w-full text-left rounded-md border px-3 py-2.5 transition flex items-center gap-2 ${
          isSelected
            ? "border-foreground/60 bg-foreground/10"
            : "border-foreground/15 bg-foreground/5 hover:border-foreground/30"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <Globe className="h-4 w-4 text-foreground/60 shrink-0" />
        <span className="flex-1 truncate font-medium text-sm">{domain}</span>
        {effectiveAvailable === false && <span className="text-xs text-foreground/50">Taken</span>}
        {effectivePremium && effectiveAvailable !== false && (
          <span className="text-[10px] uppercase tracking-wider text-foreground/60 px-1.5 py-0.5 rounded bg-foreground/10">Premium</span>
        )}
        {effectiveAvailable !== false && badgeFor(freeWithPackage, effectiveTopUp, effectivePrice, effectiveEstimated)}
        {isVerifying && <Loader2 className="h-3.5 w-3.5 animate-spin text-foreground/60" />}
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

      {(loading || error || primary) && (
        <div>
          {loading && (
            <div className="flex flex-col gap-1.5">
              <div className="h-4 overflow-hidden text-xs text-foreground/60">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={loadingMsgIdx}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.25 }}
                    className="block"
                  >
                    {LOADING_MESSAGES[loadingMsgIdx]}
                  </motion.span>
                </AnimatePresence>
              </div>
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
                        renderRow(s.domain, null, false, s.priceGbp, s.topUpGbp, s.freeWithPackage, s.estimated ?? true),
                      )}
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

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
            `Add ${selected.domain} (+£${selected.topUpGbp.toFixed(2)}) & pay`
          ) : (
            "Pick a domain to add"
          )}
        </Button>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={() => onBack?.()}
            className="flex-1 h-11 text-sm"
          >
            Back
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={() => onChoose({ kind: "skip" })}
            className="flex-1 h-11 text-sm"
          >
            Skip
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DomainPicker;
