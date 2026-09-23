import { PAGES, type PageSeo } from "@/lib/seoPages";
import { ArticleJsonLd, BreadcrumbJsonLd, type Crumb } from "./JsonLd";

// Structured data for a guide page: an Article by the Nerf Chess team with
// the page's own headline and description (the same row in seoPages.ts the
// metadata uses), inside a Home > Guide > page trail. A page outside /guide
// that borrowed the guide breadcrumb (/updates) gets a plain trail from Home
// instead of claiming to live under the guide (F246).
export function GuideJsonLd({ title, path }: { title: string; path: string }) {
  const row = (PAGES as Record<string, PageSeo>)[path];
  if (path === "/guide" || path.startsWith("/guide/")) {
    const crumbs: Crumb[] = path === "/guide" ? [{ name: "Guide", path }] : [{ name: "Guide", path: "/guide" }, { name: title, path }];
    return <ArticleJsonLd headline={row?.title ?? title} description={row?.description ?? title} path={path} crumbs={crumbs} />;
  }
  return <BreadcrumbJsonLd crumbs={[{ name: title, path }]} />;
}
