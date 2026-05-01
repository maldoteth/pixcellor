// Single source of truth for the branded broadcast email shell.
// Used by the in-app preview AND duplicated in the edge function
// (edge functions can't import from src/).

const LOGO_URL = "https://pixcellor.com/pixcellor-email-logo.png";
const SITE = "https://pixcellor.com";

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export type BrandedEmailOptions = {
  subject: string;
  bodyHtml: string;
  preheader?: string;
  unsubUrl?: string;
};

export function buildBrandedEmail({ subject, bodyHtml, preheader, unsubUrl }: BrandedEmailOptions) {
  const pre = (preheader || "").trim().slice(0, 140);
  const unsub = unsubUrl || `${SITE}/unsubscribe`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>${escapeHtml(subject)}</title>
<style>
  /* Mobile tweaks only — most styles are inline for client safety */
  @media only screen and (max-width:620px) {
    .px-container { width:100% !important; }
    .px-pad { padding:24px 20px !important; }
    .px-h1 { font-size:24px !important; line-height:1.25 !important; }
  }
  /* Style for content authored in the rich editor */
  .px-body p { margin:0 0 16px; }
  .px-body h1 { font-size:26px; line-height:1.25; margin:0 0 16px; font-weight:700; color:#0a0a0a; letter-spacing:-0.01em; }
  .px-body h2 { font-size:20px; line-height:1.3; margin:24px 0 12px; font-weight:700; color:#0a0a0a; letter-spacing:-0.01em; }
  .px-body h3 { font-size:17px; line-height:1.35; margin:20px 0 10px; font-weight:600; color:#0a0a0a; }
  .px-body a { color:#0a0a0a; text-decoration:underline; }
  .px-body ul, .px-body ol { margin:0 0 16px; padding-left:22px; }
  .px-body li { margin:0 0 6px; }
  .px-body img { max-width:100%; height:auto; border-radius:8px; display:block; margin:16px 0; }
  .px-body hr { border:none; border-top:1px solid #e5e5e5; margin:28px 0; }
  .px-body blockquote { margin:0 0 16px; padding:8px 16px; border-left:3px solid #0a0a0a; color:#444; font-style:italic; }
  .px-btn a { background:#0a0a0a !important; color:#ffffff !important; text-decoration:none !important; padding:14px 28px !important; border-radius:999px !important; display:inline-block !important; font-weight:600 !important; font-size:15px !important; }
</style>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0a0a0a;-webkit-font-smoothing:antialiased;">
  <!-- Preheader (hidden) -->
  <div style="display:none;font-size:1px;color:#f4f4f5;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(pre)}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f5;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" class="px-container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
          <!-- Header -->
          <tr>
            <td align="center" style="padding:32px 24px 8px;">
              <a href="${SITE}" style="text-decoration:none;color:#0a0a0a;">
                <img src="${LOGO_URL}" alt="Pixcellor" width="140" style="display:block;border:0;outline:none;height:auto;max-width:140px;">
              </a>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td class="px-pad px-body" style="padding:24px 40px 32px;font-size:16px;line-height:1.65;color:#1a1a1a;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:0 40px 32px;">
              <hr style="border:none;border-top:1px solid #ececec;margin:0 0 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="font-size:12px;line-height:1.6;color:#888;">
                    <div style="margin:0 0 8px;font-weight:600;color:#0a0a0a;">Pixcellor™</div>
                    <div style="margin:0 0 12px;">Premium product photography &amp; web design.</div>
                    <div style="margin:0 0 12px;">
                      <a href="https://www.linkedin.com/company/pixcellor/" style="color:#888;text-decoration:none;margin:0 6px;">LinkedIn</a>·
                      <a href="https://www.instagram.com/pixcellor" style="color:#888;text-decoration:none;margin:0 6px;">Instagram</a>·
                      <a href="https://www.facebook.com/pixcellor" style="color:#888;text-decoration:none;margin:0 6px;">Facebook</a>
                    </div>
                    <div style="margin:0 0 8px;color:#aaa;">United Kingdom</div>
                    <div>
                      You're receiving this because you've worked with Pixcellor or opted in.<br>
                      <a href="${unsub}" style="color:#888;text-decoration:underline;">Unsubscribe</a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <div style="height:32px;line-height:32px;">&nbsp;</div>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Strip tags for plain-text fallback.
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
