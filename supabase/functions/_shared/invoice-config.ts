// Centralised supplier + bank details used by every invoice surface.
// Update here only — everything else (PDF, emails, hosted page) reads from this.

export const SUPPLIER = {
  legalName: "Delabs Ltd",
  tradingName: "Pixcellor™",
  companyNumber: "", // optional — fill in when registered
  addressLines: [
    // Update with the registered office address.
    "United Kingdom",
  ],
  email: "help@pixcellor.com",
  website: "pixcellor.com",
} as const;

export const BANK_DETAILS = {
  payeeName: "Delabs Ltd",
  sortCode: "60-84-64",
  accountNumber: "86111053",
  bankName: "Bank transfer (GBP)",
  reference: "Use the invoice number as your payment reference",
} as const;

export const PAYMENT_TERMS_DAYS = 28;
export const PAYMENT_TERMS_LABEL = `Payment due within ${PAYMENT_TERMS_DAYS} days of issue`;

export const SITE_URL = "https://pixcellor.com";

export function formatGbp(pence: number | bigint): string {
  const n = typeof pence === "bigint" ? Number(pence) : pence;
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n / 100);
}

export function formatDateUk(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
}
