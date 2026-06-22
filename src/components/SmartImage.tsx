import { ImgHTMLAttributes, useState } from "react";
import { cn } from "@/lib/utils";

interface SmartImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  /** Tailwind classes for the shimmer wrapper (e.g. rounded corners). */
  wrapperClassName?: string;
  /** Set false to disable the shimmer (e.g. when you already have a placeholder). */
  showSkeleton?: boolean;
}

/**
 * <img> with a shimmering skeleton placeholder while the bitmap decodes.
 * The skeleton fades out as soon as the browser fires `load` (or `error`).
 * Uses native lazy + async decoding by default for snappy paint.
 */
export function SmartImage({
  wrapperClassName,
  showSkeleton = true,
  className,
  onLoad,
  onError,
  loading = "lazy",
  decoding = "async",
  ...rest
}: SmartImageProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <span
      className={cn(
        "relative inline-block overflow-hidden align-top",
        wrapperClassName,
      )}
    >
      {showSkeleton && !loaded && (
        <span
          aria-hidden
          className="absolute inset-0 bg-foreground/[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(90deg, transparent 0%, hsla(0,0%,100%,0.06) 50%, transparent 100%)",
            backgroundSize: "200% 100%",
            animation: "smart-img-shimmer 1.2s linear infinite",
          }}
        />
      )}
      <img
        {...rest}
        loading={loading}
        decoding={decoding}
        className={cn(
          "block h-full w-full transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0",
          className,
        )}
        onLoad={(e) => {
          setLoaded(true);
          onLoad?.(e);
        }}
        onError={(e) => {
          setLoaded(true);
          onError?.(e);
        }}
      />
    </span>
  );
}

export default SmartImage;
