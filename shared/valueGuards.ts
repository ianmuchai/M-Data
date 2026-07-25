const missingBusinessLabels = new Set([
  '',
  'blank',
  '(blank)',
  '[blank]',
  '{blank}',
  '<blank>',
  'n/a',
  '#n/a',
  'na',
  'n.a.',
  'null',
  'undefined',
  'nan',
  '-',
  '--',
  'none',
  'missing',
  'not applicable',
  'not available',
  'not provided',
  'not specified',
  'unknown',
]);

export function stringifyCell(value: unknown): string {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

function normalizeBusinessLabel(value: unknown): string {
  return stringifyCell(value)
    .toLowerCase()
    .replace(/[\u00a0\s]+/g, ' ')
    .trim();
}

export function isMissingBusinessValue(value: unknown): boolean {
  const normalized = normalizeBusinessLabel(value);
  if (missingBusinessLabels.has(normalized)) return true;

  const unwrapped = normalized.replace(/^[([{<]+\s*/, '').replace(/\s*[\])}>]+$/, '').trim();
  return missingBusinessLabels.has(unwrapped);
}

export function hasBusinessValue(value: unknown): boolean {
  return !isMissingBusinessValue(value);
}

export function businessValueOrNull(value: unknown): string | null {
  const text = stringifyCell(value);
  return isMissingBusinessValue(text) ? null : text;
}