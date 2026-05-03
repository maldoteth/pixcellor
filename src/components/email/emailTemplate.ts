// Single source of truth for the branded broadcast email shell.
// Used by the in-app preview AND duplicated in the edge function
// (edge functions can't import from src/).

const LOGO_URL = "https://rkgjkvghejcmostuqkgw.supabase.co/storage/v1/object/public/email-assets/pixcellor-email-logo.png?v=2";
const SITE = "https://pixcellor.com";
const FACEBOOK_URL = "https://www.facebook.com/profile.php?id=61569263824416";
const LINKEDIN_URL = "https://www.linkedin.com/company/pixcellor/";

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
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${escapeHtml(subject)}</title>
<style>
  @media only screen and (max-width:620px) {
    .px-container { width:100% !important; }
    .px-pad { padding:28px 22px !important; }
    .px-h1 { font-size:24px !important; line-height:1.25 !important; }
  }
  .px-body p { margin:0 0 16px; color:#e5e5e5; }
  .px-body h1 { font-size:28px; line-height:1.2; margin:0 0 16px; font-weight:700; color:#ffffff; letter-spacing:-0.02em; }
  .px-body h2 { font-size:22px; line-height:1.3; margin:28px 0 12px; font-weight:700; color:#ffffff; letter-spacing:-0.01em; }
  .px-body h3 { font-size:18px; line-height:1.35; margin:22px 0 10px; font-weight:600; color:#ffffff; }
  .px-body a { color:#ffffff; text-decoration:underline; }
  .px-body strong { color:#ffffff; }
  .px-body ul, .px-body ol { margin:0 0 16px; padding-left:22px; color:#e5e5e5; }
  .px-body li { margin:0 0 6px; }
  .px-body img { max-width:100%; height:auto; border-radius:10px; display:block; margin:18px 0; }
  .px-body hr { border:none; border-top:1px solid #2a2a2a; margin:28px 0; }
  .px-body blockquote { margin:0 0 16px; padding:8px 16px; border-left:3px solid #ffffff; color:#bbb; font-style:italic; }
  .px-btn a { background:#ffffff !important; color:#000000 !important; text-decoration:none !important; padding:14px 30px !important; border-radius:999px !important; display:inline-block !important; font-weight:600 !important; font-size:15px !important; letter-spacing:-0.01em; }
</style>
</head>
<body style="margin:0;padding:0;background:#000000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#ffffff;-webkit-font-smoothing:antialiased;">
  <div style="display:none;font-size:1px;color:#000000;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(pre)}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#000000;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" class="px-container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;background:#000000;">
          <!-- Body -->
          <tr>
            <td class="px-pad px-body" style="padding:28px 40px 36px;font-size:16px;line-height:1.7;color:#e5e5e5;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:0 40px 36px;">
              <hr style="border:none;border-top:1px solid #1f1f1f;margin:0 0 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="font-size:12px;line-height:1.7;color:#777;">
                    <div style="margin:0 0 8px;font-weight:600;color:#ffffff;font-size:13px;letter-spacing:-0.01em;">Pixcellor</div>
                    <div style="margin:0 0 14px;color:#999;">Premium creative studio for brands that care about detail.</div>
                    <div style="margin:0 0 14px;">
                      <a href="${LINKEDIN_URL}" style="color:#aaa;text-decoration:none;margin:0 8px;">LinkedIn</a>·
                      <a href="${FACEBOOK_URL}" style="color:#aaa;text-decoration:none;margin:0 8px;">Facebook</a>·
                      <a href="mailto:help@pixcellor.com" style="color:#aaa;text-decoration:none;margin:0 8px;">help@pixcellor.com</a>
                    </div>
                    <div style="margin:0 0 12px;color:#666;">United Kingdom</div>
                    <div style="color:#666;">
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
