import { useMemo } from "react";
import { buildBrandedEmail } from "./emailTemplate";

type Branding = {
  senderName: string;
  senderEmail?: string;
  domain?: string;
};

type Props = {
  subject: string;
  bodyHtml: string;
  preheader?: string;
  branding?: Branding;
};

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function buildClientEmail({
  subject,
  bodyHtml,
  preheader,
  branding,
}: {
  subject: string;
  bodyHtml: string;
  preheader?: string;
  branding: Branding;
}) {
  const pre = (preheader || "").trim().slice(0, 140);
  const sender = escapeHtml(branding.senderName || "Your brand");
  const domain = escapeHtml(branding.domain || "");
  const unsub = `https://${branding.domain || "example.com"}/unsubscribe`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title>
<style>
  body{margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111;}
  .c{max-width:600px;margin:0 auto;background:#ffffff;}
  .b{padding:32px 40px;font-size:16px;line-height:1.6;color:#222;}
  .b h1{font-size:26px;line-height:1.2;margin:0 0 14px;}
  .b h2{font-size:20px;margin:22px 0 10px;}
  .b p{margin:0 0 14px;}
  .b a{color:#0a66c2;}
  .b img{max-width:100%;height:auto;border-radius:6px;}
  .f{padding:20px 40px 32px;font-size:12px;color:#777;text-align:center;border-top:1px solid #eee;}
  .f a{color:#777;}
  @media(max-width:620px){.b,.f{padding-left:20px;padding-right:20px;}}
</style></head>
<body>
  <div style="display:none;font-size:1px;color:#f4f4f5;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(pre)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding:24px 12px;">
    <table role="presentation" class="c" width="600" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:24px 40px 0;font-size:13px;color:#666;font-weight:600;letter-spacing:.02em;">${sender}</td></tr>
      <tr><td class="b">${bodyHtml || "<p style='color:#999'>Start writing to see the live preview…</p>"}</td></tr>
      <tr><td class="f">
        You're receiving this because you subscribed${domain ? ` at ${domain}` : ""}.<br>
        <a href="${unsub}">Unsubscribe</a>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

export default function EmailPreview({ subject, bodyHtml, preheader, branding }: Props) {
  const srcDoc = useMemo(
    () =>
      branding
        ? buildClientEmail({
            subject: subject || "(no subject)",
            bodyHtml,
            preheader,
            branding,
          })
        : buildBrandedEmail({
            subject: subject || "(no subject)",
            bodyHtml: bodyHtml || "<p style='color:#aaa'>Start writing to see the live preview…</p>",
            preheader,
            unsubUrl: "https://pixcellor.com/unsubscribe",
          }),
    [subject, bodyHtml, preheader, branding],
  );

  return (
    <div className="border border-input rounded-md overflow-hidden bg-black">
      <div className="px-3 py-2 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-input bg-muted/30 flex items-center justify-between">
        <span>Live preview</span>
        <span className="text-muted-foreground/70 normal-case tracking-normal">600px · inbox view</span>
      </div>
      <iframe
        title="Email preview"
        srcDoc={srcDoc}
        sandbox=""
        className="w-full bg-white"
        style={{ height: 720, border: 0, display: "block" }}
      />
    </div>
  );
}
