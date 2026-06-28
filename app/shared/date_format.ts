export function formatMonthToIsoDate(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const monthMatch = trimmed.match(/^(\d{4})-(\d{2})$/);
  if (!monthMatch) {
    return null;
  }

  const [, year, month] = monthMatch;
  return `${year}-${month}-01T00:00:00.000Z`;
}

export function parseYear(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) {
    return 0;
  }

  const year = Number(trimmed.split("-")[0]);
  return Number.isFinite(year) ? year : 0;
}
