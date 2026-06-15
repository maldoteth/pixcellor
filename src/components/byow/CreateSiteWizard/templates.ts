export type TemplatePreset = {
  key: string;
  label: string;
  industry: string;
  blurb: string;
  // Hint passed to the AI so it knows the structural intent
  seed: {
    tone: string;
    audience: string;
    sections_hint: string;
  };
};

export const TEMPLATES: TemplatePreset[] = [
  {
    key: "salon",
    label: "Salon & Spa",
    industry: "Local service",
    blurb: "Booking-first brochure for hair, beauty, wellness.",
    seed: {
      tone: "warm, premium, calming",
      audience: "local clients booking treatments",
      sections_hint: "Lead with hero image + 'Book now' CTA, then services grid, transparent pricing, FAQ about visits, contact + map.",
    },
  },
  {
    key: "saas",
    label: "SaaS / App",
    industry: "Digital product",
    blurb: "Conversion-focused product page with pricing tiers.",
    seed: {
      tone: "confident, modern, technical",
      audience: "founders and operators evaluating tools",
      sections_hint: "Hero with bold product promise, feature grid, 3-tier pricing with most-popular middle, deep FAQ, contact for enterprise.",
    },
  },
  {
    key: "restaurant",
    label: "Restaurant",
    industry: "Hospitality",
    blurb: "Menu, reservations, story — all on one scroll.",
    seed: {
      tone: "appetising, story-driven, local-pride",
      audience: "diners considering tonight's reservation",
      sections_hint: "Hero with reservation CTA, menu highlights as features, set-menu pricing, FAQ about dietary/parking, contact with address.",
    },
  },
  {
    key: "consultant",
    label: "Consultant / Coach",
    industry: "Professional services",
    blurb: "Trust + booking page for solo experts.",
    seed: {
      tone: "authoritative, personal, results-led",
      audience: "decision-makers looking for outside expertise",
      sections_hint: "Hero with credibility line + book-call CTA, methodology features, 3 engagement tiers, objection-handling FAQ, contact form.",
    },
  },
  {
    key: "portfolio",
    label: "Portfolio",
    industry: "Creative",
    blurb: "Visual-first showcase for creators and studios.",
    seed: {
      tone: "minimal, editorial, confident",
      audience: "prospective clients evaluating creative work",
      sections_hint: "Hero with one-liner + 'See work', services as features, project tiers as pricing, process FAQ, contact.",
    },
  },
  {
    key: "trades",
    label: "Local Trades",
    industry: "Home services",
    blurb: "Trust + quote-request page for tradespeople.",
    seed: {
      tone: "honest, local, reassuring",
      audience: "homeowners needing reliable work fast",
      sections_hint: "Hero with service area + 'Get a quote', services list, transparent pricing/call-out fees, FAQ about guarantees/insurance, contact.",
    },
  },
];
