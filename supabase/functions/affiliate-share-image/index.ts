// Dynamic per-affiliate share image (SVG, 1200x630).
// Public endpoint, no auth — referenced from <meta og:image>.
// URL: /affiliate-share-image?code=ABCDE
//
// Branded for Pixcellor™: pitch-black background, white wordmark,
// rainbow accent gradient, prominent invite code, and a QR card.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import QRCode from "https://esm.sh/qrcode@1.5.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BRAND_BG = "#000000";
const BRAND_FG = "#ffffff";
const ORIGIN = "https://pixcellor.com";
const WORDMARK_URL = `${ORIGIN}/pixcellor-wordmark-white.png`;

// Brand rainbow accent (used across the site for highlights)
const RAINBOW_STOPS = [
  { o: "0%", c: "#ff3b8d" },
  { o: "20%", c: "#ff8a3d" },
  { o: "40%", c: "#ffd93d" },
  { o: "60%", c: "#3dd68c" },
  { o: "80%", c: "#3da8ff" },
  { o: "100%", c: "#a070ff" },
];

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

// Fetch wordmark and inline as base64 so the SVG renders standalone in
// every embedder (Slack/Discord/iMessage won't follow external <image href>).
async function fetchWordmarkDataUri(): Promise<string | null> {
  try {
    const res = await fetch(WORDMARK_URL);
    if (!res.ok) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    const b64 = btoa(bin);
    return `data:image/png;base64,${b64}`;
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
  const qrPad = 18;
  const qrBoxSize = opts.qrSize + qrPad * 2;
  const qrX = W - qrBoxSize - 64;
  const qrY = H - qrBoxSize - 64;
  const name = escapeXml(opts.name);
  const code = escapeXml(opts.code);
  const url = escapeXml(opts.shareUrl.replace(/^https?:\/\//, ""));

  const rainbowStops = RAINBOW_STOPS
    .map((s) => `<stop offset="${s.o}" stop-color="${s.c}"/>`)
    .join("");

  // Wordmark — either real PNG or a clean text fallback.
  const wordmarkH = 56;
  const wordmarkW = 280;
  const wordmark = opts.wordmarkDataUri
    ? `<image href="${opts.wordmarkDataUri}" x="0" y="0" width="${wordmarkW}" height="${wordmarkH}" preserveAspectRatio="xMinYMid meet"/>`
    : `<text x="0" y="42" fill="${BRAND_FG}" font-size="44" font-weight="800" letter-spacing="-1">Pixcellor<tspan font-size="22" dy="-18" dx="2">™</tspan></text>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Inter,sans-serif">
  <defs>
    <linearGradient id="rainbow" x1="0" y1="0" x2="1" y2="0">${rainbowStops}</linearGradient>
    <linearGradient id="rainbowDiag" x1="0" y1="0" x2="1" y2="1">${rainbowStops}</linearGradient>
    <radialGradient id="glowL" cx="0%" cy="100%" r="80%">
      <stop offset="0%" stop-color="#ff3b8d" stop-opacity="0.28"/>
      <stop offset="60%" stop-color="#ff3b8d" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowR" cx="100%" cy="0%" r="80%">
      <stop offset="0%" stop-color="#3da8ff" stop-opacity="0.28"/>
      <stop offset="60%" stop-color="#3da8ff" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="codeStroke" x1="0" y1="0" x2="1" y2="0">${rainbowStops}</linearGradient>
  </defs>

  <!-- Pitch-black brand background with subtle rainbow glow -->
  <rect width="${W}" height="${H}" fill="${BRAND_BG}"/>
  <rect width="${W}" height="${H}" fill="url(#glowL)"/>
  <rect width="${W}" height="${H}" fill="url(#glowR)"/>

  <!-- Hairline grid -->
  <g stroke="#ffffff" stroke-opacity="0.035">
    ${Array.from({ length: 13 }, (_, i) => `<line x1="0" x2="${W}" y1="${(i + 1) * 48}" y2="${(i + 1) * 48}"/>`).join("")}
    ${Array.from({ length: 25 }, (_, i) => `<line y1="0" y2="${H}" x1="${(i + 1) * 48}" x2="${(i + 1) * 48}"/>`).join("")}
  </g>

  <!-- Top rainbow hairline -->
  <rect x="0" y="0" width="${W}" height="3" fill="url(#rainbow)"/>

  <!-- Brand wordmark -->
  <g transform="translate(64,60)">
    ${wordmark}
  </g>

  <!-- Eyebrow + headline -->
  <g transform="translate(64,210)">
    <text x="0" y="0" fill="url(#rainbow)" font-size="22" font-weight="700" letter-spacing="6">YOU'RE INVITED</text>
    <text x="0" y="78" fill="${BRAND_FG}" font-size="64" font-weight="800" letter-spacing="-1.5">${name}</text>
    <text x="0" y="138" fill="${BRAND_FG}" fill-opacity="0.78" font-size="38" font-weight="500" letter-spacing="-0.5">invited you to Pixcellor™</text>
    <text x="0" y="184" fill="${BRAND_FG}" fill-opacity="0.55" font-size="22" font-weight="500">Software · Growth · Design — 10% off your first project</text>
  </g>

  <!-- Invite code chip -->
  <g transform="translate(64,470)">
    <rect x="0" y="0" rx="16" ry="16" width="460" height="92" fill="#0a0a0a"/>
    <rect x="0" y="0" rx="16" ry="16" width="460" height="92" fill="none" stroke="url(#codeStroke)" stroke-width="2"/>
    <text x="24" y="32" fill="${BRAND_FG}" fill-opacity="0.55" font-size="13" font-weight="600" letter-spacing="4">INVITE CODE</text>
    <text x="24" y="74" fill="${BRAND_FG}" font-size="40" font-weight="800" letter-spacing="8" font-family="ui-monospace,SFMono-Regular,Menlo,Monaco,monospace">${code}</text>
  </g>

  <!-- QR card -->
  <g transform="translate(${qrX},${qrY})">
    <rect x="-6" y="-6" width="${qrBoxSize + 12}" height="${qrBoxSize + 12}" rx="24" ry="24" fill="url(#rainbowDiag)" opacity="0.9"/>
    <rect x="0" y="0" width="${qrBoxSize}" height="${qrBoxSize}" rx="20" ry="20" fill="${BRAND_FG}"/>
    <g transform="translate(${qrPad},${qrPad})" fill="${BRAND_BG}">
      <path d="${opts.qrPath}"/>
    </g>
  </g>
  <text x="${qrX + qrBoxSize / 2}" y="${qrY - 18}" text-anchor="middle" fill="${BRAND_FG}" fill-opacity="0.7" font-size="14" font-weight="600" letter-spacing="3">SCAN TO JOIN</text>
  <text x="${qrX + qrBoxSize / 2}" y="${qrY + qrBoxSize + 30}" text-anchor="middle" fill="${BRAND_FG}" fill-opacity="0.55" font-size="14">${url}</text>
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
