export type TemplateCategory =
  | "service"
  | "saas"
  | "hospitality"
  | "creative"
  | "professional"
  | "ecommerce"
  | "events"
  | "personal";

export type TemplatePreview = {
  // Mini-mockup colours (used by the wireframe thumbnail)
  bg: string;
  surface: string;
  accent: string;
  text: string;
  // Layout shape: which mini blocks to render, in order
  shape:
    | "hero-image-right"
    | "hero-centered"
    | "hero-split-bold"
    | "hero-editorial"
    | "hero-fullbleed"
    | "hero-grid"
    | "hero-bento"
    | "hero-mono";
};

export type TemplatePreset = {
  key: string;
  label: string;
  category: TemplateCategory;
  industry: string;
  blurb: string;
  preview: TemplatePreview;
  seed: {
    tone: string;
    audience: string;
    sections_hint: string;
    layout_recipe: string;
  };
};

const RECIPES = {
  brochure: "Hero with single CTA → 4-tile features grid → 2-tier transparent pricing → 5-question FAQ → contact + map → minimal footer.",
  saas: "Bold hero with product promise + dual CTA → 6-icon feature grid → 3-tier pricing (middle featured) → 6 FAQ → enterprise contact → link-rich footer.",
  editorial: "Editorial hero with eyebrow + large serif headline → 3 long-form feature blocks → 2-tier pricing → 4 FAQ → short contact → tagline footer.",
  story: "Cinematic hero image + reservation CTA → 3 story features → set-menu pricing → 4 FAQ (dietary/parking) → address contact → social footer.",
  trust: "Credibility hero (avatar + result line) → methodology features → 3 engagement tiers → objection-handling FAQ → booking contact → minimal footer.",
  shop: "Lookbook hero → product features → 2-3 collections as pricing tiers → shipping/returns FAQ → contact → social footer.",
  event: "Date-led hero → speakers/agenda as features → ticket tiers as pricing → logistics FAQ → contact → social footer.",
  personal: "Portrait hero with one-liner → 3 'what I do' features → 2 working modes as pricing → light FAQ → email contact → minimal footer.",
} as const;

export const TEMPLATES: TemplatePreset[] = [
  // ─── LOCAL SERVICE ────────────────────────────────────────────────────────
  {
    key: "salon-calm",
    label: "Salon Calm",
    category: "service",
    industry: "Local service",
    blurb: "Calm cream + black, generous whitespace, booking-first.",
    preview: { bg: "#F4ECE2", surface: "#FFFFFF", accent: "#1A1A1A", text: "#1A1A1A", shape: "hero-image-right" },
    seed: { tone: "warm, premium, calming", audience: "local clients booking treatments", sections_hint: RECIPES.brochure, layout_recipe: RECIPES.brochure },
  },
  {
    key: "salon-editorial",
    label: "Salon Editorial",
    category: "service",
    industry: "Beauty",
    blurb: "Magazine-style serif headlines, oversized imagery.",
    preview: { bg: "#FFFFFF", surface: "#F8F4EE", accent: "#7A1F2B", text: "#0A0A0A", shape: "hero-editorial" },
    seed: { tone: "editorial, refined, confident", audience: "discerning beauty clients", sections_hint: RECIPES.editorial, layout_recipe: RECIPES.editorial },
  },
  {
    key: "barber-heritage",
    label: "Barber Heritage",
    category: "service",
    industry: "Grooming",
    blurb: "Dark wood mood, monogram, walk-in friendly.",
    preview: { bg: "#1A130E", surface: "#2A1F18", accent: "#C8A155", text: "#F2E9DC", shape: "hero-centered" },
    seed: { tone: "heritage, masculine, trusted", audience: "regulars + first-time visitors", sections_hint: RECIPES.brochure, layout_recipe: RECIPES.brochure },
  },
  {
    key: "trades-local",
    label: "Trades Local",
    category: "service",
    industry: "Home services",
    blurb: "Bold yellow accents, quote-first, service-area badge.",
    preview: { bg: "#FFFFFF", surface: "#F5F5F5", accent: "#FFC400", text: "#0A0A0A", shape: "hero-split-bold" },
    seed: { tone: "honest, local, reassuring", audience: "homeowners needing reliable work fast", sections_hint: RECIPES.brochure, layout_recipe: RECIPES.brochure },
  },

  // ─── SAAS / PRODUCT ───────────────────────────────────────────────────────
  {
    key: "saas-bold",
    label: "SaaS Bold",
    category: "saas",
    industry: "Digital product",
    blurb: "High-contrast hero, big number stats, 3-tier pricing.",
    preview: { bg: "#0A0A0A", surface: "#141414", accent: "#7C5CFF", text: "#FFFFFF", shape: "hero-split-bold" },
    seed: { tone: "confident, modern, technical", audience: "founders and operators evaluating tools", sections_hint: RECIPES.saas, layout_recipe: RECIPES.saas },
  },
  {
    key: "saas-minimal",
    label: "SaaS Minimal",
    category: "saas",
    industry: "Tool",
    blurb: "All-white, mono accents, dense feature grid.",
    preview: { bg: "#FFFFFF", surface: "#F6F6F6", accent: "#0A0A0A", text: "#0A0A0A", shape: "hero-grid" },
    seed: { tone: "minimal, precise, founder-led", audience: "design-conscious teams", sections_hint: RECIPES.saas, layout_recipe: RECIPES.saas },
  },
  {
    key: "ai-product",
    label: "AI Product",
    category: "saas",
    industry: "AI",
    blurb: "Gradient halo hero, prompt-style demo block, waitlist CTA.",
    preview: { bg: "#06030F", surface: "#0F0820", accent: "#A06CFF", text: "#FFFFFF", shape: "hero-centered" },
    seed: { tone: "futuristic, intelligent, ambitious", audience: "early adopters of AI tools", sections_hint: RECIPES.saas, layout_recipe: RECIPES.saas },
  },
  {
    key: "dev-tool",
    label: "Dev Tool",
    category: "saas",
    industry: "Developer",
    blurb: "Mono-spaced typography, code snippet hero, install command.",
    preview: { bg: "#0B0E14", surface: "#161B22", accent: "#39D353", text: "#E6EDF3", shape: "hero-mono" },
    seed: { tone: "technical, transparent, opinionated", audience: "engineers picking infrastructure", sections_hint: RECIPES.saas, layout_recipe: RECIPES.saas },
  },
  {
    key: "mobile-app",
    label: "Mobile App",
    category: "saas",
    industry: "Consumer app",
    blurb: "Phone mockup hero, App Store badges, screenshot rail.",
    preview: { bg: "#FFFFFF", surface: "#EFF3FF", accent: "#2D6CFF", text: "#0A0A0A", shape: "hero-image-right" },
    seed: { tone: "friendly, vibrant, lifestyle", audience: "consumers browsing app stores", sections_hint: RECIPES.saas, layout_recipe: RECIPES.saas },
  },

  // ─── HOSPITALITY ──────────────────────────────────────────────────────────
  {
    key: "restaurant-story",
    label: "Restaurant Story",
    category: "hospitality",
    industry: "Restaurant",
    blurb: "Full-bleed food photo, story-led, reservation pill.",
    preview: { bg: "#0F0A06", surface: "#1A130D", accent: "#E0A24A", text: "#F4ECE2", shape: "hero-fullbleed" },
    seed: { tone: "appetising, story-driven, local-pride", audience: "diners considering tonight's reservation", sections_hint: RECIPES.story, layout_recipe: RECIPES.story },
  },
  {
    key: "cafe-warm",
    label: "Cafe Warm",
    category: "hospitality",
    industry: "Cafe",
    blurb: "Cream + terracotta, hand-set serif, opening hours up front.",
    preview: { bg: "#F8EFE2", surface: "#FFFFFF", accent: "#B65B36", text: "#2A1A12", shape: "hero-image-right" },
    seed: { tone: "neighbourly, cosy, hand-made", audience: "locals looking for their morning spot", sections_hint: RECIPES.story, layout_recipe: RECIPES.story },
  },
  {
    key: "bar-nightlife",
    label: "Bar Nightlife",
    category: "hospitality",
    industry: "Bar",
    blurb: "Deep black with neon accent, event-led hero.",
    preview: { bg: "#08050C", surface: "#120A1A", accent: "#FF3D7F", text: "#FFFFFF", shape: "hero-centered" },
    seed: { tone: "after-dark, cinematic, exclusive", audience: "weekend planners booking tables", sections_hint: RECIPES.story, layout_recipe: RECIPES.story },
  },
  {
    key: "hotel-boutique",
    label: "Hotel Boutique",
    category: "hospitality",
    industry: "Hotel",
    blurb: "Editorial cover image, room-tile grid, location chip.",
    preview: { bg: "#FFFFFF", surface: "#F2EFE9", accent: "#5C4A2E", text: "#1A1410", shape: "hero-editorial" },
    seed: { tone: "refined, restorative, design-led", audience: "travellers booking 2–4 night stays", sections_hint: RECIPES.story, layout_recipe: RECIPES.story },
  },

  // ─── CREATIVE ─────────────────────────────────────────────────────────────
  {
    key: "studio-mono",
    label: "Studio Mono",
    category: "creative",
    industry: "Design studio",
    blurb: "Strict grid, all black + one accent, project tiles.",
    preview: { bg: "#0A0A0A", surface: "#141414", accent: "#FF5C2A", text: "#FFFFFF", shape: "hero-grid" },
    seed: { tone: "minimal, editorial, confident", audience: "prospective clients evaluating creative work", sections_hint: RECIPES.editorial, layout_recipe: RECIPES.editorial },
  },
  {
    key: "studio-color",
    label: "Studio Color",
    category: "creative",
    industry: "Branding",
    blurb: "Bold colour blocks, oversized headline, playful.",
    preview: { bg: "#FFD23F", surface: "#FFFFFF", accent: "#FF3B30", text: "#0A0A0A", shape: "hero-bento" },
    seed: { tone: "playful, brave, bold", audience: "brands looking for an unexpected partner", sections_hint: RECIPES.editorial, layout_recipe: RECIPES.editorial },
  },
  {
    key: "photo-folio",
    label: "Photo Folio",
    category: "creative",
    industry: "Photography",
    blurb: "Full-bleed image-first, slim nav, dark gallery.",
    preview: { bg: "#0A0A0A", surface: "#1A1A1A", accent: "#FFFFFF", text: "#FFFFFF", shape: "hero-fullbleed" },
    seed: { tone: "image-led, sparse, atmospheric", audience: "clients commissioning shoots", sections_hint: RECIPES.editorial, layout_recipe: RECIPES.editorial },
  },
  {
    key: "agency-grid",
    label: "Agency Grid",
    category: "creative",
    industry: "Agency",
    blurb: "12-col grid, capability tiles, client logo wall.",
    preview: { bg: "#FFFFFF", surface: "#F2F2F2", accent: "#0A0A0A", text: "#0A0A0A", shape: "hero-grid" },
    seed: { tone: "operational, mature, results-led", audience: "marketing leads scoping retainers", sections_hint: RECIPES.editorial, layout_recipe: RECIPES.editorial },
  },
  {
    key: "designer-bento",
    label: "Designer Bento",
    category: "creative",
    industry: "Designer",
    blurb: "Bento-box grid, rounded corners, soft pastels.",
    preview: { bg: "#F4F1EC", surface: "#FFFFFF", accent: "#7C5CFF", text: "#1A1A1A", shape: "hero-bento" },
    seed: { tone: "thoughtful, contemporary, light", audience: "founders looking for a senior designer", sections_hint: RECIPES.editorial, layout_recipe: RECIPES.editorial },
  },

  // ─── PROFESSIONAL ─────────────────────────────────────────────────────────
  {
    key: "consultant-trust",
    label: "Consultant Trust",
    category: "professional",
    industry: "Consulting",
    blurb: "Avatar + named result, methodology blocks, book-call CTA.",
    preview: { bg: "#FFFFFF", surface: "#F4F4F4", accent: "#0A4F3F", text: "#0A0A0A", shape: "hero-split-bold" },
    seed: { tone: "authoritative, personal, results-led", audience: "decision-makers looking for outside expertise", sections_hint: RECIPES.trust, layout_recipe: RECIPES.trust },
  },
  {
    key: "lawyer-editorial",
    label: "Lawyer Editorial",
    category: "professional",
    industry: "Law",
    blurb: "Serif headlines, navy + ivory, practice-area cards.",
    preview: { bg: "#F5F1E8", surface: "#FFFFFF", accent: "#0E2A4A", text: "#0E2A4A", shape: "hero-editorial" },
    seed: { tone: "considered, formal, modern", audience: "clients evaluating legal counsel", sections_hint: RECIPES.trust, layout_recipe: RECIPES.trust },
  },
  {
    key: "clinic-calm",
    label: "Clinic Calm",
    category: "professional",
    industry: "Healthcare",
    blurb: "Soft sage + ivory, reassuring tone, services + visit info.",
    preview: { bg: "#EDF2EC", surface: "#FFFFFF", accent: "#3F6F5B", text: "#1A2A22", shape: "hero-image-right" },
    seed: { tone: "calm, reassuring, patient-centred", audience: "patients choosing a practice", sections_hint: RECIPES.trust, layout_recipe: RECIPES.trust },
  },
  {
    key: "finance-pro",
    label: "Finance Pro",
    category: "professional",
    industry: "Finance",
    blurb: "Deep navy, mono accents, compliance-aware copy.",
    preview: { bg: "#0A1530", surface: "#0E1D3F", accent: "#D4AF37", text: "#FFFFFF", shape: "hero-split-bold" },
    seed: { tone: "precise, trustworthy, institutional", audience: "high-net-worth and SMB owners", sections_hint: RECIPES.trust, layout_recipe: RECIPES.trust },
  },

  // ─── ECOMMERCE ────────────────────────────────────────────────────────────
  {
    key: "shop-minimal",
    label: "Shop Minimal",
    category: "ecommerce",
    industry: "Ecommerce",
    blurb: "Clean grid, big product imagery, free-shipping bar.",
    preview: { bg: "#FFFFFF", surface: "#F4F4F4", accent: "#0A0A0A", text: "#0A0A0A", shape: "hero-grid" },
    seed: { tone: "modern, considered, conversion-first", audience: "shoppers browsing modern brands", sections_hint: RECIPES.shop, layout_recipe: RECIPES.shop },
  },
  {
    key: "single-product",
    label: "Single Product",
    category: "ecommerce",
    industry: "DTC product",
    blurb: "One product, hero buy-box, scroll story.",
    preview: { bg: "#EFE9E0", surface: "#FFFFFF", accent: "#B65B36", text: "#1A140E", shape: "hero-image-right" },
    seed: { tone: "obsessive, founder-led, story-rich", audience: "DTC shoppers researching a hero product", sections_hint: RECIPES.shop, layout_recipe: RECIPES.shop },
  },
  {
    key: "lookbook",
    label: "Lookbook",
    category: "ecommerce",
    industry: "Fashion",
    blurb: "Editorial photography, full-bleed, look-tagged.",
    preview: { bg: "#0A0A0A", surface: "#141414", accent: "#E0C29A", text: "#FFFFFF", shape: "hero-fullbleed" },
    seed: { tone: "editorial, aspirational, slow", audience: "fashion-forward shoppers", sections_hint: RECIPES.shop, layout_recipe: RECIPES.shop },
  },

  // ─── EVENTS / COMMUNITY ───────────────────────────────────────────────────
  {
    key: "event-landing",
    label: "Event Landing",
    category: "events",
    industry: "Event",
    blurb: "Date + city hero, speaker grid, ticket tiers.",
    preview: { bg: "#0A0A0A", surface: "#141414", accent: "#FF6B35", text: "#FFFFFF", shape: "hero-centered" },
    seed: { tone: "high-energy, time-pressured, exclusive", audience: "attendees deciding whether to buy a ticket", sections_hint: RECIPES.event, layout_recipe: RECIPES.event },
  },
  {
    key: "community-hub",
    label: "Community Hub",
    category: "events",
    industry: "Community",
    blurb: "Member avatars, manifesto, join-the-cohort CTA.",
    preview: { bg: "#FFFFFF", surface: "#F4F1EC", accent: "#6B5BFF", text: "#0A0A0A", shape: "hero-bento" },
    seed: { tone: "human, generous, manifesto-led", audience: "professionals joining a paid community", sections_hint: RECIPES.event, layout_recipe: RECIPES.event },
  },

  // ─── PERSONAL ─────────────────────────────────────────────────────────────
  {
    key: "coach-1-1",
    label: "Coach 1:1",
    category: "personal",
    industry: "Coaching",
    blurb: "Portrait hero, named result, 2 working modes.",
    preview: { bg: "#FFFFFF", surface: "#F2EFE9", accent: "#7C5CFF", text: "#1A1A1A", shape: "hero-image-right" },
    seed: { tone: "personal, kind, accountable", audience: "individuals booking 1:1 coaching", sections_hint: RECIPES.personal, layout_recipe: RECIPES.personal },
  },
  {
    key: "author-book",
    label: "Author Book",
    category: "personal",
    industry: "Author",
    blurb: "Cover hero, blurb stack, pre-order CTA.",
    preview: { bg: "#F5F1E8", surface: "#FFFFFF", accent: "#7A1F2B", text: "#0A0A0A", shape: "hero-editorial" },
    seed: { tone: "literary, intimate, considered", audience: "readers and reviewers", sections_hint: RECIPES.personal, layout_recipe: RECIPES.personal },
  },
  {
    key: "personal-cv",
    label: "Personal CV",
    category: "personal",
    industry: "Resume",
    blurb: "Minimal one-pager, timeline, contact pill.",
    preview: { bg: "#FFFFFF", surface: "#F4F4F4", accent: "#0A0A0A", text: "#0A0A0A", shape: "hero-mono" },
    seed: { tone: "direct, confident, succinct", audience: "recruiters and hiring managers", sections_hint: RECIPES.personal, layout_recipe: RECIPES.personal },
  },
  {
    key: "newsletter",
    label: "Newsletter",
    category: "personal",
    industry: "Newsletter",
    blurb: "Big subscribe box, recent issue list, social proof.",
    preview: { bg: "#FFFBF4", surface: "#FFFFFF", accent: "#2D6CFF", text: "#0A0A0A", shape: "hero-centered" },
    seed: { tone: "smart, casual, weekly", audience: "operators and curious readers", sections_hint: RECIPES.personal, layout_recipe: RECIPES.personal },
  },
];

export const TEMPLATE_CATEGORIES: { key: TemplateCategory | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "service", label: "Local service" },
  { key: "saas", label: "SaaS / Product" },
  { key: "hospitality", label: "Hospitality" },
  { key: "creative", label: "Creative" },
  { key: "professional", label: "Professional" },
  { key: "ecommerce", label: "Ecommerce" },
  { key: "events", label: "Events" },
  { key: "personal", label: "Personal" },
];
