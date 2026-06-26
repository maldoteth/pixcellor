import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Copy, ArrowRight, Share2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const PROJECT_REF = "rkgjkvghejcmostuqkgw";
const SHARE_IMG_BASE = `https://${PROJECT_REF}.supabase.co/functions/v1/affiliate-share-image`;
const SITE = "https://pixcellor.com";

const isValidCode = (raw: string) => /^[A-Z0-9-]{3,40}$/.test(raw);

export default function ReferralLanding() {
  const { code: rawCode } = useParams<{ code: string }>();
  const code = (rawCode || "").trim().toUpperCase();
  const valid = isValidCode(code);
  const [inviter, setInviter] = useState<string>("A friend");

  const shareImage = `${SHARE_IMG_BASE}?code=${encodeURIComponent(code)}`;
  const pageUrl = `${SITE}/r/${code}`;
  const ctaUrl = `/?ref=${code}`;

  useEffect(() => {
    if (!valid) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.rpc("get_affiliate_public" as never, { _code: code } as never);
      if (cancelled) return;
      const row = Array.isArray(data) ? data[0] as { share_name?: string | null } | undefined : null;
      if (row?.share_name) setInviter(row.share_name);
    })();
    // Auto-redirect after a brief moment so crawlers can read meta first.
    const t = window.setTimeout(() => {
      window.location.replace(ctaUrl);
    }, 1800);
    return () => { cancelled = true; window.clearTimeout(t); };
  }, [code, ctaUrl, valid]);

  const title = useMemo(() =>
    valid ? `${inviter} invited you to Pixcellor — 10% off your first project`
          : "Pixcellor — Software, growth & design",
  [inviter, valid]);
  const description = valid
    ? `Use code ${code} at checkout. Buyers get 10% off, the inviter earns 5% commission. Real software, growth and design — done for you.`
    : "Software, growth and design — done for you.";

  const copy = async (txt: string) => {
    try { await navigator.clipboard.writeText(txt); toast.success("Copied"); }
    catch { toast.error("Copy failed"); }
  };

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={pageUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={shareImage} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={shareImage} />
        {/* Crawler-safe fallback redirect */}
        <meta httpEquiv="refresh" content={`3;url=${ctaUrl}`} />
      </Helmet>

      <main className="min-h-screen bg-black text-white flex items-center justify-center px-6 py-16">
        <div className="max-w-3xl w-full text-center space-y-8">
          {valid ? (
            <>
              <p className="text-sm uppercase tracking-[0.3em] text-white/50">You've been invited</p>
              <h1 className="text-4xl md:text-6xl font-bold leading-tight">
                {inviter} wants you on <span className="text-violet-400">Pixcellor</span>
              </h1>
              <p className="text-lg text-white/70">
                10% off your first project with code <span className="font-mono font-bold tracking-[0.3em] text-white">{code}</span>
              </p>
              <div className="mx-auto max-w-2xl overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
                <img
                  src={shareImage}
                  alt={`${inviter} invited you to Pixcellor`}
                  width={1200}
                  height={630}
                  className="w-full h-auto block"
                />
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Button asChild size="lg" variant="default">
                  <Link to={ctaUrl}>Continue to Pixcellor <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
                <Button size="lg" variant="outline" onClick={() => copy(pageUrl)}>
                  <Copy className="mr-2 h-4 w-4" /> Copy invite link
                </Button>
                {typeof navigator !== "undefined" && (navigator as Navigator & { share?: (data: ShareData) => Promise<void> }).share && (
                  <Button size="lg" variant="ghost" onClick={() => {
                    (navigator as Navigator & { share: (data: ShareData) => Promise<void> }).share({
                      title, text: description, url: pageUrl,
                    }).catch(() => undefined);
                  }}>
                    <Share2 className="mr-2 h-4 w-4" /> Share
                  </Button>
                )}
              </div>
              <p className="text-xs text-white/40 pt-4">Redirecting you to Pixcellor…</p>
            </>
          ) : (
            <>
              <h1 className="text-4xl font-bold">Invalid invite</h1>
              <p className="text-white/70">That referral code doesn't look right.</p>
              <Button asChild size="lg"><Link to="/">Go to Pixcellor</Link></Button>
            </>
          )}
        </div>
      </main>
    </>
  );
}
