import { useEffect } from "react";

type SeoHeadProps = {
  title: string;
  description: string;
  path: string; // canonical path, e.g. "/legal"
  noindex?: boolean;
  image?: string;
  type?: "website" | "article";
};

const SITE_ORIGIN = "https://pixcellor.com";
const DEFAULT_IMAGE = "https://pixcellor.com/__l5e/assets-v1/597b8c9d-3a38-48f3-ac7a-afbeec971967/og-default.png";

const upsertMeta = (selector: string, attrs: Record<string, string>) => {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    Object.entries(attrs).forEach(([k, v]) => {
      if (k !== "content") el.setAttribute(k, v);
    });
    document.head.appendChild(el);
  }
  el.setAttribute("content", attrs.content);
};

const upsertLink = (rel: string, href: string) => {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
};

/**
 * Per-route SEO head manager. Sets <title>, description, canonical,
 * robots, Open Graph and Twitter card tags. Use on every page.
 */
export default function SeoHead({
  title,
  description,
  path,
  noindex = false,
  image = DEFAULT_IMAGE,
  type = "website",
}: SeoHeadProps) {
  useEffect(() => {
    const fullTitle = title.length > 60 ? title.slice(0, 57) + "…" : title;
    const desc = description.length > 160 ? description.slice(0, 157) + "…" : description;
    const url = `${SITE_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;

    document.title = fullTitle;

    upsertMeta('meta[name="description"]', { name: "description", content: desc });
    upsertMeta('meta[name="robots"]', {
      name: "robots",
      content: noindex
        ? "noindex, nofollow"
        : "index, follow, max-image-preview:large, max-snippet:-1",
    });

    upsertLink("canonical", url);

    // Open Graph
    upsertMeta('meta[property="og:title"]', { property: "og:title", content: fullTitle });
    upsertMeta('meta[property="og:description"]', { property: "og:description", content: desc });
    upsertMeta('meta[property="og:url"]', { property: "og:url", content: url });
    upsertMeta('meta[property="og:type"]', { property: "og:type", content: type });
    upsertMeta('meta[property="og:image"]', { property: "og:image", content: image });
    upsertMeta('meta[property="og:site_name"]', { property: "og:site_name", content: "Pixcellor™" });

    // Twitter
    upsertMeta('meta[name="twitter:card"]', { name: "twitter:card", content: "summary_large_image" });
    upsertMeta('meta[name="twitter:title"]', { name: "twitter:title", content: fullTitle });
    upsertMeta('meta[name="twitter:description"]', { name: "twitter:description", content: desc });
    upsertMeta('meta[name="twitter:image"]', { name: "twitter:image", content: image });
  }, [title, description, path, noindex, image, type]);

  return null;
}
