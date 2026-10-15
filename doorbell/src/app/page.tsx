import { site } from "@/config/site";

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-semibold tracking-tight">{site.name}</h1>
      <p className="mt-4 max-w-xl text-lg text-ink-2">{site.tagline}</p>
    </div>
  );
}
