import { useEffect, useRef, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Loader2, MapPin } from "lucide-react";
import { loadGoogleMaps } from "@/lib/google-maps-loader";

export type PlacePick = { address: string; latitude: number; longitude: number };

type Props = {
  value: string;
  onChange: (v: string) => void;
  onPick: (p: PlacePick) => void;
  placeholder?: string;
  countries?: string[]; // e.g. ["gb"]
  className?: string;
  id?: string;
};

/**
 * Google Places (New) autocomplete input.
 * Falls back to a plain text input when the browser key isn't configured.
 */
export default function PlaceAutocomplete({ value, onChange, onPick, placeholder, countries, className, id }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const sessionRef = useRef<any>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then(async (g) => {
        if (cancelled) return;
        const places = await g.maps.importLibrary("places");
        sessionRef.current = new places.AutocompleteSessionToken();
        setReady(true);
      })
      .catch((e) => setError(e.message || "Maps unavailable"));
    return () => { cancelled = true; };
  }, []);

  const fetchSuggestions = useCallback(async (input: string) => {
    if (!ready || !input.trim() || input.trim().length < 3) { setSuggestions([]); return; }
    try {
      setLoading(true);
      const g = (window as any).google;
      const places = await g.maps.importLibrary("places");
      const req: any = { input, sessionToken: sessionRef.current };
      if (countries?.length) req.includedRegionCodes = countries;
      const { suggestions } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions(req);
      setSuggestions(suggestions ?? []);
      setOpen(true);
    } catch (e) {
      console.error("autocomplete error", e);
    } finally {
      setLoading(false);
    }
  }, [ready, countries]);

  const handleInput = (v: string) => {
    onChange(v);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => fetchSuggestions(v), 220);
  };

  const handleSelect = async (s: any) => {
    try {
      const pred = s.placePrediction;
      const place = pred.toPlace();
      await place.fetchFields({ fields: ["formattedAddress", "location", "displayName"] });
      const address: string = place.formattedAddress ?? pred.text?.text ?? "";
      const loc = place.location;
      const lat = typeof loc?.lat === "function" ? loc.lat() : loc?.lat;
      const lng = typeof loc?.lng === "function" ? loc.lng() : loc?.lng;
      onChange(address);
      if (typeof lat === "number" && typeof lng === "number") {
        onPick({ address, latitude: lat, longitude: lng });
      }
      setSuggestions([]); setOpen(false);
      // refresh session token after a selection
      const g = (window as any).google;
      const places = await g.maps.importLibrary("places");
      sessionRef.current = new places.AutocompleteSessionToken();
    } catch (e) {
      console.error("place fetch error", e);
    }
  };

  return (
    <div className={`relative ${className ?? ""}`}>
      <div className="relative">
        <MapPin className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          id={id}
          ref={inputRef}
          value={value}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => suggestions.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder ?? "Start typing an address…"}
          className="pl-7 pr-7"
          autoComplete="off"
        />
        {loading && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />}
      </div>
      {error && <p className="text-[10px] text-muted-foreground mt-1">Address search unavailable — type it manually.</p>}
      {open && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-64 overflow-y-auto">
          {suggestions.map((s, i) => {
            const text = s.placePrediction?.text?.text ?? "";
            const second = s.placePrediction?.structuredFormat?.secondaryText?.text ?? "";
            const main = s.placePrediction?.structuredFormat?.mainText?.text ?? text;
            return (
              <button
                type="button"
                key={i}
                onMouseDown={(e) => { e.preventDefault(); handleSelect(s); }}
                className="block w-full text-left px-3 py-2 text-sm hover:bg-accent focus:bg-accent"
              >
                <div className="font-medium truncate">{main}</div>
                {second && <div className="text-xs text-muted-foreground truncate">{second}</div>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
