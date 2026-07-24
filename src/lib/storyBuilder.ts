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

function comprehensiveFindings(upload: UploadAnalysisResponse | null, dashboard: AnalyticsResponse | null) {
  if (upload) {
    return [
      ...upload.businessQuestions.map((question) => `Business answer: ${question.question} ${question.answer} Recommended action: ${question.recommendation}`),
      ...upload.advancedAnalytics.results.map((result) => `Analytical method: ${result.title}. ${result.summary} ${result.recommendations.join(' ')}`),
      ...upload.analysisOptions.map((option) => `Analysis path: ${option.title}. ${option.description} ${option.insights.map((insight) => insight.detail).join(' ')}`),
      ...upload.columnAnalyses.map((column) => `Column finding: ${column.name}. ${column.summary} ${column.recommendations.join(' ')}`),
      ...upload.filterViews.map((view) => `Filtered spreadsheet view: ${view.title}. ${view.rowCount.toLocaleString('en-US')} records matched by ${view.matchedBy}. ${view.description}`),
      ...upload.signals.map((signal) => `Signal: ${signal.title}. ${signal.detail}`),
      ...upload.marketSignals.map((signal) => `Market signal: ${signal.title}. ${signal.confidence}% confidence using ${signal.matchedFields.join(', ') || 'available fields'}.`),
      ...upload.recommendations.map((recommendation) => `Recommendation: ${recommendation}`),
    ].filter(Boolean);
  }

  if (!dashboard) return ['No findings are available yet.'];
  return [
    `Dashboard recommendation: ${dashboard.summary.recommendation}`,
    ...dashboard.alerts.map((alert) => `Dashboard alert: ${alert.title}. ${alert.detail}`),
    ...dashboard.detailPoints.map((detail) => `Dashboard detail: ${detail.title}. ${detail.value}. ${detail.caption}`),
  ];
}

export function buildPresentationDeck({ config, dashboard, upload }: StoryInput): PresentationDeck {
  const preview = buildVisualStoryPreview({ config, dashboard, upload });
  const result = config.source === 'upload' ? primaryResult(upload) : null;
  const results = readyResults(upload);
  const deckTitle = `${sourceTitle(config.source, dashboard, upload)} presentation`;
  const recommendations = upload?.recommendations ?? preview.insights;
  const findings = comprehensiveFindings(upload, dashboard);
  const enabledMethods = upload?.advancedAnalytics.methods.filter((method) => method.enabled) ?? [];
  const topQuestions = upload?.businessQuestions.slice(0, 5) ?? [];
  const sourceSummary = upload
    ? `${upload.rowCount.toLocaleString('en-US')} records, ${upload.columnCount.toLocaleString('en-US')} fields, ${upload.qualityScore}/100 quality score.`
    : dashboard ? `Dashboard score ${dashboard.summary.score}/100 with target ${dashboard.summary.target}.` : 'BizDATA generated this deck from the available workspace context.';
  const appendixBullets = [
    ...(upload?.analysisOptions.slice(0, 4).map((option) => `${option.title}: ${option.description}`) ?? []),
    ...(upload?.filterViews.slice(0, 3).map((view) => `${view.title}: ${view.rowCount.toLocaleString('en-US')} records; ${view.description}`) ?? []),
    ...(dashboard?.detailPoints.slice(0, 4).map((detail) => `${detail.title}: ${detail.value} - ${detail.caption}`) ?? []),
  ];

  const slides: PresentationSlide[] = [
    slide(
      'summary',
      '01 / Executive Summary',
      deckTitle,
      presetIntro(config.preset),
      preview.insights[0] ?? 'BizDATA prepared this presentation from the available analytics.',
      preview.metrics.slice(0, 4),
      [sourceSummary, ...findings.slice(0, 5)],
      preview.series.slice(0, 12),
      recommendations.slice(0, 5),
    ),
    slide(
      'agenda',
      '02 / Presentation Roadmap',
      'How to read this analysis deck',
      `${config.preset} audience, ${config.narrativeStyle} explanation depth, ${config.visualType} primary visual style.`,
      'This deck is structured like a decision presentation: context first, then evidence, risks, and recommended action.',
      [
        { delta: `${preview.metrics.length} KPI cards`, label: 'KPI coverage', sentiment: 'positive', value: String(preview.metrics.length) },
        { delta: `${topQuestions.length} priority answers`, label: 'Business questions', sentiment: topQuestions.length ? 'positive' : 'neutral', value: String(topQuestions.length) },
        { delta: `${enabledMethods.length} methods ready`, label: 'Analytics depth', sentiment: enabledMethods.length ? 'positive' : 'warning', value: String(enabledMethods.length) },
        { delta: `${recommendations.length} actions`, label: 'Next steps', sentiment: recommendations.length ? 'positive' : 'neutral', value: String(recommendations.length) },
      ],
      [
        'Executive summary: what matters most and why.',
        'Business questions: practical answers in plain language.',
        'Analytics coverage: regression, correlation, trends, ranking, forecasting, and other ready methods.',
        'Visual evidence: chart-ready movement, comparison, and ranking data.',
        'Risk and recommendations: what to review, decide, assign, or export.',
      ],
      preview.series.slice(0, 12),
      recommendations.slice(0, 4),
    ),
    slide(
      'findings-matrix',
      '03 / Findings Matrix',
      'All findings considered in this presentation',
      `${findings.length.toLocaleString('en-US')} findings were reviewed across business questions, analytics methods, columns, filters, risks, and recommendations.`,
      'This slide shows that the presentation deck is built from the whole analysis set, including filterable spreadsheets and analytical findings.',
      [
        { delta: `${upload?.businessQuestions.length ?? 0} business answers`, label: 'Business findings', sentiment: upload?.businessQuestions.length ? 'positive' : 'neutral', value: String(upload?.businessQuestions.length ?? 0) },
        { delta: `${results.length} ready results`, label: 'Method findings', sentiment: results.length ? 'positive' : 'warning', value: String(results.length) },
        { delta: `${upload?.filterViews.length ?? 0} downloadable views`, label: 'Filtered sheets', sentiment: upload?.filterViews.length ? 'positive' : 'neutral', value: String(upload?.filterViews.length ?? 0) },
        { delta: `${findings.length} total findings`, label: 'Finding pool', sentiment: findings.length ? 'positive' : 'neutral', value: String(findings.length) },
      ],
      findings.slice(0, 10),
      preview.series.slice(0, 12),
      recommendations.slice(0, 6),
    ),
    slide(
      'business-questions',
      '04 / Business Questions',
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
      '05 / Analytics Coverage',
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
      '06 / Visual Evidence',
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
      '07 / Data Quality and Fields',
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
      '08 / Risks and Exceptions',
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
      '09 / Recommendations',
      'What to do next',
      'Prioritized actions generated from business questions, analytical methods, data quality, and detected signals.',
      'Use these recommendations to turn the analysis into concrete owners, reviews, and decisions.',
      [],
      recommendations.slice(0, 9),
      [],
      recommendations.slice(0, 9),
    ),
    slide(
      'appendix',
      '10 / Evidence Appendix',
      'Supporting tables, filters, and analysis views',
      'A backup slide for users who need the exact analytical surfaces behind the story.',
      'Use this appendix when presenting to analysts, finance teams, operations managers, or anyone who needs traceability.',
      results.flatMap((item) => advancedMetricsToMetrics(item.metrics)).slice(0, 4),
      appendixBullets.length ? [...appendixBullets, ...findings].slice(0, 12) : [...findings, ...preview.insights, ...recommendations].slice(0, 12),
      results.flatMap((item) => item.series).slice(0, 12),
      recommendations.slice(0, 6),
    ),
  ];

  return {
    generatedAt: new Date().toISOString(),
    preset: config.preset,
    slides,
    source: config.source,
    subtitle: `${config.narrativeStyle} narrative with ${config.theme} theme | ${slides.length} PowerPoint-style slides | built from all available analytics`,
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
  const slides = deck.slides.map((item, index) => {
    const maxValue = Math.max(...item.visualPoints.map((entry) => entry.value), 1);
    const points = item.visualPoints.map((point, pointIndex, list) => `<span style="left:${list.length <= 1 ? 50 : (pointIndex / (list.length - 1)) * 100}%;bottom:${Math.max(8, Math.min(90, point.value / maxValue * 86))}%" title="${escapeHtml(point.name)}: ${escapeHtml(point.value)}"></span>`).join('');
    return `
    <section class="slide">
      <div class="slide-frame">
        <header><p>${escapeHtml(item.section)}</p><strong>${String(index + 1).padStart(2, '0')} / ${String(deck.slides.length).padStart(2, '0')}</strong></header>
        <main>
          <div class="story-copy">
            <h1>${escapeHtml(item.title)}</h1>
            <h2>${escapeHtml(item.subtitle)}</h2>
            <p class="narrative">${escapeHtml(item.narrative)}</p>
          </div>
          <div class="metrics">${item.metrics.slice(0, 4).map((metric) => `<article><span>${escapeHtml(metric.label)}</span><strong>${escapeHtml(metric.value)}</strong><small>${escapeHtml(metric.delta)}</small></article>`).join('')}</div>
          ${item.visualPoints.length ? `<div class="line">${points}</div>` : ''}
          <div class="content-grid">
            <ul>${item.bullets.slice(0, 8).map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join('')}</ul>
            ${item.recommendations.length ? `<aside><b>Recommended action</b>${item.recommendations.slice(0, 5).map((recommendation) => `<p>${escapeHtml(recommendation)}</p>`).join('')}</aside>` : ''}
          </div>
        </main>
        <footer><span>BizDATA analytics presentation</span><span>${escapeHtml(new Date(deck.generatedAt).toLocaleDateString())}</span></footer>
      </div>
    </section>`;
  }).join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(deck.title)}</title><style>@page{size:landscape;margin:0}*{box-sizing:border-box}body{margin:0;background:#e8f3f5;color:#0f172a;font-family:Inter,Segoe UI,Arial,sans-serif}.deck{display:grid;gap:28px;max-width:1280px;margin:0 auto;padding:32px}.slide{aspect-ratio:16/9;width:100%;break-inside:avoid;page-break-after:always}.slide-frame{position:relative;display:grid;grid-template-rows:auto 1fr auto;min-height:100%;overflow:hidden;border:1px solid rgba(15,23,42,.1);border-radius:10px;background:linear-gradient(135deg,#fff 0 55%,#ecfeff 55% 100%);box-shadow:0 24px 64px rgba(15,23,42,.16)}.slide-frame:before{position:absolute;inset:auto 0 0 0;height:10px;background:linear-gradient(90deg,#0f766e,#2563eb,#f97316);content:""}header,footer{position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;padding:22px 30px}header p{margin:0;color:#0f766e;font-size:12px;font-weight:900;text-transform:uppercase}header strong,footer{color:#64748b;font-size:12px;font-weight:800}main{position:relative;z-index:1;display:grid;grid-template-columns:1.2fr .8fr;grid-template-rows:auto auto 1fr;gap:18px;padding:0 30px 24px}.story-copy{grid-column:1 / 2}.story-copy h1{margin:0;color:#0f172a;font-size:38px;line-height:1.05}.story-copy h2{margin:10px 0 0;color:#2563eb;font-size:17px;line-height:1.25}.narrative{margin:18px 0 0;color:#334155;font-size:17px;line-height:1.5}.metrics{grid-column:2 / 3;grid-row:1 / 3;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.metrics article{min-height:96px;border:1px solid rgba(15,118,110,.12);border-radius:8px;padding:13px;background:rgba(255,255,255,.9)}.metrics span,.metrics small{display:block;color:#64748b;font-size:12px;font-weight:800}.metrics strong{display:block;margin:7px 0;color:#0f172a;font-size:24px;line-height:1.05}.line{grid-column:1 / 2;position:relative;height:150px;border:1px solid rgba(37,99,235,.12);border-radius:8px;background:repeating-linear-gradient(0deg,rgba(15,23,42,.07) 0 1px,transparent 1px 34px),linear-gradient(135deg,#ffffff,#eff6ff)}.line span{position:absolute;width:11px;height:11px;border-radius:999px;background:#0f766e;box-shadow:0 0 0 4px #fff}.content-grid{grid-column:1 / 3;display:grid;grid-template-columns:1.2fr .8fr;gap:16px;align-items:start}ul{margin:0;padding-left:20px}li{margin:7px 0;color:#334155;font-size:14px;line-height:1.38}aside{border-left:4px solid #f97316;border-radius:8px;padding:12px 14px;background:rgba(255,247,237,.92)}aside b{display:block;margin-bottom:6px;color:#9a3412;font-size:12px;text-transform:uppercase}aside p{margin:6px 0;color:#334155;font-size:13px;line-height:1.35}footer{padding-top:0}@media print{body{background:#fff}.deck{display:block;max-width:none;padding:0}.slide{width:100vw;height:100vh}.slide-frame{border:0;border-radius:0;box-shadow:none}}@media(max-width:760px){.deck{padding:14px}.slide{aspect-ratio:auto}.slide-frame{min-height:720px}main,.content-grid{grid-template-columns:1fr}.metrics,.story-copy,.line,.content-grid{grid-column:1}.metrics{grid-row:auto}.story-copy h1{font-size:28px}}</style></head><body><main class="deck">${slides}</main></body></html>`;
  downloadBlob(`${safeName(deck.title)}.html`, html, 'text/html');
}
