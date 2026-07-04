import { ArrowLeft, ExternalLink } from "lucide-react";

import type { SeoContentPage as SeoContentPageData } from "../content/seoPages";
import { NAV_GROUPS } from "../content/siteNav";

export function SeoContentPage({ page }: { page: SeoContentPageData }) {
  return (
    <div className="seo-page-shell">
      <header className="seo-page-header glass-surface">
        <a className="seo-back-link" href="/">
          <ArrowLeft size={18} aria-hidden="true" />
          回到實價登錄查詢
        </a>
      </header>
      <main className="seo-article">
        <article>
          <h1>{page.title}</h1>
          {page.answer ? <p className="seo-answer">{page.answer}</p> : null}
          <p className="seo-intro">{page.intro}</p>
          {page.sections.map((section) => (
            <section key={section.heading}>
              <h2>{section.heading}</h2>
              {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              {section.items ? <ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul> : null}
              {section.table ? (
                <div className="seo-table-scroll">
                  <table>
                    {section.table.caption ? <caption>{section.table.caption}</caption> : null}
                    <thead><tr>{section.table.headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
                    <tbody>
                      {section.table.rows.map((row, index) => (
                        <tr key={`${section.heading}-${index}`}>
                          {row.map((cell, cellIndex) => <td key={`${index}-${cellIndex}`}>{cell}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </section>
          ))}
          {page.links?.length ? (
            <nav className="seo-related" aria-label="本頁相關入口">
              <h2>相關頁面</h2>
              <ul>
                {page.links.map((link) => (
                  <li key={`${link.href}-${link.label}`}>
                    <a href={link.href}>
                      {link.label}
                      {link.href.startsWith("http") ? <ExternalLink size={14} aria-hidden="true" /> : null}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
        </article>
      </main>
      <footer className="seo-site-map" aria-label="網站地圖">
        {NAV_GROUPS.map((group) => (
          <section key={group.label}>
            <h2>{group.label}</h2>
            <ul>
              {group.links.map((link) => <li key={link.href}><a href={link.href}>{link.label}</a></li>)}
            </ul>
          </section>
        ))}
      </footer>
    </div>
  );
}
