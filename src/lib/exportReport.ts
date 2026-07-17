import type { AnalyticsResponse, BreakdownRow } from '../../shared/analytics';

type ExportFormat = 'csv' | 'json';

const csvColumns: Array<{ key: keyof BreakdownRow; label: string }> = [
  { key: 'name', label: 'Segment' },
  { key: 'users', label: 'Users' },
  { key: 'conversion', label: 'Conversion' },
  { key: 'revenue', label: 'Revenue' },
  { key: 'latency', label: 'P95 latency' },
];

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeCsv(value: string | number) {
  const text = String(value);
  return text.includes(',') || text.includes('"') || text.includes('\n') ? `"${text.replace(/"/g, '""')}"` : text;
}

function buildBreakdownCsv(rows: BreakdownRow[]) {
  const header = csvColumns.map((column) => column.label).join(',');
  const body = rows.map((row) => csvColumns.map((column) => escapeCsv(row[column.key])).join(','));

  return [header, ...body].join('\n');
}

export function exportAnalytics(data: AnalyticsResponse, format: ExportFormat) {
  const date = new Date(data.generatedAt).toISOString().slice(0, 10);
  const basename = `m-data-${data.selectedCategory}-${data.selectedRange}-${date}`;

  if (format === 'json') {
    downloadFile(JSON.stringify(data, null, 2), `${basename}.json`, 'application/json');
    return;
  }

  downloadFile(buildBreakdownCsv(data.breakdown), `${basename}.csv`, 'text/csv');
}
