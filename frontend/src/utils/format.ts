/**
 * Safe date formatting helpers (never fabricate missing timestamps).
 */
export function formatDateSafe(value?: string | null): string {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatTermPeriod(startDate?: string | null, endDate?: string | null): string {
  const start = formatDateSafe(startDate);
  const end = formatDateSafe(endDate);
  if (start === '—' && end === '—') return '—';
  if (end === '—') return start;
  return `${start} – ${end}`;
}
