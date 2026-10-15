import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/config/site";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: `${site.name}: verified water savings`, template: `%s · ${site.name}` },
  description: site.tagline,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <header className="no-print border-b border-line bg-surface">
          <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold text-ink">
              <Logo />
              {site.name}
            </Link>
            <div className="flex items-center gap-4 text-sm sm:gap-6">
              <Link href="/#how" className="hidden text-ink-2 hover:text-ink sm:inline">
                How it works
              </Link>
              <Link href="/methodology" className="text-ink-2 hover:text-ink">
                Methodology
              </Link>
              <Link
                href="/verify"
                className="rounded-md bg-brand px-3 py-1.5 font-medium text-brand-ink hover:opacity-90"
              >
                Run a verification
              </Link>
            </div>
          </nav>
        </header>
        <main>{children}</main>
        <footer className="no-print mt-24 border-t border-line">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-muted sm:px-6">
            <p>
              {site.name} is an early prototype. Numbers shown on demo pages come from simulated data, not real homes.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}

function Logo() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.5c3.6 4.3 6.5 8 6.5 11.5a6.5 6.5 0 0 1-13 0C5.5 10.5 8.4 6.8 12 2.5Z" fill="var(--brand)" />
      <path d="M8.5 14.5c.4 1.7 1.7 3 3.5 3.3" stroke="var(--brand-ink)" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </svg>
  );
}
