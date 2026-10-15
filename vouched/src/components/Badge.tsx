import { LEVEL_LABELS, type AssuranceLevel } from "@/lib/assurance";

const SHORT: Record<AssuranceLevel, string> = {
  0: "Self-reported",
  1: "Person-confirmed",
  2: "Org-confirmed",
};

/** Level is carried by icon and words, never by color alone. */
export function LevelBadge({ level, short = false }: { level: AssuranceLevel; short?: boolean }) {
  const styles: Record<AssuranceLevel, string> = {
    2: "bg-brand-soft text-brand border-transparent",
    1: "bg-surface text-ink border-line",
    0: "bg-surface-2 text-muted border-transparent",
  };
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${styles[level]}`}
      title={LEVEL_LABELS[level]}
    >
      <LevelIcon level={level} />
      {short ? SHORT[level] : LEVEL_LABELS[level]}
    </span>
  );
}

export function LevelIcon({ level, size = 14 }: { level: AssuranceLevel; size?: number }) {
  if (level === 2) {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
        <path d="M8 1.2 13.5 3v4.4c0 3.3-2.3 6.1-5.5 7.4C4.8 13.5 2.5 10.7 2.5 7.4V3L8 1.2Z" fill="currentColor" />
        <path d="m5.4 8 1.8 1.8 3.4-3.6" stroke="var(--surface)" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (level === 1) {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="6.2" stroke="currentColor" strokeWidth="1.4" fill="none" />
        <path d="m5.4 8.1 1.8 1.8 3.4-3.6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="6.2" stroke="currentColor" strokeWidth="1.4" fill="none" strokeDasharray="2.5 2" />
      <path d="M5.5 8h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
