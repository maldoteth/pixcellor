// Dynamic per-affiliate share image (SVG, 1200x630).
// Public endpoint, no auth — referenced from <meta og:image>.
// URL: /affiliate-share-image?code=ABCDE
//
// Branded for Pixcellor Atelier:
//   • Near-black canvas (#0B0B10) with faint cyan/magenta pixel sparkle.
//   • Brushed-silver wordmark plate (structural neutral).
//   • ONE rare gold element per screen — the invite code chip.
//   • Geist family with a single Fraunces italic emotional word.
//   • Hairline gold-sheen rule, glass QR card.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import QRCode from "https://esm.sh/qrcode@1.5.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Atelier tokens (from colors_and_type.css) ───────────────────────────────
const BG_0 = "#0B0B10";
const BG_1 = "#111118";
const FG_0 = "#F4F4F2";
const FG_2 = "#9A9A95";
const SILVER_0 = "#F4F2EE";
const SILVER_3 = "#8E8C86";
const SILVER_4 = "#5A5854";
const SILVER_5 = "#2E2D2A";
const GOLD_0 = "#FBE8B0";
const GOLD_1 = "#ECC971";
const GOLD_2 = "#C99B3F";
const GOLD_3 = "#8E6620";
const GOLD_TEXT = "#E2BC65";
const PIX_CYAN = "#5FB8C9";
const PIX_MAGENTA = "#C26BA0";

const ORIGIN = "https://pixcellor.com";
const WORDMARK_URL = `${ORIGIN}/pixcellor-wordmark-white.png`;

function escapeXml(s: string) {
  return s.replace(/[<>&"']/g, (c) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    '"': "&quot;",
    "'": "&apos;",
  }[c] as string));
}

function titleCase(s: string) {
  return s.replace(/[._-]+/g, " ").trim()
    .split(/\s+/)
    .map((w) => w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : "")
    .join(" ");
}

async function buildQrSvgPath(text: string, size: number): Promise<string> {
  const qr = QRCode.create(text, { errorCorrectionLevel: "M" });
  const modules = qr.modules;
  const count = modules.size;
  const cell = size / count;
  let path = "";
  for (let y = 0; y < count; y++) {
    for (let x = 0; x < count; x++) {
      if (modules.get(x, y)) {
        path += `M${(x * cell).toFixed(2)},${(y * cell).toFixed(2)}h${cell.toFixed(2)}v${cell.toFixed(2)}h-${cell.toFixed(2)}z`;
      }
    }
  }
  return path;
}

async function fetchWordmarkDataUri(): Promise<string | null> {
  try {
    const res = await fetch(WORDMARK_URL);
    if (!res.ok) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    return `data:image/png;base64,${btoa(bin)}`;
  } catch {
    return null;
  }
}

function buildSvg(opts: {
  name: string;
  code: string;
  shareUrl: string;
  qrPath: string;
  qrSize: number;
  wordmarkDataUri: string | null;
}): string {
  const W = 1200;
  const H = 630;
  const qrPad = 16;
  const qrBoxSize = opts.qrSize + qrPad * 2;
  const qrX = W - qrBoxSize - 64;
  const qrY = H - qrBoxSize - 64;
  const name = escapeXml(opts.name);
  const code = escapeXml(opts.code);
  const url = escapeXml(opts.shareUrl.replace(/^https?:\/\//, ""));

  const wordmarkH = 48;
  const wordmarkW = 240;
  const wordmark = opts.wordmarkDataUri
    ? `<image href="${opts.wordmarkDataUri}" x="0" y="0" width="${wordmarkW}" height="${wordmarkH}" preserveAspectRatio="xMinYMid meet"/>`
    : `<text x="0" y="36" fill="${FG_0}" font-size="36" font-weight="600" letter-spacing="-0.5">Pixcellor<tspan font-size="18" dy="-14" dx="2">™</tspan></text>`;

  // Whisper pixel sparkle — six dots in spectrum colours, low opacity.
  const sparkle = [
    { x: 140, y: 92, c: PIX_CYAN },
    { x: 1060, y: 130, c: PIX_MAGENTA },
    { x: 980, y: 360, c: GOLD_1 },
    { x: 96, y: 420, c: PIX_CYAN },
    { x: 540, y: 80, c: PIX_MAGENTA },
    { x: 720, y: 560, c: GOLD_0 },
  ].map((d) => `<circle cx="${d.x}" cy="${d.y}" r="2.5" fill="${d.c}" fill-opacity="0.35"/>`).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"
     font-family="Geist, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Inter, sans-serif">
  <defs>
    <!-- Brushed silver, vertical -->
    <linearGradient id="silverBrushed" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"  stop-color="${SILVER_5}"/>
      <stop offset="14%" stop-color="#4A4844"/>
      <stop offset="30%" stop-color="#7A7872"/>
      <stop offset="48%" stop-color="#6E6C66"/>
      <stop offset="64%" stop-color="#888680"/>
      <stop offset="82%" stop-color="${SILVER_4}"/>
      <stop offset="100%" stop-color="${SILVER_5}"/>
    </linearGradient>

    <!-- Gold conic shimmer (approximated as multi-stop linear for max compatibility) -->
    <linearGradient id="goldShimmer" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stop-color="${GOLD_3}"/>
      <stop offset="22%"  stop-color="${GOLD_2}"/>
      <stop offset="48%"  stop-color="${GOLD_0}"/>
      <stop offset="62%"  stop-color="${GOLD_1}"/>
      <stop offset="82%"  stop-color="${GOLD_2}"/>
      <stop offset="100%" stop-color="${GOLD_3}"/>
    </linearGradient>

    <linearGradient id="goldSheen" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="${GOLD_3}" stop-opacity="0"/>
      <stop offset="30%"  stop-color="${GOLD_2}"/>
      <stop offset="55%"  stop-color="${GOLD_0}"/>
      <stop offset="80%"  stop-color="${GOLD_2}"/>
      <stop offset="100%" stop-color="${GOLD_3}" stop-opacity="0"/>
    </linearGradient>

    <radialGradient id="goldGlow" cx="85%" cy="100%" r="60%">
      <stop offset="0%"  stop-color="${GOLD_TEXT}" stop-opacity="0.18"/>
      <stop offset="60%" stop-color="${GOLD_TEXT}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="cyanGlow" cx="10%" cy="0%" r="55%">
      <stop offset="0%"  stop-color="${PIX_CYAN}" stop-opacity="0.10"/>
      <stop offset="60%" stop-color="${PIX_CYAN}" stop-opacity="0"/>
    </radialGradient>

    <!-- 1px brushed grain -->
    <pattern id="grain" width="2" height="2" patternUnits="userSpaceOnUse">
      <rect width="2" height="1" fill="rgba(255,255,255,0.04)"/>
    </pattern>

    <!-- Glass surface for QR card -->
    <linearGradient id="glassFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(244,244,242,0.10)"/>
      <stop offset="100%" stop-color="rgba(244,244,242,0.02)"/>
    </linearGradient>
  </defs>

  <!-- Velvet black canvas with diagonal corner glows -->
  <rect width="${W}" height="${H}" fill="${BG_0}"/>
  <rect width="${W}" height="${H}" fill="url(#cyanGlow)"/>
  <rect width="${W}" height="${H}" fill="url(#goldGlow)"/>

  <!-- 1px pixel-grid overlay -->
  <g stroke="${FG_0}" stroke-opacity="0.03">
    ${Array.from({ length: 13 }, (_, i) => `<line x1="0" x2="${W}" y1="${(i + 1) * 48}" y2="${(i + 1) * 48}"/>`).join("")}
    ${Array.from({ length: 25 }, (_, i) => `<line y1="0" y2="${H}" x1="${(i + 1) * 48}" x2="${(i + 1) * 48}"/>`).join("")}
  </g>

  <!-- Whisper pixel sparkle -->
  ${sparkle}

  <!-- Brushed-silver wordmark plate (structural neutral) -->
  <g transform="translate(64,56)">
    <rect x="-20" y="-16" width="${wordmarkW + 56}" height="${wordmarkH + 32}" rx="14" ry="14"
          fill="url(#silverBrushed)"/>
    <rect x="-20" y="-16" width="${wordmarkW + 56}" height="${wordmarkH + 32}" rx="14" ry="14"
          fill="url(#grain)"/>
    <rect x="-20" y="-16" width="${wordmarkW + 56}" height="${wordmarkH + 32}" rx="14" ry="14"
          fill="none" stroke="${SILVER_0}" stroke-opacity="0.18" stroke-width="1"/>
    ${wordmark}
  </g>

  <!-- Eyebrow (pixel font feel via uppercase + mega tracking) -->
  <g transform="translate(64,220)">
    <text x="0" y="0" fill="${FG_2}" font-size="18" font-weight="600" letter-spacing="8"
          font-family="'Pixelify Sans','Geist Mono',ui-monospace,monospace">AN  INVITATION</text>

    <!-- Hairline gold-sheen rule (the one gold element… plus the chip — used as a single rule cluster) -->
    <rect x="0" y="14" width="240" height="1" fill="url(#goldSheen)"/>

    <!-- Headline — Geist with ONE Fraunces italic word -->
    <text x="0" y="86" fill="${FG_0}" font-size="60" font-weight="600" letter-spacing="-1.5">${name}</text>
    <text x="0" y="150" fill="${FG_0}" fill-opacity="0.86" font-size="40" font-weight="500" letter-spacing="-0.5">
      <tspan>invites you to </tspan><tspan font-family="Fraunces, Georgia, serif" font-style="italic" font-weight="500">Pixcellor</tspan><tspan>™</tspan>
    </text>
    <text x="0" y="196" fill="${FG_2}" font-size="20" font-weight="500" letter-spacing="0.2">
      Hand-built websites for serious operators — 10% off your first project.
    </text>
  </g>

  <!-- Rare gold invite-code chip (the single gold jewel) -->
  <g transform="translate(64,470)">
    <!-- Outer 1px gold-sheen border via two layered rects -->
    <rect x="-1.5" y="-1.5" width="463" height="95" rx="17" ry="17" fill="url(#goldShimmer)" opacity="0.95"/>
    <rect x="0" y="0" width="460" height="92" rx="16" ry="16" fill="${BG_1}"/>
    <rect x="0" y="0" width="460" height="92" rx="16" ry="16" fill="url(#grain)" opacity="0.5"/>
    <text x="24" y="34" fill="${GOLD_TEXT}" font-size="12" font-weight="700" letter-spacing="6"
          font-family="'Pixelify Sans','Geist Mono',ui-monospace,monospace">INVITE  CODE</text>
    <text x="24" y="74" fill="url(#goldShimmer)" font-size="40" font-weight="700" letter-spacing="8"
          font-family="'Geist Mono',ui-monospace,SFMono-Regular,Menlo,monospace">${code}</text>
  </g>

  <!-- Glass QR card -->
  <g transform="translate(${qrX},${qrY})">
    <rect x="0" y="0" width="${qrBoxSize}" height="${qrBoxSize}" rx="20" ry="20"
          fill="url(#glassFill)" stroke="${FG_0}" stroke-opacity="0.12" stroke-width="1"/>
    <rect x="${qrPad - 4}" y="${qrPad - 4}" width="${opts.qrSize + 8}" height="${opts.qrSize + 8}" rx="6" ry="6" fill="${SILVER_0}"/>
    <g transform="translate(${qrPad},${qrPad})" fill="${BG_0}">
      <path d="${opts.qrPath}"/>
    </g>
  </g>
  <text x="${qrX + qrBoxSize / 2}" y="${qrY - 16}" text-anchor="middle" fill="${FG_2}"
        font-size="12" font-weight="700" letter-spacing="6"
        font-family="'Pixelify Sans','Geist Mono',ui-monospace,monospace">SCAN  TO  JOIN</text>
  <text x="${qrX + qrBoxSize / 2}" y="${qrY + qrBoxSize + 30}" text-anchor="middle" fill="${FG_2}"
        font-size="14" font-weight="500">${url}</text>
</svg>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const rawCode = (url.searchParams.get("code") || "").trim().toUpperCase();
    if (!/^[A-Z0-9-]{3,40}$/.test(rawCode)) {
      return new Response("invalid code", { status: 400, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) throw new Error("Server not configured");

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: codeRow } = await admin
      .from("affiliate_codes")
      .select("code, owner_user_id, share_name, active")
      .eq("code", rawCode)
      .maybeSingle();

    let displayName = "A friend";
    if (codeRow) {
      if (codeRow.share_name && codeRow.share_name.trim()) {
        displayName = codeRow.share_name.trim().slice(0, 40);
      } else if (codeRow.owner_user_id) {
        const { data: u } = await admin.auth.admin.getUserById(codeRow.owner_user_id);
        const email = u.user?.email || "";
        const local = email.split("@")[0] || "";
        if (local) displayName = titleCase(local).slice(0, 40);
      }
    }

    const shareUrl = `${ORIGIN}/r/${rawCode}`;
    const qrSize = 200;
    const [qrPath, wordmarkDataUri] = await Promise.all([
      buildQrSvgPath(shareUrl, qrSize),
      fetchWordmarkDataUri(),
    ]);
    const svg = buildSvg({ name: displayName, code: rawCode, shareUrl, qrPath, qrSize, wordmarkDataUri });

    return new Response(svg, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=300, s-maxage=3600",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(`error: ${message}`, { status: 500, headers: corsHeaders });
  }
});
