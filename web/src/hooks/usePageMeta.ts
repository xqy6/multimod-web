import { useEffect } from "react";

interface PageMetaOptions {
  title: string;
  description: string;
  image?: string;
  type?: "website" | "article";
  jsonLd?: object | object[];
}

function absoluteUrl(value: string): string {
  if (/^(https?:|data:)/i.test(value)) return value;
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}${value.startsWith("/") ? value : `/${value}`}`;
}

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  let element = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attr, key);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

function upsertLink(rel: string, href: string) {
  let element = document.head.querySelector(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", rel);
    document.head.appendChild(element);
  }
  element.setAttribute("href", href);
}

export function usePageMeta(options: PageMetaOptions) {
  const jsonLdKey = JSON.stringify(options.jsonLd ?? null);

  useEffect(() => {
    const jsonLd = jsonLdKey ? (JSON.parse(jsonLdKey) as object | object[]) : undefined;
    const canonical =
      window.location.origin +
      window.location.pathname +
      window.location.search;
    const description = options.description.trim();
    const image = absoluteUrl(options.image ?? "/og-cover.png");

    document.title = options.title;
    upsertMeta("name", "description", description);
    upsertMeta("property", "og:type", options.type ?? "website");
    upsertMeta("property", "og:title", options.title);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:url", canonical);
    upsertMeta("property", "og:image", image);
    upsertMeta("property", "og:image:width", "1200");
    upsertMeta("property", "og:image:height", "630");
    upsertMeta("property", "og:site_name", "MODULO");
    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", options.title);
    upsertMeta("name", "twitter:description", description);
    upsertMeta("name", "twitter:image", image);
    upsertLink("canonical", canonical);

    const existing = document.getElementById("page-jsonld");
    if (jsonLd) {
      const script = (existing ??
        document.createElement("script")) as HTMLScriptElement;
      if (!existing) {
        script.id = "page-jsonld";
        script.type = "application/ld+json";
        document.head.appendChild(script);
      }
      script.textContent = jsonLdKey;
    } else if (existing) {
      existing.remove();
    }
  }, [
    options.description,
    options.image,
    jsonLdKey,
    options.title,
    options.type,
  ]);
}
