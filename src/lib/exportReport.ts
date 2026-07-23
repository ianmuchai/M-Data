import type { AnalyticsResponse, BreakdownRow } from '../../shared/analytics';
import { openPrintablePdfReport } from './printablePdf';

type ExportFormat = 'csv' | 'json' | 'pdf';

const csvColumns: Array<{ key: keyof BreakdownRow; label: string }> = [
  { key: 'name', label: 'Business segment' },
  { key: 'users', label: 'Activity volume' },
  { key: 'conversion', label: 'Success rate' },
  { key: 'revenue', label: 'Revenue impact' },
  { key: 'latency', label: 'Service delay' },
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

function downloadDashboardPdf(data: AnalyticsResponse, basename: string) {
  openPrintablePdfReport({
    fileName: basename,
    generatedAt: new Date(data.generatedAt).toLocaleString(),
    subtitle: `Score ${data.summary.score} against target ${data.summary.target}. ${data.summary.recommendation}`,
    title: `Dashboard analytics - ${data.selectedCategory} / ${data.selectedRange}`,
    sections: [
      {
        title: 'Executive metrics',
        body: 'A PDF summary of the current dashboard analytics, including top metrics, trend evidence, alerts, and segment performance.',
        cards: data.metrics.map((metric) => ({ label: metric.label, value: metric.value, detail: `${metric.delta} | ${metric.sentiment}` })),
      },
      {
        title: 'Insights and alerts',
        bullets: [
          ...data.insights.map((insight) => `${insight.label}: ${insight.value}`),
          ...data.alerts.map((alert) => `${alert.title}: ${alert.detail}`),
        ],
      },
      {
        title: 'Trend and segment tables',
        tables: [
          {
            title: 'Trend values',
            columns: ['Period', 'Value'],
            rows: data.trend.map((point) => [point.name, point.value]),
          },
          {
            title: 'Segment performance table',
            columns: csvColumns.map((column) => column.label),
            rows: data.breakdown.map((row) => csvColumns.map((column) => row[column.key])),
          },
        ],
      },
    ],
  });
}

export function exportAnalytics(data: AnalyticsResponse, format: ExportFormat) {
  const date = new Date(data.generatedAt).toISOString().slice(0, 10);
  const basename = `bizdata-${data.selectedCategory}-${data.selectedRange}-${date}`;

  if (format === 'json') {
    downloadFile(JSON.stringify(data, null, 2), `${basename}.json`, 'application/json');
    return;
  }

  if (format === 'pdf') {
    downloadDashboardPdf(data, basename);
    return;
  }

  downloadFile(buildBreakdownCsv(data.breakdown), `${basename}.csv`, 'text/csv');
}
