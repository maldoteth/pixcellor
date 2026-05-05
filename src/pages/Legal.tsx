import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";

type Section = { id: string; heading: string; body: React.ReactNode };

const COMPANY = "Pixcellor";
const CONTACT = "hello@pixcellor.com";
const PHONE = "+44 1483 912430";
const EFFECTIVE = "5 May 2026";

const TERMS: Section[] = [
  {
    id: "1",
    heading: "1. About these Terms",
    body: (
      <>
        These Terms of Service ("Terms") govern your use of {COMPANY}'s website, products and services
        ("Services"). By placing an order, signing up, or otherwise using our Services you agree to be
        legally bound by these Terms. If you do not agree, do not use the Services.
      </>
    ),
  },
  {
    id: "2",
    heading: "2. Who we are",
    body: (
      <>
        {COMPANY} is a trading name operating from the United Kingdom. Contact: {CONTACT} · {PHONE}.
        References to "we", "us" and "our" mean {COMPANY}. References to "you" mean the customer.
      </>
    ),
  },
  {
    id: "3",
    heading: "3. Packages & pricing",
    body: (
      <ul className="list-disc pl-5 space-y-2">
        <li>
          <strong>Full Works (£150):</strong> The £150 fee is an <strong>annual</strong> subscription
          covering build, hosting, domain management and maintenance. Customers who purchased before any
          price change keep the £150/year rate for the lifetime of the active subscription, provided
          payments remain current and the service is not cancelled. Lapsed subscriptions revert to the
          then-current rate.
        </li>
        <li>
          <strong>Elite (£500):</strong> One-time build fee. A renewal fee of <strong>£150 per year</strong>
          applies thereafter for domain hosting, management, and ongoing maintenance. Failure to pay the
          renewal may result in suspension of the domain, hosting and related services.
        </li>
        <li>
          <strong>Retainer:</strong> Monthly or annual subscription. Includes the agreed scope only. While
          a retainer is active, we will not charge percentage fees on other services covered by the
          retainer scope. Out-of-scope third-party costs (e.g. paid ads, premium APIs, specialist tooling,
          domain purchases, premium hosting tiers) are passed through to the client at cost.
        </li>
        <li>
          <strong>Enterprise:</strong> Bespoke. Pricing, deliverables and timelines are agreed in a separate
          Statement of Work which forms part of these Terms.
        </li>
        <li>
          All prices are in GBP and exclusive of VAT unless stated. We may change prices at any time with
          effect for new orders and renewals; existing fixed-price commitments are honoured.
        </li>
      </ul>
    ),
  },
  {
    id: "4",
    heading: "4. \"All-inclusive\" service & fair-use",
    body: (
      <>
        Where a package is described as "all-inclusive" we cover reasonable hosting, domain registration
        and bandwidth costs as part of the fee. This is subject to <strong>fair use</strong>. If the
        operating costs attributable to your site or application exceed <strong>10% of revenue
        attributable to the service in any annual period</strong> (or, where there is no measurable
        revenue, exceed normal small-business usage), the excess will be billed to you on annual renewal
        or, where appropriate, on 30 days' notice. We will always let you know before invoicing for excess
        usage.
      </>
    ),
  },
  {
    id: "5",
    heading: "5. Lifetime warranty & maintenance",
    body: (
      <>
        Our "lifetime warranty" covers defects in our build for as long as the relevant service remains
        active and paid for. It does <strong>not</strong> cover third-party costs. Domains, SSL,
        specialist hosting and similar recurring costs remain payable each year (typically a few pounds
        per year for standard domains; premium or custom TLDs cost more and are quoted separately). The
        warranty terminates if you cancel, transfer, modify the codebase outside our control, or breach
        these Terms.
      </>
    ),
  },
  {
    id: "6",
    heading: "6. Unlimited revisions (within reason)",
    body: (
      <>
        Where a package includes "unlimited revisions" this is subject to a fair-use, good-faith standard.
        Revisions must relate to the agreed scope, brief and brand. We may decline or quote separately for
        requests that constitute a new project, a change of direction, repeated rework after written
        sign-off, or work that is abusive, unlawful or commercially unreasonable.
      </>
    ),
  },
  {
    id: "7",
    heading: "7. 28-day satisfaction money-back guarantee",
    body: (
      <>
        If you are not satisfied with the <strong>results</strong> of an eligible package, you may request
        a refund within <strong>28 days of delivery of the initial build</strong>. To qualify you must
        (a) have engaged with revisions in good faith, (b) provide specific written reasons relating to
        the deliverable, and (c) return or cease use of any work product. The guarantee does not cover:
        third-party fees already paid on your behalf (domains, ads, APIs, paid integrations), retainer
        services already rendered, custom Enterprise work, or refunds requested after the 28-day window.
        Refunds are made to the original payment method within 14 working days of approval.
      </>
    ),
  },
  {
    id: "8",
    heading: "8. Payment, late payment & suspension",
    body: (
      <>
        Subscriptions auto-renew until cancelled. If a payment fails or remains unpaid for more than 7
        days we may suspend services without further notice and apply a reasonable reinstatement fee. We
        may charge interest on overdue invoices at the statutory rate under the Late Payment of
        Commercial Debts (Interest) Act 1998. Disputed amounts must be raised in writing within 7 days of
        invoice.
      </>
    ),
  },
  {
    id: "9",
    heading: "9. Cancellation & consumer rights",
    body: (
      <>
        Subscriptions can be cancelled at any time and will not renew at the next billing date. Where you
        contract as a consumer in the UK or EU, you have a statutory 14-day right to cancel; by
        instructing us to begin work within that period you expressly request that we start performance
        and acknowledge you will lose the right of withdrawal once the service is fully performed.
      </>
    ),
  },
  {
    id: "10",
    heading: "10. Intellectual property",
    body: (
      <>
        On full payment, you receive a worldwide, non-exclusive licence to use the bespoke deliverables we
        produce for your business. We retain ownership of pre-existing tools, frameworks, components,
        templates, internal libraries and know-how. We may reference our work in our portfolio and case
        studies unless you ask us in writing not to.
      </>
    ),
  },
  {
    id: "11",
    heading: "11. Your responsibilities",
    body: (
      <>
        You are responsible for the accuracy and legality of any content, data or materials you provide;
        for keeping account credentials secure; for complying with all applicable laws (including data
        protection); and for ensuring you have the rights to use any third-party assets you supply. You
        agree to indemnify us against claims arising from your content or your use of the Services.
      </>
    ),
  },
  {
    id: "12",
    heading: "12. Acceptable use",
    body: (
      <>
        You must not use our Services for unlawful, infringing, defamatory, harmful or fraudulent
        purposes; for spam or unsolicited communications outside the scope of opt-ins; for adult,
        gambling or weapons content without prior written agreement; or to attempt to disrupt, reverse
        engineer or gain unauthorised access to our systems.
      </>
    ),
  },
  {
    id: "13",
    heading: "13. Third-party services",
    body: (
      <>
        Our Services rely on third-party providers (e.g. hosting, payments, email, analytics, AI). Their
        own terms apply. We are not liable for outages, changes or terminations by third parties. Where
        a third party charges us in connection with your project, those costs are your responsibility.
      </>
    ),
  },
  {
    id: "14",
    heading: "14. Warranties & disclaimers",
    body: (
      <>
        Except as expressly stated, the Services are provided "as is" and "as available". We do not
        warrant that the Services will be uninterrupted, error-free, or that any specific commercial,
        SEO, ranking or revenue outcome will be achieved.
      </>
    ),
  },
  {
    id: "15",
    heading: "15. Limitation of liability",
    body: (
      <>
        Nothing in these Terms limits liability for death or personal injury caused by negligence, fraud,
        or any liability that cannot be excluded by law. Subject to that, our total aggregate liability
        in connection with the Services in any 12-month period is limited to the fees paid by you to us
        in that period. We are not liable for loss of profit, revenue, business, goodwill, anticipated
        savings, data or any indirect or consequential loss.
      </>
    ),
  },
  {
    id: "16",
    heading: "16. Termination",
    body: (
      <>
        We may suspend or terminate the Services immediately if you breach these Terms, fail to pay, or
        if continued service would expose us to legal or reputational risk. On termination, all
        outstanding fees become immediately payable and licences granted to you cease.
      </>
    ),
  },
  {
    id: "17",
    heading: "17. Confidentiality",
    body: (
      <>
        Each party will keep the other's non-public information confidential and use it only to perform
        these Terms. This obligation survives termination.
      </>
    ),
  },
  {
    id: "18",
    heading: "18. Changes to these Terms",
    body: (
      <>
        We may update these Terms from time to time. Material changes will be notified by email or in-app
        notice. Continued use after the effective date constitutes acceptance.
      </>
    ),
  },
  {
    id: "19",
    heading: "19. Governing law & jurisdiction",
    body: (
      <>
        These Terms are governed by the laws of England and Wales. The courts of England and Wales have
        exclusive jurisdiction, save that we may bring proceedings in any jurisdiction where you are
        located to recover unpaid fees or to protect our intellectual property.
      </>
    ),
  },
  {
    id: "20",
    heading: "20. Contact",
    body: (
      <>
        Questions about these Terms? Email {CONTACT} or call {PHONE}.
      </>
    ),
  },
];

const PRIVACY: Section[] = [
  {
    id: "p1",
    heading: "1. Who we are",
    body: (
      <>
        {COMPANY} is the data controller for personal data collected through our website and services.
        Contact: {CONTACT}.
      </>
    ),
  },
  {
    id: "p2",
    heading: "2. What we collect",
    body: (
      <ul className="list-disc pl-5 space-y-2">
        <li><strong>Identity & contact:</strong> name, email, phone, business name.</li>
        <li><strong>Account & order data:</strong> login details, package, payment status, project requirements.</li>
        <li><strong>Communications:</strong> chat messages, support emails, call notes.</li>
        <li><strong>Technical:</strong> IP address, device, browser, pages viewed, referrer (only with consent where required).</li>
        <li><strong>Marketing preferences:</strong> opt-ins and unsubscribes.</li>
      </ul>
    ),
  },
  {
    id: "p3",
    heading: "3. How we use it (lawful bases)",
    body: (
      <ul className="list-disc pl-5 space-y-2">
        <li>To deliver the Services and fulfil our contract with you.</li>
        <li>To take steps at your request before entering a contract (quotes, demos).</li>
        <li>For legitimate interests: securing our service, preventing fraud, improving our offer, limited B2B outreach.</li>
        <li>For legal obligations: tax, accounting, responding to lawful requests.</li>
        <li>With consent: cookies/analytics that are not strictly necessary, marketing emails to consumers.</li>
      </ul>
    ),
  },
  {
    id: "p4",
    heading: "4. Sharing",
    body: (
      <>
        We share data only with processors who help us run the business (hosting, database, email,
        payments, analytics, AI providers, telephony) under appropriate contractual safeguards, and with
        authorities where required by law. We do not sell your personal data.
      </>
    ),
  },
  {
    id: "p5",
    heading: "5. International transfers",
    body: (
      <>
        Some providers are located outside the UK/EEA. Where this is the case we rely on UK/EU adequacy
        decisions or Standard Contractual Clauses with appropriate supplementary measures.
      </>
    ),
  },
  {
    id: "p6",
    heading: "6. Retention",
    body: (
      <>
        We keep personal data only for as long as needed for the purposes set out above and to comply
        with legal obligations (typically up to 7 years for financial records). Marketing data is kept
        until you unsubscribe.
      </>
    ),
  },
  {
    id: "p7",
    heading: "7. Your rights",
    body: (
      <>
        You have the right to access, rectify, erase, restrict or object to processing, to data
        portability, and to withdraw consent at any time. To exercise any right, email {CONTACT}. You can
        also complain to the UK Information Commissioner's Office (ico.org.uk).
      </>
    ),
  },
  {
    id: "p8",
    heading: "8. Cookies & tracking",
    body: (
      <>
        We use a minimal number of strictly necessary cookies and, with your consent, analytics. You can
        manage your choice via the consent banner shown on first visit and change it any time by clearing
        site storage.
      </>
    ),
  },
  {
    id: "p9",
    heading: "9. Security",
    body: (
      <>
        We use industry-standard measures (encryption in transit, role-based access, row-level security
        on our database, audited third-party providers). No system is 100% secure; report any concerns to
        {" "}{CONTACT}.
      </>
    ),
  },
  {
    id: "p10",
    heading: "10. Changes",
    body: <>We may update this policy. The "Effective" date at the top reflects the latest version.</>,
  },
];

const REFUND: Section[] = [
  {
    id: "r1",
    heading: "1. 28-day satisfaction guarantee",
    body: (
      <>
        Eligible build packages (Full Works, Elite) include a 28-day satisfaction guarantee from delivery
        of the initial build. If you are unhappy with the result, tell us in writing with specifics; if
        we cannot put it right within a reasonable revision cycle, we will refund the build fee, less any
        third-party costs already incurred on your behalf.
      </>
    ),
  },
  {
    id: "r2",
    heading: "2. Not refundable",
    body: (
      <ul className="list-disc pl-5 space-y-2">
        <li>Domains, hosting, paid ads, APIs and other third-party fees already paid out.</li>
        <li>Retainer time already worked.</li>
        <li>Enterprise / bespoke Statement-of-Work fees once work has commenced (refund on a pro-rata basis at our discretion).</li>
        <li>Renewal fees once the renewal period has begun.</li>
      </ul>
    ),
  },
  {
    id: "r3",
    heading: "3. Subscription cancellations",
    body: (
      <>
        You can cancel at any time from your customer portal or by emailing {CONTACT}. Cancellation stops
        the next renewal; we do not pro-rate part-used periods unless required by law.
      </>
    ),
  },
  {
    id: "r4",
    heading: "4. Chargebacks",
    body: (
      <>
        Please contact us before raising a chargeback. Chargebacks raised without first contacting us may
        result in suspension of services pending resolution.
      </>
    ),
  },
];

const ACCEPTABLE: Section[] = [
  {
    id: "a1",
    heading: "1. Prohibited use",
    body: (
      <ul className="list-disc pl-5 space-y-2">
        <li>Illegal, infringing, defamatory, hateful or harassing content.</li>
        <li>Malware, phishing, scraping at scale, or bypassing security.</li>
        <li>Unsolicited bulk email outside opted-in lists, or any breach of PECR / GDPR / CAN-SPAM.</li>
        <li>Adult, gambling, weapons, crypto-token issuance or regulated financial advice without prior written agreement.</li>
        <li>Activities that materially endanger our infrastructure, reputation or other customers.</li>
      </ul>
    ),
  },
  {
    id: "a2",
    heading: "2. Enforcement",
    body: (
      <>
        We may remove content, suspend or terminate Services without refund where we reasonably believe
        this policy has been breached, and report unlawful activity to authorities.
      </>
    ),
  },
];

const DOCS: Record<string, { title: string; intro: string; sections: Section[]; slug: string }> = {
  terms: { slug: "terms", title: "Terms of Service", intro: "The legal agreement between you and Pixcellor.", sections: TERMS },
  privacy: { slug: "privacy", title: "Privacy Policy", intro: "How we collect, use and protect personal data.", sections: PRIVACY },
  refund: { slug: "refund", title: "Refund Policy", intro: "Our 28-day satisfaction guarantee and refund rules.", sections: REFUND },
  "acceptable-use": { slug: "acceptable-use", title: "Acceptable Use Policy", intro: "What you can and cannot do with our Services.", sections: ACCEPTABLE },
};

const ALL_DOCS = [DOCS.terms, DOCS.privacy, DOCS.refund, DOCS["acceptable-use"]];

const Legal = () => {
  const { doc } = useParams();

  useEffect(() => {
    document.title = "Legal · Terms, Privacy, Refunds & Acceptable Use · Pixcellor";
    const meta = document.querySelector('meta[name="description"]') ?? Object.assign(document.createElement("meta"), { name: "description" });
    meta.setAttribute("content", "Pixcellor's Terms of Service, Privacy Policy, Refund Policy and Acceptable Use Policy in one place.");
    if (!meta.parentNode) document.head.appendChild(meta);
  }, []);

  // Backwards-compat: if a /legal/:doc URL is hit, scroll to that doc section.
  useEffect(() => {
    if (!doc) return;
    const target = ALL_DOCS.find((d) => d.slug === doc);
    if (target) {
      requestAnimationFrame(() => {
        document.getElementById(`doc-${target.slug}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, [doc]);

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-5 py-14">
        <Link to="/" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">
          ← Pixcellor
        </Link>
        <h1 className="mt-6 text-3xl md:text-4xl font-semibold tracking-tight">Legal</h1>
        <p className="mt-2 text-sm text-muted-foreground">Effective: {EFFECTIVE}</p>
        <p className="mt-4 text-base text-muted-foreground">
          Everything in one place: our Terms of Service, Privacy Policy, Refund Policy and Acceptable Use Policy.
        </p>

        <nav aria-label="Jump to" className="mt-8 flex flex-wrap gap-2 text-xs">
          {ALL_DOCS.map((d) => (
            <a
              key={d.slug}
              href={`#doc-${d.slug}`}
              className="px-3 py-1.5 rounded-full border border-white/15 text-muted-foreground hover:text-foreground hover:border-white/30 transition-colors"
            >
              {d.title}
            </a>
          ))}
        </nav>

        <div className="mt-12 space-y-16">
          {ALL_DOCS.map((d) => (
            <article key={d.slug} id={`doc-${d.slug}`} className="scroll-mt-24">
              <header className="border-b border-white/10 pb-4">
                <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">{d.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{d.intro}</p>
              </header>
              <div className="mt-8 space-y-8">
                {d.sections.map((s) => (
                  <section key={s.id} id={`${d.slug}-${s.id}`} className="scroll-mt-24">
                    <h3 className="text-lg md:text-xl font-semibold">{s.heading}</h3>
                    <div className="mt-3 text-sm md:text-[15px] leading-relaxed text-muted-foreground">{s.body}</div>
                  </section>
                ))}
              </div>
            </article>
          ))}
        </div>

        <footer className="mt-16 pt-6 border-t border-white/10 text-xs text-muted-foreground">
          © {new Date().getFullYear()} {COMPANY}. All rights reserved.
        </footer>
      </div>
    </main>
  );
};

export default Legal;
