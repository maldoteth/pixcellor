// Shared BYOW pricing config. Keep in sync with Stripe products.

export const BYOW_SUB_PRICES = {
  care:   { priceId: "price_1TiUpGBtUjwejeUwWVs10yfp", quota: 25,   name: "Care",   amount: 10000 },
  studio: { priceId: "price_1TiUpHBtUjwejeUwhjdoDCvI", quota: 180,  name: "Studio", amount: 50000 },
  agency: { priceId: "price_1TiUpJBtUjwejeUwDifHr1Px", quota: 1000, name: "Agency", amount: 250000 },
} as const;

export const BYOW_TOPUP_PRICES = {
  single:   { priceId: "price_1TiUpKBtUjwejeUw3uCQ0uGP", prompts: 1,    name: "1 prompt",      amount: 200 },
  pack100:  { priceId: "price_1TiUpKBtUjwejeUwgu5blcCQ", prompts: 100,  name: "100 prompts",   amount: 16900 },
  pack1000: { priceId: "price_1TiUpLBtUjwejeUwqXnPdicz", prompts: 1000, name: "1000 prompts",  amount: 125000 },
} as const;

export type BYOWTier = keyof typeof BYOW_SUB_PRICES;
export type BYOWTopup = keyof typeof BYOW_TOPUP_PRICES;

export const PRICE_TO_BYOW_TIER: Record<string, BYOWTier> = Object.fromEntries(
  Object.entries(BYOW_SUB_PRICES).map(([k, v]) => [v.priceId, k as BYOWTier]),
);

export const PRICE_TO_BYOW_TOPUP: Record<string, BYOWTopup> = Object.fromEntries(
  Object.entries(BYOW_TOPUP_PRICES).map(([k, v]) => [v.priceId, k as BYOWTopup]),
);
