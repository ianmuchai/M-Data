const missingBusinessLabels = new Set(['', 'blank', 'n/a', 'na', 'null', 'undefined', '-', '--', 'none', 'not applicable']);

export function stringifyCell(value: unknown): string {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

export function isMissingBusinessValue(value: unknown): boolean {
  return missingBusinessLabels.has(stringifyCell(value).toLowerCase());
}

export function hasBusinessValue(value: unknown): boolean {
  return !isMissingBusinessValue(value);
}

export function businessValueOrNull(value: unknown): string | null {
  const text = stringifyCell(value);
  return isMissingBusinessValue(text) ? null : text;
}