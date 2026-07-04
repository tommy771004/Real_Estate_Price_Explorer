import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";

import { SEO_CONTENT_PAGES, type SeoContentPage } from "../src/content/seoPages";
import { INDEXABLE_SELECTIONS, buildSelectionPath, buildSeoCopy } from "../src/lib/seoRoutes";
import { buildSitemapRecords, renderSitemapXml } from "../src/lib/seoSitemap";

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const resolveLastModified = () => {
  const explicit = process.env.SEO_LAST_MODIFIED?.trim();
  if (explicit && !/^\d{4}-\d{2}-\d{2}$/.test(explicit)) {
    throw new Error("SEO_LAST_MODIFIED must use YYYY-MM-DD format.");
  }
  return explicit || new Date().toISOString().slice(0, 10);
};

const routeDirectory = (outputDirectory: string, route: string) =>
  path.join(outputDirectory, ...decodeURIComponent(route).split("/").filter(Boolean));

const replaceMetadata = (
  html: string,
  metadata: { title: string; description: string; canonicalUrl: string; body: string; schema: unknown },
) => html
  .replace(/<title>.*?<\/title>/s, `<title>${escapeHtml(metadata.title)}</title>`)
  .replace(/(<meta\s+name="description"\s+content=")[^"]*(")/s, `$1${escapeHtml(metadata.description)}$2`)
  .replace(/<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${metadata.canonicalUrl}" />`)
  .replace('<div id="root"></div>', `<div id="root">${metadata.body}</div>`)
  .replace(
    '<script type="module"',
    `<script type="application/ld+json">${JSON.stringify(metadata.schema)}</script>\n    <script type="module"`,
  );

const renderContentPage = (page: SeoContentPage) => {
  const sections = page.sections.map((section) => `<section>
    <h2>${escapeHtml(section.heading)}</h2>
    ${section.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
    ${section.items ? `<ul>${section.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
  </section>`).join("");
  const links = page.links?.map((link) => `<li><a href="${link.href}">${escapeHtml(link.label)}</a></li>`).join("") ?? "";
  return `<main data-seo-content-page><article><h1>${escapeHtml(page.title)}</h1>
    ${page.answer ? `<p data-answer-first>${escapeHtml(page.answer)}</p>` : ""}
    <p>${escapeHtml(page.intro)}</p>${sections}
    ${links ? `<nav aria-label="本頁相關入口"><h2>相關頁面</h2><ul>${links}</ul></nav>` : ""}
  </article></main>`;
};

export const seoBuildPlugin = () => {
  const lastModified = resolveLastModified();
  return {
    name: "liquid-glass-seo-routes",
    async writeBundle(options: { dir?: string }) {
      const outputDirectory = path.resolve(process.cwd(), options.dir ?? "dist");
      const homepage = await readFile(path.join(outputDirectory, "index.html"), "utf8");
      const siteOrigin = (process.env.VITE_SITE_URL || "https://real-estate-liquid-glass.vercel.app").replace(/\/+$/, "");

      for (const selection of INDEXABLE_SELECTIONS) {
        const route = buildSelectionPath(selection);
        if (route === "/") continue;
        const copy = buildSeoCopy(selection);
        const canonicalUrl = `${siteOrigin}${route}`;
        const body = `<main data-seo-selection-page><h1>${escapeHtml(copy.scopeLabel)}${escapeHtml(selection.typeName)}實價登錄查詢</h1><p>${escapeHtml(copy.description)}</p></main>`;
        const html = replaceMetadata(homepage, {
          title: copy.title,
          description: copy.description,
          canonicalUrl,
          body,
          schema: {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            url: canonicalUrl,
            name: copy.title,
            description: copy.description,
            dateModified: lastModified,
            inLanguage: "zh-Hant-TW",
          },
        });
        const directory = routeDirectory(outputDirectory, route);
        await mkdir(directory, { recursive: true });
        await writeFile(path.join(directory, "index.html"), html, "utf8");
      }

      for (const page of SEO_CONTENT_PAGES) {
        const canonicalUrl = `${siteOrigin}${page.path}`;
        const html = replaceMetadata(homepage, {
          title: `${page.title} | 實價登錄查詢`,
          description: page.description,
          canonicalUrl,
          body: renderContentPage(page),
          schema: {
            "@context": "https://schema.org",
            "@type": "WebPage",
            url: canonicalUrl,
            name: page.title,
            description: page.description,
            dateModified: page.dateModified ?? lastModified,
            inLanguage: "zh-Hant-TW",
          },
        });
        const directory = routeDirectory(outputDirectory, page.path);
        await mkdir(directory, { recursive: true });
        await writeFile(path.join(directory, "index.html"), html, "utf8");
      }

      await writeFile(
        path.join(outputDirectory, "sitemap.xml"),
        renderSitemapXml(buildSitemapRecords(siteOrigin, lastModified)),
        "utf8",
      );
      await writeFile(
        path.join(outputDirectory, "robots.txt"),
        `User-agent: *\nAllow: /\n\nSitemap: ${siteOrigin}/sitemap.xml\n`,
        "utf8",
      );
    },
  };
};
