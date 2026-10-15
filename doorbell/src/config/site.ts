export const site = {
  name: "Doorbell",
  tagline: "Let AI assistants book your shop. You answer by text.",
  /** Leave empty to hide contact buttons until a real inbox exists. Never put a placeholder address here. */
  contactEmail: "",
  nav: [
    { href: "/demo", label: "Try the demo" },
    { href: "/agents", label: "For AI assistants" },
  ] as { href: string; label: string }[],
  cta: { href: "/owner", label: "For shops" } as { href: string; label: string } | null,
  footerNote: "Doorbell is an early prototype. Demo shops are fictional and their texts go to an on-screen phone.",
  /** Fee per confirmed booking, shown to owners. null until pricing is decided. */
  feePerConfirmedBooking: null as number | null,
};
