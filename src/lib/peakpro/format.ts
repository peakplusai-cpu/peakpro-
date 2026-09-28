export function formatPx(value: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency === 'TWD' ? 'TWD' : 'USD',
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value);
}

export function formatCap(value: number | undefined, currency: string) {
  if (!value || value <= 0) return null;
  const unit =
    value >= 1_000_000_000_000
      ? { n: value / 1_000_000_000_000, s: 'T' }
      : value >= 1_000_000_000
        ? { n: value / 1_000_000_000, s: 'B' }
        : { n: value / 1_000_000, s: 'M' };
  return `${currency === 'TWD' ? 'NT$' : '$'}${unit.n.toFixed(1)}${unit.s}`;
}

export function formatPct(value: number) {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}
