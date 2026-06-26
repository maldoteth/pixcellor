// Dynamic per-affiliate share image (SVG, 1200x630).
// Public endpoint, no auth — meant to be referenced from <meta og:image>.
// URL: /affiliate-share-image?code=ABCDE
//
// SVG is returned with a long cache header. Most modern messengers/embedders
// (Discord, Slack, Telegram, iMessage, LinkedIn) render SVG previews; older
// platforms still get the link itself, which is what matters most for the
// referral flow.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import QRCode from "https://esm.sh/qrcode@1.5.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BRAND_BG = "#000000";
const BRAND_FG = "#ffffff";
const BRAND_ACCENT = "#a78bfa";
const ORIGIN = "https://pixcellor.com";

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
  // QRCode.create returns the matrix; we draw it ourselves so we control colors.
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

function buildSvg(opts: {
  name: string;
  code: string;
  shareUrl: string;
  qrPath: string;
  qrSize: number;
}): string {
  const W = 1200;
  const H = 630;
  const qrPad = 18;
  const qrBoxSize = opts.qrSize + qrPad * 2;
  const qrX = W - qrBoxSize - 60;
  const qrY = H - qrBoxSize - 60;
  const name = escapeXml(opts.name);
  const code = escapeXml(opts.code);
  const url = escapeXml(opts.shareUrl.replace(/^https?:\/\//, ""));

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="system-ui,-apple-system,Segoe UI,Roboto,Inter,sans-serif">
  <defs>
    <radialGradient id="glow" cx="20%" cy="20%" r="80%">
      <stop offset="0%" stop-color="${BRAND_ACCENT}" stop-opacity="0.35"/>
      <stop offset="60%" stop-color="${BRAND_ACCENT}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="codeStroke" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="${BRAND_ACCENT}" stop-opacity="0.6"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="${BRAND_BG}"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>

  <!-- Subtle grid -->
  <g stroke="#ffffff" stroke-opacity="0.04">
    ${Array.from({ length: 13 }, (_, i) => `<line x1="0" x2="${W}" y1="${(i + 1) * 48}" y2="${(i + 1) * 48}"/>`).join("")}
    ${Array.from({ length: 25 }, (_, i) => `<line y1="0" y2="${H}" x1="${(i + 1) * 48}" x2="${(i + 1) * 48}"/>`).join("")}
  </g>

  <!-- Brand wordmark (text fallback, no external image fetch needed) -->
  <g transform="translate(60,72)">
    <text x="0" y="0" fill="${BRAND_FG}" font-size="40" font-weight="700" letter-spacing="2">PIXCELLOR</text>
    <text x="0" y="28" fill="${BRAND_FG}" fill-opacity="0.55" font-size="14" letter-spacing="6">SOFTWARE · GROWTH · DESIGN</text>
  </g>

  <!-- Headline -->
  <g transform="translate(60,260)">
    <text x="0" y="0" fill="${BRAND_FG}" fill-opacity="0.7" font-size="26" font-weight="500">You've been invited</text>
    <text x="0" y="82" fill="${BRAND_FG}" font-size="68" font-weight="800">${name}</text>
    <text x="0" y="148" fill="${BRAND_FG}" font-size="44" font-weight="500" fill-opacity="0.85">wants you on Pixcellor.</text>
    <text x="0" y="210" fill="${BRAND_ACCENT}" font-size="26" font-weight="600">10% off your first project · powered by Pixcellor™</text>
  </g>

  <!-- Code chip -->
  <g transform="translate(60,540)">
    <rect x="0" y="0" rx="14" ry="14" width="360" height="64" fill="#0a0a0a" stroke="url(#codeStroke)" stroke-width="1.5"/>
    <text x="22" y="28" fill="${BRAND_FG}" fill-opacity="0.55" font-size="13" letter-spacing="3">CODE</text>
    <text x="22" y="54" fill="${BRAND_FG}" font-size="28" font-weight="800" letter-spacing="6" font-family="ui-monospace,SFMono-Regular,Menlo,monospace">${code}</text>
  </g>

  <!-- QR card -->
  <g transform="translate(${qrX},${qrY})">
    <rect x="0" y="0" width="${qrBoxSize}" height="${qrBoxSize}" rx="20" ry="20" fill="${BRAND_FG}"/>
    <g transform="translate(${qrPad},${qrPad})" fill="${BRAND_BG}">
      <path d="${opts.qrPath}"/>
    </g>
  </g>
  <text x="${qrX + qrBoxSize / 2}" y="${qrY - 14}" text-anchor="middle" fill="${BRAND_FG}" fill-opacity="0.6" font-size="14" letter-spacing="2">SCAN TO JOIN</text>
  <text x="${qrX + qrBoxSize / 2}" y="${qrY + qrBoxSize + 28}" text-anchor="middle" fill="${BRAND_FG}" fill-opacity="0.55" font-size="14">${url}</text>
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
    const qrPath = await buildQrSvgPath(shareUrl, qrSize);
    const svg = buildSvg({ name: displayName, code: rawCode, shareUrl, qrPath, qrSize });

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
