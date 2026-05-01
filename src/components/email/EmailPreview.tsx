import { useMemo } from "react";
import { buildBrandedEmail } from "./emailTemplate";

type Props = {
  subject: string;
  bodyHtml: string;
  preheader?: string;
};

export default function EmailPreview({ subject, bodyHtml, preheader }: Props) {
  const srcDoc = useMemo(
    () =>
      buildBrandedEmail({
        subject: subject || "(no subject)",
        bodyHtml: bodyHtml || "<p style='color:#aaa'>Start writing to see the live preview…</p>",
        preheader,
        unsubUrl: "https://pixcellor.com/unsubscribe",
      }),
    [subject, bodyHtml, preheader],
  );

  return (
    <div className="border border-input rounded-md overflow-hidden bg-[#f4f4f5]">
      <div className="px-3 py-2 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-input bg-muted/30 flex items-center justify-between">
        <span>Live preview</span>
        <span className="text-muted-foreground/70 normal-case tracking-normal">600px · inbox view</span>
      </div>
      <iframe
        title="Email preview"
        srcDoc={srcDoc}
        sandbox=""
        className="w-full bg-[#f4f4f5]"
        style={{ height: 720, border: 0, display: "block" }}
      />
    </div>
  );
}
