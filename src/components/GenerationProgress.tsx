import { useEffect, useState } from "react";

interface GenerationProgressProps {
  label?: string;
  helper?: string;
  estimatedSeconds?: number;
}

/**
 * Simulated progress bar for AI generation. Eases toward ~95% over the
 * estimated duration; the parent unmounts it when generation completes.
 */
const GenerationProgress = ({
  label = "Building your sample…",
  helper = "Our AI is rendering a desktop preview of your dream site which our engineers will then improve",
  estimatedSeconds = 30,
}: GenerationProgressProps) => {
  const [progress, setProgress] = useState(2);

  useEffect(() => {
    const start = Date.now();
    const totalMs = estimatedSeconds * 1000;
    const id = window.setInterval(() => {
      const elapsed = Date.now() - start;
      // Ease-out: approach 95% asymptotically
      const t = Math.min(elapsed / totalMs, 1);
      const eased = 1 - Math.pow(1 - t, 2);
      const next = Math.min(95, Math.round(eased * 95));
      setProgress((prev) => (next > prev ? next : prev));
    }, 200);
    return () => window.clearInterval(id);
  }, [estimatedSeconds]);

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 w-full">
      <p className="text-foreground text-base font-medium">{label}</p>
      <div className="w-full max-w-sm">
        <div className="h-2 w-full bg-foreground/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-foreground transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-foreground/60">
          <span>Generating…</span>
          <span className="tabular-nums">{progress}%</span>
        </div>
      </div>
      <p className="text-foreground/70 text-sm text-center max-w-xs">{helper}</p>
    </div>
  );
};

export default GenerationProgress;
