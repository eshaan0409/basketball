export const site = {
  name: "Vouched",
  tagline: "Your activities, verified by the people who saw you do them.",
  /** Leave empty to hide contact buttons until a real inbox exists. Never put a placeholder address here. */
  contactEmail: "",
  nav: [
    { href: "/demo", label: "Example" },
    { href: "/colleges", label: "For colleges" },
  ] as { href: string; label: string }[],
  cta: { href: "/record", label: "Your record" } as { href: string; label: string } | null,
  footerNote: "Vouched is an early prototype. The example record is fictional. Student records are private unless the student shares a link.",
};
