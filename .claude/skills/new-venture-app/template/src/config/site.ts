export const site = {
  name: "__TITLE__",
  tagline: "__TAGLINE__",
  /** Leave empty to hide contact buttons until a real inbox exists. Never put a placeholder address here. */
  contactEmail: "",
  nav: [] as { href: string; label: string }[],
  cta: null as { href: string; label: string } | null,
  footerNote: "__TITLE__ is an early prototype. Anything labeled demo or simulated is not real data.",
};
