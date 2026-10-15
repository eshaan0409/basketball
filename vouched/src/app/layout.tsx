import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/config/site";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: site.name, template: `%s · ${site.name}` },
  description: site.tagline,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <header className="no-print border-b border-line bg-surface">
          <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold text-ink">
              <span aria-hidden="true" className="inline-block h-5 w-5 rounded-md bg-brand" />
              {site.name}
            </Link>
            <div className="flex items-center gap-4 text-sm sm:gap-6">
              {site.nav.map((item) => (
                <Link key={item.href} href={item.href} className="text-ink-2 hover:text-ink">
                  {item.label}
                </Link>
              ))}
              {site.cta && (
                <Link href={site.cta.href} className="rounded-md bg-brand px-3 py-1.5 font-medium text-brand-ink hover:opacity-90">
                  {site.cta.label}
                </Link>
              )}
            </div>
          </nav>
        </header>
        <main>{children}</main>
        <footer className="no-print mt-24 border-t border-line">
          <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted sm:px-6">{site.footerNote}</div>
        </footer>
      </body>
    </html>
  );
}
