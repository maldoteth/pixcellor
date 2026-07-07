import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import SeoHead from "@/components/SeoHead";
import { OG_LEGAL, OG_LEGAL_BY_SLUG } from "@/data/ogImages";

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
          <strong>Retainers (Growth, Scale, Enterprise):</strong> Monthly or annual subscription covering
          build, hosting, domain management, maintenance and all agreed scope. Monthly plans are
          cancel-anytime; annual plans save up to £4,938/yr. Out-of-scope third-party costs (e.g. paid
          ads, premium APIs, specialist tooling, domain purchases, premium hosting tiers) are passed
          through to the client at cost.
        </li>
        <li>
          <strong>Enterprise:</strong> Bespoke. Pricing, deliverables and timelines are agreed in a separate
          Statement of Work which forms part of these Terms.
        </li>
        <li>
          All prices are in GBP. We may change prices at any time with
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
    heading: "20. Pixcellor Private SME Grant Programme",
    body: (
      <>
        <p>
          The "<strong>Pixcellor Private SME Grant</strong>" (also referred to in our marketing as the
          "Pixcellor private SME grant", "private SME grant", "SME Grant", "Grant Script" offer, or
          "SME Subsidy"), and any related discount of up to ~67% off our standard package pricing
          (collectively the "<strong>Grant Programme</strong>"), is a <strong>privately funded</strong>
          commercial discount programme operated solely by {COMPANY}. It is <strong>not</strong> a
          government grant, is <strong>not</strong> affiliated with, endorsed by, or administered on
          behalf of the UK Government, His Majesty's Government, any local authority, Innovate UK, the
          British Business Bank, or any other public body or statutory scheme. No public money is
          involved.
        </p>
        <p className="mt-3">
          The Grant Programme is funded from a private pool contributed by a consortium of independent
          blockchain and technology entrepreneurs who back {COMPANY}'s mission to get UK small and
          medium-sized businesses online. The total committed funding for the initial round is{" "}
          <strong>£250,000 GBP</strong>, allocated on a first-come, first-served basis until exhausted,
          withdrawn, paused, or replaced by a successor round at our discretion. We may close, extend,
          top-up, or modify the Programme at any time without notice; published discount percentages are
          indicative of the typical subsidy applied and do not constitute a binding offer until an order
          is accepted in writing (including by automated order confirmation).
        </p>
        <p className="mt-3">
          <strong>Eligibility.</strong> The Grant Programme is available only to small and medium-sized
          enterprises ("SMEs") that (a) are established, registered or trading in the United Kingdom,
          (b) meet the UK Companies Act 2006 / Companies (Accounts) Regulations definition of a small or
          medium-sized company (broadly: fewer than 250 employees and turnover not exceeding £36m, or
          such updated thresholds as are in force from time to time), (c) are purchasing the Services for
          genuine business use, and (d) are not a competitor of {COMPANY}, a public body, or a regulated
          entity prohibited from receiving private commercial discounts. Sole traders and partnerships
          carrying on a bona fide UK business are eligible. We may require reasonable proof of
          eligibility (e.g. Companies House number, VAT number, trading address) before applying or
          continuing the subsidy.
        </p>
        <p className="mt-3">
          <strong>How the subsidy works.</strong> The Grant Programme is applied as a discount against
          our standard list price for eligible packages at the point of order. The subsidised amount is
          paid to {COMPANY} from the privately funded grant pool described above; no cash is paid to the
          customer and no separate "grant award" letter is issued. The subsidy is non-transferable, has
          no cash value, cannot be combined with other promotional discounts unless we say so in writing,
          and applies only to the initial build / first paid term of the relevant package. Renewals,
          third-party pass-through costs (domains, hosting overages, paid ads, premium APIs) and
          out-of-scope work are charged at standard rates and are not subsidised.
        </p>
        <p className="mt-3">
          <strong>Withdrawal & clawback.</strong> We may withdraw the subsidy and re-invoice the full
          undiscounted list price (and suspend Services until paid) where (i) the customer provided
          materially false or misleading eligibility information, (ii) the customer is not a UK SME as
          defined above, (iii) the customer cancels, charges back or fails to pay within the agreed
          terms, (iv) the customer breaches these Terms or our Acceptable Use Policy, or (v) the
          customer resells, sublicenses or transfers the subsidised Services to a non-eligible third
          party without our written consent.
        </p>
        <p className="mt-3">
          <strong>Tax & accounting.</strong> The Grant Programme is a commercial price reduction, not a
          grant of money to the customer, and is not intended to constitute taxable income, "de minimis"
          subsidy, or notifiable State aid / Subsidy Control assistance under the UK Subsidy Control Act
          2022. Customers are responsible for their own tax treatment and for taking independent advice
          where needed.
        </p>
        <p className="mt-3">
          <strong>No guarantee.</strong> Inclusion of the SME Subsidy on our website, in marketing
          messages, SMS or call scripts is for information only and does not create a contractual right
          to a subsidy until an order is accepted by {COMPANY}. Allocation, eligibility decisions and any
          dispute about the Programme are at {COMPANY}'s sole and reasonable discretion.
        </p>
      </>
    ),
  },
  {
    id: "21",
    heading: "21. Contact",
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
        Retainer packages include a 28-day satisfaction guarantee from delivery
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

  const activeDoc = doc ? ALL_DOCS.find((d) => d.slug === doc) : undefined;
  const seoTitle = activeDoc
    ? `${activeDoc.title} · Pixcellor™`
    : "Legal · Terms, Privacy, Refunds & Acceptable Use · Pixcellor™";
  const seoDesc = activeDoc
    ? `${activeDoc.title} for Pixcellor — ${activeDoc.intro}`
    : "Pixcellor's Terms of Service, Privacy Policy, Refund Policy and Acceptable Use Policy in one place.";
  const seoPath = activeDoc ? `/legal/${activeDoc.slug}` : "/legal";
  const seoImage = activeDoc ? (OG_LEGAL_BY_SLUG[activeDoc.slug] ?? OG_LEGAL) : OG_LEGAL;

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
      <SeoHead title={seoTitle} description={seoDesc} path={seoPath} image={seoImage} />
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

        <footer className="mt-16 pt-6 border-t border-white/10 text-muted-foreground text-lg text-slate-50 bg-white/0">
          © {new Date().getFullYear()} {COMPANY}. All rights reserved.
        </footer>
      </div>
    </main>
  );
};

export default Legal;
