import { useEffect } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import SeoHead from "@/components/SeoHead";
import Footer from "@/components/Footer";
import ServiceSalesView from "@/components/services/ServiceSalesView";
import LetsTalkPrompt from "@/components/LetsTalkPrompt";
import PackagesDialog from "@/components/PackagesDialog";
import VisionGenerator from "@/components/VisionGenerator";
import { getServiceBySlug } from "@/data/services";
import { SERVICE_SEO } from "@/data/serviceSeo";
import { OG_SERVICE_BY_SLUG, OG_SERVICES } from "@/data/ogImages";

export default function ServicePage() {
  const { slug = "" } = useParams();
  const service = getServiceBySlug(slug);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [slug]);

  if (!service) return <Navigate to="/services" replace />;

  const url = `https://pixcellor.com/services/${service.slug}`;
  const seo = SERVICE_SEO[service.slug];
  const seoTitle = seo?.title ?? `${service.name} — Pixcellor`;
  const seoDescription = seo?.description ?? service.tagline;

  const serviceLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.name,
    serviceType: service.name,
    description: service.heroBlurb,
    url,
    provider: {
      "@type": "Organization",
      name: "Pixcellor™",
      url: "https://pixcellor.com/",
    },
    areaServed: "Worldwide",
    ...(seo?.keywords ? { keywords: seo.keywords.join(", ") } : {}),
    ...(service.pricing
      ? {
          offers: {
            "@type": "Offer",
            description: service.pricing,
            priceCurrency: "GBP",
            url,
          },
        }
      : {}),
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://pixcellor.com/" },
      { "@type": "ListItem", position: 2, name: "Services", item: "https://pixcellor.com/services" },
      { "@type": "ListItem", position: 3, name: service.name, item: url },
    ],
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SeoHead
        title={seoTitle}
        description={seoDescription}
        path={`/services/${service.slug}`}
        image={OG_SERVICE_BY_SLUG[service.slug] ?? OG_SERVICES}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />


      <header className="sticky top-0 z-30 border-b border-foreground/10 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3 md:px-10">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm font-semibold tracking-tight hover:opacity-80"
          >
            <ArrowLeft className="h-4 w-4" />
            Pixcellor™
          </Link>
          <Link
            to="/services"
            className="text-xs uppercase tracking-wider text-foreground/70 hover:text-foreground"
          >
            All services
          </Link>
        </div>
      </header>

      <main>
        <ServiceSalesView service={service} />
      </main>

      <Footer />

      {/* Mounted so CTAs work on this standalone route */}
      <LetsTalkPrompt />
      <PackagesDialog hidden />
      <VisionGenerator hidden />
    </div>
  );
}
