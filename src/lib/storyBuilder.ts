import { openPrintablePdfReport } from './printablePdf';
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
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'bizdata-story';
}

function escapeHtml(value: string | number | undefined) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function sourceTitle(source: VisualStorySource, dashboard: AnalyticsResponse | null, upload: UploadAnalysisResponse | null) {
  if (source === 'upload' && upload) return upload.fileName;
  return dashboard ? 'Executive dashboard' : 'BizDATA report';
}

function readyResults(upload: UploadAnalysisResponse | null) {
  return upload?.advancedAnalytics.results.filter((result) => result.status === 'ready') ?? [];
}

function primaryResult(upload: UploadAnalysisResponse | null) {
  return readyResults(upload).find((result) => result.series.length || result.rows.length || result.metrics.length) ?? null;
}

function uploadSeries(upload: UploadAnalysisResponse | null, metric: string, dimension: string): AdvancedAnalysisSeriesPoint[] {
  if (!upload) return [];
  const metricColumn = upload.columns.find((column) => column.name === metric && column.type === 'number') ?? upload.columns.find((column) => column.type === 'number');
  const dimensionColumn = upload.columns.find((column) => column.name === dimension) ?? upload.columns.find((column) => column.type !== 'number');
  if (!metricColumn || !dimensionColumn) return readyResults(upload).flatMap((result) => result.series).slice(0, 12);

  const groups = new Map<string, number>();
  for (const row of upload.analysisRows) {
    const label = row[dimensionColumn.name] || 'Blank';
    const value = Number(String(row[metricColumn.name] ?? '').replace(/[$,%\s]/g, ''));
    if (!Number.isFinite(value)) continue;
    groups.set(label, (groups.get(label) ?? 0) + value);
  }

  return Array.from(groups.entries())
    .map(([name, value]) => ({ kind: 'actual' as const, name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 12);
}

function uploadRows(upload: UploadAnalysisResponse | null): AdvancedAnalysisRow[] {
  if (!upload) return [];
  const resultRows = readyResults(upload).flatMap((result) => result.rows.slice(0, 6));
  if (resultRows.length) return resultRows.slice(0, 12);
  return upload.columns.slice(0, 12).map((column) => ({ label: column.name, cells: { type: column.type, missing: column.missing, unique: column.unique } }));
}

function uploadInsights(upload: UploadAnalysisResponse | null) {
  if (!upload) return [];
  return [
    ...upload.businessQuestions.slice(0, 6).map((question) => `${question.question} ${question.answer}`),
    ...readyResults(upload).slice(0, 4).map((result) => `${result.title}: ${result.summary}`),
    ...upload.recommendations.slice(0, 6),
  ].filter(Boolean).slice(0, 12);
}

export function buildVisualStoryPreview({ config, dashboard, upload }: StoryInput): VisualStoryPreview {
  if (config.source === 'upload' && upload) {
    const result = primaryResult(upload);
    const series = uploadSeries(upload, config.metric, config.dimension);
    return {
      insights: uploadInsights(upload),
      metrics: upload.metrics,
      rows: uploadRows(upload),
      series: series.length ? series : result?.series.slice(0, 12) ?? [],
      subtitle: `${config.preset} ${config.visualType} using ${config.metric} by ${config.dimension}. Includes business questions, methods, columns, risks, and recommendations.`,
      title: `${upload.fileName} analytics story`,
    };
  }

  return {
    insights: dashboard ? [dashboard.summary.recommendation, ...dashboard.alerts.map((alert) => alert.detail), ...dashboard.detailPoints.map((detail) => detail.caption)].slice(0, 10) : ['Dashboard data is still loading.'],
    metrics: dashboard?.metrics ?? [],
    rows: dashboard?.breakdown.map((row) => ({ label: row.name, cells: { conversion: row.conversion, latency: row.latency, revenue: row.revenue, users: row.users } })) ?? [],
    series: dashboard?.trend.map((point) => ({ comparison: point.target, kind: 'actual', name: point.name, value: point.value })) ?? [],
    subtitle: `${config.preset} ${config.visualType} view using ${config.metric} by ${config.dimension}.`,
    title: 'Executive dashboard visual story',
  };
}

function slide(id: string, section: string, title: string, subtitle: string, narrative: string, metrics: Metric[], bullets: string[], visualPoints: AdvancedAnalysisSeriesPoint[], recommendations: string[]): PresentationSlide {
  return { bullets, id, metrics, narrative, recommendations, section, subtitle, title, visualPoints };
}

function advancedMetricsToMetrics(metrics: Array<{ label: string; value: string; sentiment: Metric['sentiment'] }>): Metric[] {
  return metrics.map((metric) => ({ delta: 'analysis', label: metric.label, sentiment: metric.sentiment, value: metric.value }));
}

function presetIntro(preset: PresentationPreset) {
  const copy: Record<PresentationPreset, string> = {
    analyst: 'A detailed analytical story with method evidence, field behavior, assumptions, and data quality context.',
    board: 'A board-ready story focused on performance, risk, confidence, and decisions required.',
    executive: 'A decision-ready story focused on outcomes, movement, priorities, and business action.',
    operations: 'An operational story focused on exceptions, bottlenecks, ownership, and next actions.',
  };
  return copy[preset];
}

function methodBullets(upload: UploadAnalysisResponse | null) {
  if (!upload) return ['No uploaded workbook methods available yet.'];
  return upload.advancedAnalytics.methods.map((method) => `${method.title}: ${method.enabled ? `ready using ${method.suggestedFields.join(', ') || 'available fields'}` : method.disabledReason}`).slice(0, 9);
}

function businessQuestionBullets(upload: UploadAnalysisResponse | null) {
  if (!upload?.businessQuestions.length) return ['No uploaded business questions are available yet.'];
  return upload.businessQuestions.slice(0, 8).map((question) => `${question.question} Answer: ${question.answer} Recommendation: ${question.recommendation}`);
}

function columnBullets(upload: UploadAnalysisResponse | null) {
  if (!upload) return ['No uploaded column profile is available yet.'];
  return upload.columnAnalyses.slice(0, 8).map((column) => `${column.name}: ${column.summary} ${column.recommendations[0] ?? ''}`);
}

function riskBullets(upload: UploadAnalysisResponse | null, dashboard: AnalyticsResponse | null) {
  if (upload) {
    return [
      ...upload.signals.map((signal) => `${signal.title}: ${signal.detail}`),
      ...upload.marketSignals.map((signal) => `${signal.title}: ${signal.confidence}% confidence; fields ${signal.matchedFields.join(', ') || 'not listed'}; parameters ${signal.recommendedParameters.join(', ') || 'not listed'}`),
    ].slice(0, 8);
  }
  return dashboard?.alerts.map((alert) => `${alert.title}: ${alert.detail}`) ?? ['No alerts available yet.'];
}

export function buildPresentationDeck({ config, dashboard, upload }: StoryInput): PresentationDeck {
  const preview = buildVisualStoryPreview({ config, dashboard, upload });
  const result = config.source === 'upload' ? primaryResult(upload) : null;
  const results = readyResults(upload);
  const deckTitle = `${sourceTitle(config.source, dashboard, upload)} presentation`;
  const recommendations = upload?.recommendations ?? preview.insights;

  const slides: PresentationSlide[] = [
    slide(
      'summary',
      'Executive Summary',
      deckTitle,
      presetIntro(config.preset),
      preview.insights[0] ?? 'BizDATA prepared this presentation from the available analytics.',
      preview.metrics.slice(0, 4),
      preview.insights.slice(0, 6),
      preview.series.slice(0, 12),
      recommendations.slice(0, 5),
    ),
    slide(
      'business-questions',
      'Business Questions',
      'The practical questions this dataset answers',
      upload ? `${upload.businessQuestions.length} generated business answers with confidence scoring and evidence.` : 'Dashboard business signals and alerts.',
      'This section turns the raw analysis into management questions, evidence, and action.',
      upload?.businessQuestions.slice(0, 4).map((question) => ({ delta: `${question.confidence}% confidence`, label: question.question.slice(0, 42), sentiment: 'positive', value: question.evidence[0]?.value ?? 'review' })) ?? preview.metrics.slice(0, 4),
      businessQuestionBullets(upload),
      preview.series.slice(0, 12),
      recommendations.slice(0, 5),
    ),
    slide(
      'methods',
      'Analytics Coverage',
      'Methods available and what they contribute',
      results.length ? `${results.length} analytical methods produced ready results.` : 'Available analytical methods are listed with readiness notes.',
      'Use this slide to show that the presentation is based on multiple analytical lenses, not a single chart.',
      results.flatMap((item) => advancedMetricsToMetrics(item.metrics)).slice(0, 6),
      methodBullets(upload),
      results.flatMap((item) => item.series).slice(0, 12),
      results.flatMap((item) => item.recommendations).slice(0, 6),
    ),
    slide(
      'visual-evidence',
      'Visual Evidence',
      preview.title,
      preview.subtitle,
      'This slide provides the main chart-ready evidence used in the presentation preview.',
      preview.metrics.slice(0, 4),
      preview.rows.slice(0, 8).map((row) => `${row.label}: ${Object.values(row.cells).join(' | ')}`),
      preview.series.slice(0, 12),
      preview.insights.slice(0, 5),
    ),
    slide(
      'data-quality',
      'Data Quality and Fields',
      upload ? `${upload.fileName} readiness` : 'Dashboard readiness',
      upload ? `${upload.rowCount.toLocaleString('en-US')} rows, ${upload.columnCount.toLocaleString('en-US')} columns, ${upload.qualityScore}/100 quality score.` : 'Built-in dashboard data is available for reporting.',
      'This slide explains whether the analysis is reliable enough for decisions and which fields matter most.',
      upload?.metrics ?? dashboard?.metrics ?? [],
      columnBullets(upload),
      [],
      upload?.recommendations.slice(0, 5) ?? [],
    ),
    slide(
      'risk',
      'Risks and Exceptions',
      'Signals that need attention',
      'Data quality, operational, accounting, market, and confidence signals that may affect decisions.',
      'Use this slide to prevent the presentation from hiding uncertainty, exceptions, or follow-up work.',
      upload?.metrics.slice(0, 4) ?? dashboard?.metrics ?? [],
      riskBullets(upload, dashboard),
      result?.series.slice(0, 12) ?? [],
      recommendations.slice(0, 6),
    ),
    slide(
      'recommendations',
      'Recommendations',
      'What to do next',
      'Prioritized actions generated from business questions, analytical methods, data quality, and detected signals.',
      'Use these recommendations to turn the analysis into concrete owners, reviews, and decisions.',
      [],
      recommendations.slice(0, 9),
      [],
      recommendations.slice(0, 9),
    ),
  ];

  return {
    generatedAt: new Date().toISOString(),
    preset: config.preset,
    slides,
    source: config.source,
    subtitle: `${config.narrativeStyle} narrative with ${config.theme} theme | ${slides.length} slides | built from all available analytics`,
    title: deckTitle,
  };
}

export function downloadStoryConfig(config: VisualStoryConfig) {
  downloadBlob('bizdata-visual-story-config.json', JSON.stringify(config, null, 2), 'application/json');
}

export function downloadPresentationOutline(deck: PresentationDeck) {
  downloadBlob(`${safeName(deck.title)}-outline.json`, JSON.stringify(deck, null, 2), 'application/json');
}

export function downloadPresentationPdf(deck: PresentationDeck) {
  openPrintablePdfReport({
    fileName: `${safeName(deck.title)}-presentation`,
    generatedAt: new Date(deck.generatedAt).toLocaleString(),
    subtitle: deck.subtitle,
    title: deck.title,
    sections: deck.slides.map((item) => ({
      title: item.title,
      body: `${item.subtitle}. ${item.narrative}`,
      bullets: [...item.bullets, ...item.recommendations.map((recommendation) => `Recommendation: ${recommendation}`)].slice(0, 14),
      cards: item.metrics.map((metric) => ({ label: metric.label, value: metric.value, detail: metric.delta })),
      tables: item.visualPoints.length
        ? [{ title: `${item.section} visual data`, columns: ['Name', 'Value', 'Comparison'], rows: item.visualPoints.map((point) => [point.name, point.value, point.comparison ?? '']) }]
        : [],
    })),
  });
}

export function downloadPresentationHtml(deck: PresentationDeck) {
  const slides = deck.slides.map((item) => `
    <section class="slide">
      <p class="eyebrow">${escapeHtml(item.section)}</p>
      <h1>${escapeHtml(item.title)}</h1>
      <h2>${escapeHtml(item.subtitle)}</h2>
      <p class="narrative">${escapeHtml(item.narrative)}</p>
      <div class="metrics">${item.metrics.map((metric) => `<article><span>${escapeHtml(metric.label)}</span><strong>${escapeHtml(metric.value)}</strong><small>${escapeHtml(metric.delta)}</small></article>`).join('')}</div>
      <ul>${item.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join('')}</ul>
      ${item.recommendations.length ? `<h3>Recommended action</h3><ul>${item.recommendations.map((recommendation) => `<li>${escapeHtml(recommendation)}</li>`).join('')}</ul>` : ''}
      <div class="line">${item.visualPoints.map((point, index, list) => `<span style="left:${list.length <= 1 ? 50 : (index / (list.length - 1)) * 100}%;bottom:${Math.max(8, Math.min(92, point.value / Math.max(...list.map((entry) => entry.value), 1) * 90))}%" title="${escapeHtml(point.name)}: ${escapeHtml(point.value)}"></span>`).join('')}</div>
    </section>`).join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(deck.title)}</title><style>body{margin:0;background:#eef7fb;color:#0f172a;font-family:Inter,Segoe UI,sans-serif}.deck{display:grid;gap:24px;max-width:1180px;margin:0 auto;padding:32px}.slide{min-height:620px;padding:34px;border:1px solid rgba(15,23,42,.12);border-radius:8px;background:linear-gradient(135deg,#fff,#ecfeff 56%,#eff6ff);box-shadow:0 18px 46px rgba(15,23,42,.12);break-inside:avoid}.eyebrow{color:#0f766e;font-weight:900;text-transform:uppercase}p{color:#64748b}h1{font-size:40px;margin:8px 0}h2{font-size:20px;color:#2563eb}.narrative{font-size:18px;line-height:1.55}.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.metrics article{padding:14px;border-radius:8px;background:#fff}.metrics span,.metrics small{display:block;color:#64748b}.metrics strong{display:block;font-size:24px}.line{position:relative;height:140px;margin-top:20px;border-radius:8px;background:repeating-linear-gradient(0deg,rgba(15,23,42,.08) 0 1px,transparent 1px 34px)}.line span{position:absolute;width:10px;height:10px;border-radius:999px;background:#0f766e;box-shadow:0 0 0 3px #fff}li{margin:8px 0;line-height:1.45}@media print{body{background:#fff}.slide{box-shadow:none}}</style></head><body><main class="deck">${slides}</main></body></html>`;
  downloadBlob(`${safeName(deck.title)}.html`, html, 'text/html');
}
