import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WebBooking } from "@/components/WebBooking";
import { ready } from "@/lib/http";
import { formatPhone } from "@/lib/replies";
import { dayName, formatClock } from "@/lib/time";
import type { Category, Shop } from "@/lib/types";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string): Promise<Shop | null> {
  const db = await ready();
  return (await db.read((d) => d.shops.find((s) => s.slug === slug && s.published))) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const shop = await load((await params).slug);
  return shop ? { title: shop.name, description: `${shop.category} in ${shop.address.city}. Book through Doorbell.` } : {};
}

const SCHEMA_TYPE: Partial<Record<Category, string>> = {
  "Auto repair": "AutoRepair",
  "Tire shop": "TireShop",
  Barbershop: "HairSalon",
  "Hair salon": "HairSalon",
  "Nail salon": "NailSalon",
};

/** schema.org markup so search engines and AI crawlers can read hours and services without the API. */
function jsonLd(shop: Shop) {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return {
    "@context": "https://schema.org",
    "@type": SCHEMA_TYPE[shop.category] ?? "LocalBusiness",
    name: shop.name,
    description: shop.description,
    telephone: shop.phone,
    address: {
      "@type": "PostalAddress",
      streetAddress: shop.address.street,
      addressLocality: shop.address.city,
      addressRegion: shop.address.state,
      postalCode: shop.address.zip,
    },
    openingHoursSpecification: shop.hours.flatMap((intervals, i) =>
      intervals.map((iv) => ({ "@type": "OpeningHoursSpecification", dayOfWeek: days[i], opens: iv.open, closes: iv.close })),
    ),
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Services",
      itemListElement: shop.services.map((s) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: s.name, description: s.description || undefined },
        description: s.priceText || undefined,
      })),
    },
  };
}

export default async function ShopPage({ params }: Props) {
  const shop = await load((await params).slug);
  if (!shop) notFound();
  const address = [shop.address.street, shop.address.city, shop.address.state, shop.address.zip].filter(Boolean).join(", ");

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-12 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(shop)).replace(/</g, "\\u003c") }} />
      {shop.demo && (
        <p className="rounded-lg border border-line bg-warn-bg px-4 py-3 text-sm text-warn-ink">
          Demo shop. It isn&apos;t real, and booking texts go to the on-screen phone on the demo page.
        </p>
      )}
      <header className="flex flex-col gap-2">
        <p className="text-sm font-medium text-brand">{shop.category}</p>
        <h1 className="text-3xl font-semibold tracking-tight">{shop.name}</h1>
        <p className="text-ink-2">{address}</p>
        <p>
          <a href={`tel:${shop.phone}`} className="font-medium text-brand underline-offset-2 hover:underline">
            {formatPhone(shop.phone)}
          </a>
        </p>
        {shop.description && <p className="max-w-2xl text-[15px] text-ink-2">{shop.description}</p>}
      </header>

      <div className="grid gap-6 md:grid-cols-[1.3fr_1fr]">
        <section className="flex min-w-0 flex-col gap-3 rounded-xl border border-line bg-surface p-5">
          <h2 className="font-semibold">Services</h2>
          <ul className="flex flex-col divide-y divide-line">
            {shop.services.map((s) => (
              <li key={s.id} className="flex items-baseline justify-between gap-4 py-2.5">
                <span>
                  <span className="font-medium">{s.name}</span>
                  <span className="text-sm text-muted"> · {s.durationMinutes} min</span>
                  {s.description && <span className="block text-sm text-ink-2">{s.description}</span>}
                </span>
                <span className="tabular shrink-0 text-ink-2">{s.priceText}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-5">
          <h2 className="font-semibold">Hours</h2>
          <table className="text-[15px]">
            <tbody>
              {shop.hours.map((intervals, i) => (
                <tr key={i}>
                  <th scope="row" className="py-1 pr-4 text-left font-normal text-ink-2">
                    {dayName(i, true)}
                  </th>
                  <td className="tabular py-1">
                    {intervals.length === 0 ? <span className="text-muted">Closed</span> : intervals.map((iv) => `${formatClock(iv.open)}–${formatClock(iv.close)}`).join(", ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <section className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-5">
        <h2 className="font-semibold">Request a time</h2>
        <p className="text-sm text-ink-2">
          Or ask your AI assistant to book it. {shop.name} confirms every request by text, usually within{" "}
          {shop.replyWindowMinutes} minutes.
        </p>
        <WebBooking slug={shop.slug} services={shop.services.map((s) => ({ id: s.id, name: s.name, priceText: s.priceText }))} />
      </section>
    </div>
  );
}
