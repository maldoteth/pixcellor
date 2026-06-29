// Dynamic per-affiliate share image (SVG, 1200x630).
// Public endpoint, no auth — referenced from <meta og:image>.
// URL: /affiliate-share-image?code=ABCDE
//
// Designed to mirror the Pixcellor home OG card:
//   • Pitch-black canvas with faint pixel sparkle.
//   • Actual Pixcellor wordmark asset in the top-left — no fake text lockups.
//   • Gold hairline rule + uppercase eyebrow.
//   • Big headline with ONE Fraunces italic gold word.
//   • Muted subtitle, footer with domain + code, small QR bottom-right.
//   • No silver plate, no chrome.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import QRCode from "https://esm.sh/qrcode@1.5.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Atelier tokens
const BG = "#0B0B10";
const FG = "#F4F4F2";
const FG_MUTED = "#9A9A95";
const FG_DIM = "#6E6C66";
const GOLD_0 = "#FBE8B0";
const GOLD_1 = "#ECC971";
const GOLD_2 = "#C99B3F";
const GOLD_3 = "#8E6620";
const PIX_CYAN = "#5FB8C9";
const PIX_MAGENTA = "#C26BA0";

const ORIGIN = "https://pixcellor.com";
const LOGO_URL = `${ORIGIN}/pixcellor-wordmark-white.png`;

function escapeXml(s: string) {
  return s.replace(/[<>&"']/g, (c) => ({ "<":"&lt;",">":"&gt;","&":"&amp;",'"':"&quot;","'":"&apos;" }[c] as string));
}
function titleCase(s: string) {
  return s.replace(/[._-]+/g, " ").trim().split(/\s+/)
    .map((w) => w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : "").join(" ");
}

async function fetchLogoHref(): Promise<string> {
  try {
    const response = await fetch(LOGO_URL);
    if (!response.ok) return LOGO_URL;

    const contentType = response.headers.get("content-type") || "image/png";
    const bytes = new Uint8Array(await response.arrayBuffer());
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return `data:${contentType};base64,${btoa(binary)}`;
  } catch (_error) {
    return LOGO_URL;
  }
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
        path += `M${(x*cell).toFixed(2)},${(y*cell).toFixed(2)}h${cell.toFixed(2)}v${cell.toFixed(2)}h-${cell.toFixed(2)}z`;
      }
    }
  }
  return path;
}

function buildSvg(opts: { name: string; code: string; shareUrl: string; qrPath: string; qrSize: number; logoHref: string }): string {
  const W = 1200, H = 630;
  const name = escapeXml(opts.name);
  const code = escapeXml(opts.code);
  const logoHref = escapeXml(opts.logoHref);

  const qrPad = 10;
  const qrBox = opts.qrSize + qrPad * 2;
  const qrX = W - qrBox - 64;
  const qrY = H - qrBox - 56;

  const sparkle = [
    { x: 1030, y: 150, c: PIX_CYAN, r: 4 },
    { x: 980, y: 360, c: FG_DIM, r: 3 },
    { x: 1080, y: 320, c: FG_DIM, r: 3 },
    { x: 950, y: 470, c: GOLD_2, r: 3 },
    { x: 140, y: 96, c: PIX_MAGENTA, r: 3, op: 0.45 },
  ].map((d) => `<rect x="${d.x}" y="${d.y}" width="${d.r*2}" height="${d.r*2}" fill="${d.c}" fill-opacity="${d.op ?? 0.75}"/>`).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"
     font-family="Geist, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Inter, sans-serif">
  <defs>
    <linearGradient id="goldShimmer" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="${GOLD_3}"/>
      <stop offset="30%"  stop-color="${GOLD_2}"/>
      <stop offset="55%"  stop-color="${GOLD_0}"/>
      <stop offset="80%"  stop-color="${GOLD_1}"/>
      <stop offset="100%" stop-color="${GOLD_3}"/>
    </linearGradient>
    <linearGradient id="goldSheen" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="${GOLD_3}" stop-opacity="0"/>
      <stop offset="35%"  stop-color="${GOLD_2}"/>
      <stop offset="60%"  stop-color="${GOLD_0}"/>
      <stop offset="85%"  stop-color="${GOLD_2}"/>
      <stop offset="100%" stop-color="${GOLD_3}" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="cornerGlow" cx="100%" cy="0%" r="65%">
      <stop offset="0%"  stop-color="${PIX_CYAN}" stop-opacity="0.07"/>
      <stop offset="60%" stop-color="${PIX_CYAN}" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Velvet black canvas -->
  <rect width="${W}" height="${H}" fill="${BG}"/>
  <rect width="${W}" height="${H}" fill="url(#cornerGlow)"/>

  <!-- Whisper pixel sparkle -->
  ${sparkle}

  <!-- Actual Pixcellor wordmark asset. Positioned to compensate for transparent padding in the source PNG. -->
  <image href="${logoHref}" x="58" y="7" width="200" height="104" opacity="0.96" preserveAspectRatio="xMidYMid meet"/>

  <!-- Eyebrow: gold hairline + uppercase tagline -->
  <g transform="translate(64,176)">
    <rect x="0" y="-5" width="78" height="1.5" fill="url(#goldSheen)"/>
    <text x="96" y="0" fill="${FG_MUTED}" font-size="15" font-weight="600" letter-spacing="6">AN  INVITATION</text>
  </g>

  <!-- Headline: big, with ONE Fraunces italic gold word -->
  <text x="64" y="296" fill="${FG}" font-size="78" font-weight="700" letter-spacing="-2.5">${name}</text>
  <text x="64" y="386" fill="${FG}" font-size="78" font-weight="700" letter-spacing="-2.5">
    <tspan>invites you to </tspan><tspan fill="url(#goldShimmer)" font-family="Fraunces, Georgia, serif" font-style="italic" font-weight="600">join</tspan><tspan>.</tspan>
  </text>

  <!-- Subtitle -->
  <text x="64" y="450" fill="${FG_MUTED}" font-size="24" font-weight="400" letter-spacing="-0.2">
    Bespoke websites &amp; full-stack apps — 10% off your first project.
  </text>

  <!-- Footer: pixcellor.com + invite code chip -->
  <text x="64" y="566" fill="${FG_DIM}" font-size="18" font-weight="500">pixcellor.com</text>
  <g transform="translate(220,540)">
    <text x="0" y="20" fill="${FG_MUTED}" font-size="11" font-weight="700" letter-spacing="4"
          font-family="'Geist Mono',ui-monospace,monospace">INVITE  CODE</text>
    <text x="0" y="56" fill="url(#goldShimmer)" font-size="32" font-weight="700" letter-spacing="8"
          font-family="'Geist Mono',ui-monospace,SFMono-Regular,Menlo,monospace">${code}</text>
  </g>

  <!-- QR bottom-right -->
  <g transform="translate(${qrX},${qrY})">
    <rect x="0" y="0" width="${qrBox}" height="${qrBox}" rx="6" ry="6" fill="${FG}"/>
    <g transform="translate(${qrPad},${qrPad})" fill="${BG}">
      <path d="${opts.qrPath}"/>
    </g>
  </g>
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
        displayName = codeRow.share_name.trim().slice(0, 24);
      } else if (codeRow.owner_user_id) {
        const { data: u } = await admin.auth.admin.getUserById(codeRow.owner_user_id);
        const email = u.user?.email || "";
        const local = email.split("@")[0] || "";
        if (local) displayName = titleCase(local).slice(0, 24);
      }
    }

    const shareUrl = `${ORIGIN}/r/${rawCode}`;
    const qrSize = 140;
    const [qrPath, logoHref] = await Promise.all([
      buildQrSvgPath(shareUrl, qrSize),
      fetchLogoHref(),
    ]);
    const svg = buildSvg({ name: displayName, code: rawCode, shareUrl, qrPath, qrSize, logoHref });

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
