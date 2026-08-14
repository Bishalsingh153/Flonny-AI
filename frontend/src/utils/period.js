export function toIso(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function getPeriodRange(preset, customStart, customEnd) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  if (preset === 'last_month') {
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0);
    return { start: toIso(start), end: toIso(end) };
  }
  if (preset === 'custom' && customStart && customEnd) {
    return { start: customStart, end: customEnd };
  }
  return { start: toIso(new Date(y, m, 1)), end: toIso(now) };
}

export function inPeriod(date, range) {
  if (!date || !range) return true;
  return date >= range.start && date <= range.end;
}

export function monthLabel(preset, range) {
  if (preset === 'this_month') return 'This month';
  if (preset === 'last_month') return 'Last month';
  return `${range.start} → ${range.end}`;
}
