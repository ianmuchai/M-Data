import type {
  AdvancedAnalysisRow,
  AdvancedAnalysisSeriesPoint,
  AnalyticsResponse,
  Metric,
  PresentationDeck,
  PresentationPreset,
  PresentationSlide,
  UploadAnalysisResponse,
  VisualStoryConfig,
  VisualStorySource,
} from '../../shared/analytics';

type StoryInput = {
  dashboard: AnalyticsResponse | null;
  upload: UploadAnalysisResponse | null;
  config: VisualStoryConfig;
};

export type VisualStoryPreview = {
  title: string;
  subtitle: string;
  metrics: Metric[];
  series: AdvancedAnalysisSeriesPoint[];
  rows: AdvancedAnalysisRow[];
  insights: string[];
};

function downloadBlob(fileName: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function safeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'm-data-story';
}

function sourceTitle(source: VisualStorySource, dashboard: AnalyticsResponse | null, upload: UploadAnalysisResponse | null) {
  if (source === 'upload' && upload) return upload.fileName;
  return dashboard ? 'Executive dashboard' : 'M-Data report';
}

function uploadResult(upload: UploadAnalysisResponse | null) {
  return upload?.advancedAnalytics.results.find((result) => result.status === 'ready' && (result.series.length || result.rows.length)) ?? null;
}

export function buildVisualStoryPreview({ config, dashboard, upload }: StoryInput): VisualStoryPreview {
  if (config.source === 'upload' && upload) {
    const result = uploadResult(upload);
    return {
      insights: [result?.summary, ...upload.recommendations].filter((value): value is string => Boolean(value)).slice(0, 5),
      metrics: upload.metrics,
      rows: result?.rows ?? upload.columns.slice(0, 12).map((column) => ({ label: column.name, cells: { missing: column.missing, type: column.type, unique: column.unique } })),
      series: result?.series ?? upload.advancedAnalytics.results.flatMap((item) => item.series).slice(0, 12),
      subtitle: `${config.preset} ${config.visualType} view using ${config.metric} by ${config.dimension}`,
      title: `${upload.fileName} visual story`,
    };
  }

  return {
    insights: dashboard ? [dashboard.summary.recommendation, ...dashboard.alerts.map((alert) => alert.detail)].slice(0, 5) : ['Dashboard data is still loading.'],
    metrics: dashboard?.metrics ?? [],
    rows: dashboard?.breakdown.map((row) => ({ label: row.name, cells: { conversion: row.conversion, latency: row.latency, revenue: row.revenue, users: row.users } })) ?? [],
    series: dashboard?.trend.map((point) => ({ comparison: point.target, kind: 'actual', name: point.name, value: point.value })) ?? [],
    subtitle: `${config.preset} ${config.visualType} view using ${config.metric} by ${config.dimension}`,
    title: 'Executive dashboard visual story',
  };
}

function slide(id: string, section: string, title: string, subtitle: string, narrative: string, metrics: Metric[], bullets: string[], visualPoints: AdvancedAnalysisSeriesPoint[], recommendations: string[]): PresentationSlide {
  return { bullets, id, metrics, narrative, recommendations, section, subtitle, title, visualPoints };
}

function advancedMetricsToMetrics(metrics: Array<{ label: string; value: string; sentiment: Metric['sentiment'] }>): Metric[] {
  return metrics.map((metric) => ({
    delta: 'analysis',
    label: metric.label,
    sentiment: metric.sentiment,
    value: metric.value,
  }));
}
function presetIntro(preset: PresentationPreset) {
  const copy: Record<PresentationPreset, string> = {
    analyst: 'A detailed analytical story with method signals, field behavior, and data quality context.',
    board: 'A board-ready story focused on performance, confidence, and recommended decisions.',
    executive: 'A concise executive story focused on outcomes, movement, and decisions.',
    operations: 'An operational story focused on exceptions, priorities, and next actions.',
  };
  return copy[preset];
}

export function buildPresentationDeck({ config, dashboard, upload }: StoryInput): PresentationDeck {
  const preview = buildVisualStoryPreview({ config, dashboard, upload });
  const result = config.source === 'upload' ? uploadResult(upload) : null;
  const uploadMetrics = upload?.metrics ?? [];
  const dashboardMetrics = dashboard?.metrics ?? [];
  const deckTitle = `${sourceTitle(config.source, dashboard, upload)} presentation`;

  const slides: PresentationSlide[] = [
    slide(
      'summary',
      'Executive Summary',
      deckTitle,
      presetIntro(config.preset),
      preview.insights[0] ?? 'M-Data prepared this presentation from the available analytics.',
      preview.metrics.slice(0, 4),
      preview.insights.slice(0, 4),
      preview.series.slice(0, 10),
      preview.insights.slice(1, 4),
    ),
    slide(
      'quality',
      'Data Quality',
      upload ? 'Dataset readiness and field confidence' : 'Dashboard readiness',
      upload ? `${upload.rowCount.toLocaleString('en-US')} rows, ${upload.columnCount.toLocaleString('en-US')} columns, ${upload.qualityScore}/100 quality.` : 'Built-in dashboard data is available for reporting.',
      upload ? 'The uploaded dataset was profiled for types, missing values, business roles, and available methods.' : 'The built-in dashboard provides a stable executive reporting source.',
      upload ? uploadMetrics : dashboardMetrics,
      upload ? upload.columns.slice(0, 6).map((column) => `${column.name}: ${column.type}, ${column.missing} missing`) : ['Dashboard metrics are ready for report generation.'],
      [],
      upload?.recommendations.slice(0, 3) ?? [],
    ),
    slide(
      'metrics',
      'Key Metrics',
      'The main numbers to discuss',
      'Use these cards to anchor the conversation before exploring the details.',
      'These are the primary indicators to present before moving into supporting visuals and recommendations.',
      preview.metrics.slice(0, 6),
      preview.metrics.slice(0, 6).map((metric) => `${metric.label}: ${metric.value} (${metric.delta})`),
      preview.series.slice(0, 12),
      preview.insights.slice(0, 3),
    ),
    slide(
      'analysis',
      'Analysis Findings',
      result?.title ?? 'Trends, segments, and comparisons',
      result?.summary ?? dashboard?.summary.recommendation ?? 'M-Data prepared analysis points from the available data.',
      'This slide summarizes the strongest available analysis result and gives the audience supporting evidence.',
      result ? advancedMetricsToMetrics(result.metrics) : preview.metrics.slice(0, 4),
      result?.rows.slice(0, 6).map((row) => `${row.label}: ${Object.values(row.cells).join(' | ')}`) ?? preview.rows.slice(0, 6).map((row) => row.label),
      result?.series.slice(0, 12) ?? preview.series.slice(0, 12),
      result?.recommendations ?? preview.insights.slice(0, 3),
    ),
    slide(
      'recommendations',
      'Recommendations',
      'What to do next',
      'These actions are generated from detected patterns, readiness, and business signals.',
      'Use these recommendations to turn the analysis into concrete follow-up decisions.',
      [],
      (upload?.recommendations ?? preview.insights).slice(0, 6),
      [],
      (upload?.recommendations ?? preview.insights).slice(0, 6),
    ),
  ];

  return {
    generatedAt: new Date().toISOString(),
    preset: config.preset,
    slides,
    source: config.source,
    subtitle: `${config.narrativeStyle} narrative with ${config.theme} theme`,
    title: deckTitle,
  };
}

export function downloadStoryConfig(config: VisualStoryConfig) {
  downloadBlob('m-data-visual-story-config.json', JSON.stringify(config, null, 2), 'application/json');
}

export function downloadPresentationOutline(deck: PresentationDeck) {
  downloadBlob(`${safeName(deck.title)}-outline.json`, JSON.stringify(deck, null, 2), 'application/json');
}

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function downloadPresentationHtml(deck: PresentationDeck) {
  const slides = deck.slides.map((item) => `
    <section class="slide">
      <p>${escapeHtml(item.section)}</p>
      <h1>${escapeHtml(item.title)}</h1>
      <h2>${escapeHtml(item.subtitle)}</h2>
      <p class="narrative">${escapeHtml(item.narrative)}</p>
      <div class="metrics">${item.metrics.map((metric) => `<article><span>${escapeHtml(metric.label)}</span><strong>${escapeHtml(metric.value)}</strong><small>${escapeHtml(metric.delta)}</small></article>`).join('')}</div>
      <ul>${item.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join('')}</ul>
      <div class="bars">${item.visualPoints.map((point) => `<span style="height:${Math.max(12, Math.min(100, point.value))}%" title="${escapeHtml(point.name)}"></span>`).join('')}</div>
    </section>`).join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(deck.title)}</title><style>body{margin:0;background:#eef7fb;color:#0f172a;font-family:Inter,Segoe UI,sans-serif}.deck{display:grid;gap:24px;max-width:1180px;margin:0 auto;padding:32px}.slide{min-height:560px;padding:34px;border:1px solid rgba(15,23,42,.12);border-radius:8px;background:linear-gradient(135deg,#fff,#ecfeff 56%,#eff6ff);box-shadow:0 18px 46px rgba(15,23,42,.12)}p{color:#64748b}h1{font-size:42px;margin:8px 0}h2{font-size:20px;color:#2563eb}.narrative{font-size:18px;line-height:1.55}.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.metrics article{padding:14px;border-radius:8px;background:#fff}.metrics span,.metrics small{display:block;color:#64748b}.metrics strong{display:block;font-size:24px}.bars{display:flex;align-items:end;gap:8px;height:130px;margin-top:20px}.bars span{flex:1;background:linear-gradient(180deg,#7c3aed,#2563eb,#06b6d4);border-radius:6px 6px 0 0}li{margin:8px 0}</style></head><body><main class="deck">${slides}</main></body></html>`;
  downloadBlob(`${safeName(deck.title)}.html`, html, 'text/html');
}



