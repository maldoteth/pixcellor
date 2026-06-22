// Server-side invoice PDF generator using pdf-lib (pure JS, Deno-friendly).
// Produces a clean A4 PDF that mirrors the hosted invoice page.

import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";
import { SUPPLIER, BANK_DETAILS, PAYMENT_TERMS_LABEL, formatGbp, formatDateUk } from "./invoice-config.ts";

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unit_amount_pence: number;
  line_total_pence: number;
}

export interface InvoiceForPdf {
  invoice_number: string;
  issued_at: string;
  due_at: string;
  status: string;
  billing_name: string;
  billing_company?: string | null;
  billing_email: string;
  billing_address_line1?: string | null;
  billing_address_line2?: string | null;
  billing_city?: string | null;
  billing_postcode?: string | null;
  billing_country?: string | null;
  po_reference?: string | null;
  subtotal_pence: number;
  total_pence: number;
  amount_paid_pence: number;
  line_items: InvoiceLineItem[];
  hosted_url?: string;
}

export async function renderInvoicePdf(inv: InvoiceForPdf): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4 portrait pts
  const { width, height } = page.getSize();

  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const ink = rgb(0.05, 0.05, 0.05);
  const muted = rgb(0.45, 0.45, 0.45);
  const line = rgb(0.85, 0.85, 0.85);

  const marginX = 48;
  let y = height - 56;

  const text = (s: string, x: number, yy: number, opts: { size?: number; font?: typeof regular; color?: ReturnType<typeof rgb> } = {}) => {
    page.drawText(s ?? "", { x, y: yy, size: opts.size ?? 10, font: opts.font ?? regular, color: opts.color ?? ink });
  };

  // Header — supplier
  text(SUPPLIER.legalName, marginX, y, { size: 18, font: bold });
  text("INVOICE", width - marginX - bold.widthOfTextAtSize("INVOICE", 18), y, { size: 18, font: bold });
  y -= 18;
  if (SUPPLIER.tradingName && SUPPLIER.tradingName !== SUPPLIER.legalName) {
    text(`Trading as ${SUPPLIER.tradingName}`, marginX, y, { size: 9, color: muted });
  }
  // Right side: invoice number
  const numLabel = inv.invoice_number;
  text(numLabel, width - marginX - bold.widthOfTextAtSize(numLabel, 11), y, { size: 11, font: bold });
  y -= 14;

  for (const addr of SUPPLIER.addressLines) {
    text(addr, marginX, y, { size: 9, color: muted });
    y -= 11;
  }
  text(SUPPLIER.email, marginX, y, { size: 9, color: muted });
  y -= 11;
  if (SUPPLIER.companyNumber) {
    text(`Company no. ${SUPPLIER.companyNumber}`, marginX, y, { size: 9, color: muted });
    y -= 11;
  }

  y -= 18;
  page.drawLine({ start: { x: marginX, y }, end: { x: width - marginX, y }, thickness: 0.5, color: line });
  y -= 18;

  // Bill to & meta
  const colW = (width - marginX * 2) / 2;
  let leftY = y;
  text("BILL TO", marginX, leftY, { size: 9, font: bold, color: muted });
  leftY -= 14;
  text(inv.billing_name, marginX, leftY, { size: 11, font: bold });
  leftY -= 13;
  if (inv.billing_company) { text(inv.billing_company, marginX, leftY); leftY -= 12; }
  const addrLines = [inv.billing_address_line1, inv.billing_address_line2, [inv.billing_city, inv.billing_postcode].filter(Boolean).join(" "), inv.billing_country].filter(Boolean) as string[];
  for (const l of addrLines) { text(l, marginX, leftY); leftY -= 12; }
  text(inv.billing_email, marginX, leftY, { color: muted }); leftY -= 12;

  let rightY = y;
  const metaX = marginX + colW + 20;
  const metaLabelX = metaX;
  const metaValX = metaX + 110;
  const metaRow = (label: string, value: string) => {
    text(label, metaLabelX, rightY, { size: 9, font: bold, color: muted });
    text(value, metaValX, rightY, { size: 10 });
    rightY -= 14;
  };
  metaRow("Invoice number", inv.invoice_number);
  metaRow("Issue date", formatDateUk(inv.issued_at));
  metaRow("Due date", formatDateUk(inv.due_at));
  metaRow("Status", inv.status.toUpperCase());
  if (inv.po_reference) metaRow("PO reference", inv.po_reference);

  y = Math.min(leftY, rightY) - 18;

  // Line items table
  page.drawLine({ start: { x: marginX, y }, end: { x: width - marginX, y }, thickness: 0.5, color: line });
  y -= 14;

  const colDescX = marginX;
  const colQtyX = width - marginX - 240;
  const colUnitX = width - marginX - 140;
  const colTotalX = width - marginX - 60;

  text("DESCRIPTION", colDescX, y, { size: 9, font: bold, color: muted });
  text("QTY", colQtyX, y, { size: 9, font: bold, color: muted });
  text("UNIT", colUnitX, y, { size: 9, font: bold, color: muted });
  const totalLabel = "TOTAL";
  text(totalLabel, width - marginX - bold.widthOfTextAtSize(totalLabel, 9), y, { size: 9, font: bold, color: muted });
  y -= 10;
  page.drawLine({ start: { x: marginX, y }, end: { x: width - marginX, y }, thickness: 0.5, color: line });
  y -= 14;

  for (const li of inv.line_items) {
    // wrap description to ~ colQtyX - 8
    const maxDescWidth = colQtyX - colDescX - 12;
    const words = (li.description || "").split(/\s+/);
    const lines: string[] = [];
    let current = "";
    for (const w of words) {
      const tryLine = current ? `${current} ${w}` : w;
      if (regular.widthOfTextAtSize(tryLine, 10) > maxDescWidth) {
        if (current) lines.push(current);
        current = w;
      } else {
        current = tryLine;
      }
    }
    if (current) lines.push(current);
    const blockHeight = Math.max(lines.length * 12, 12);

    text(lines[0] ?? "", colDescX, y);
    text(String(li.quantity), colQtyX, y);
    text(formatGbp(li.unit_amount_pence), colUnitX, y);
    const totalStr = formatGbp(li.line_total_pence);
    text(totalStr, width - marginX - regular.widthOfTextAtSize(totalStr, 10), y);
    for (let i = 1; i < lines.length; i++) {
      y -= 12;
      text(lines[i], colDescX, y);
    }
    y -= 14;
    page.drawLine({ start: { x: marginX, y: y + 4 }, end: { x: width - marginX, y: y + 4 }, thickness: 0.25, color: line });
  }

  y -= 6;
  // Totals
  const totalsX = width - marginX - 200;
  const rightAlign = (s: string, size = 10, font = regular) => width - marginX - font.widthOfTextAtSize(s, size);
  const totalRow = (label: string, value: string, emphasised = false) => {
    const size = emphasised ? 12 : 10;
    const font = emphasised ? bold : regular;
    text(label, totalsX, y, { size, font, color: muted });
    text(value, rightAlign(value, size, font), y, { size, font });
    y -= emphasised ? 18 : 14;
  };
  totalRow("Subtotal", formatGbp(inv.subtotal_pence));
  totalRow("Total due", formatGbp(inv.total_pence - inv.amount_paid_pence), true);

  y -= 10;
  page.drawLine({ start: { x: marginX, y }, end: { x: width - marginX, y }, thickness: 0.5, color: line });
  y -= 18;

  // Payment instructions
  text("HOW TO PAY", marginX, y, { size: 10, font: bold, color: muted });
  y -= 14;
  text(`Pay by bank transfer in GBP using the details below. ${PAYMENT_TERMS_LABEL}.`, marginX, y);
  y -= 16;

  const bankRow = (label: string, value: string) => {
    text(label, marginX, y, { size: 9, font: bold, color: muted });
    text(value, marginX + 110, y, { size: 11, font: bold });
    y -= 14;
  };
  bankRow("Payee", BANK_DETAILS.payeeName);
  bankRow("Sort code", BANK_DETAILS.sortCode);
  bankRow("Account number", BANK_DETAILS.accountNumber);
  bankRow("Reference", inv.invoice_number);

  y -= 6;
  text(BANK_DETAILS.reference, marginX, y, { size: 9, color: muted });
  y -= 18;

  if (inv.hosted_url) {
    text("View this invoice online or download a copy at:", marginX, y, { size: 9, color: muted });
    y -= 12;
    text(inv.hosted_url, marginX, y, { size: 9, color: muted });
    y -= 18;
  }

  // Footer
  const footer = `${SUPPLIER.legalName} · ${SUPPLIER.email} · ${SUPPLIER.website}`;
  text(footer, marginX, 30, { size: 8, color: muted });

  return await doc.save();
}
