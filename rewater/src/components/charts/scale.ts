/** Rounded axis ticks from min to max (min may be negative). */
export function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) {
    max = min + 1;
  }
  const span = max - min;
  const rawStep = span / count;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  const step = (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10) * magnitude;
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= end + step / 2; v += step) {
    ticks.push(Number(v.toPrecision(12)));
  }
  return ticks;
}

export function linear(domain: [number, number], range: [number, number]) {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const k = d1 === d0 ? 0 : (r1 - r0) / (d1 - d0);
  return (v: number) => r0 + (v - d0) * k;
}

/** Pick x-axis label positions so labels never crowd: roughly one per `minGap` px. */
export function labelEvery(count: number, plotWidth: number, minGap = 64): number {
  if (count <= 1) return 1;
  const fit = Math.max(1, Math.floor(plotWidth / minGap));
  const raw = Math.ceil(count / fit);
  for (const step of [1, 2, 3, 4, 6, 12, 24]) {
    if (step >= raw) return step;
  }
  return raw;
}
