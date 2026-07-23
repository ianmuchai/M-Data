import { useMemo, useState } from 'react';
import type { AnalyticsResponse, PresentationPreset, UploadAnalysisResponse, VisualStoryConfig, VisualStoryType } from '../../shared/analytics';
import {
  buildPresentationDeck,
  buildVisualStoryPreview,
  downloadPresentationHtml,
  downloadPresentationOutline,
  downloadPresentationPdf,
  downloadStoryConfig,
} from '../lib/storyBuilder';

type ReportBuilderProps = {
  dashboard: AnalyticsResponse | null;
  upload: UploadAnalysisResponse | null;
};

const visualTypeOptions: Array<{ key: VisualStoryType; label: string; helper: string }> = [
  { key: 'bar', label: 'Bar chart - compare groups', helper: 'Best for products, branches, customers, categories, suppliers, or regions.' },
  { key: 'line', label: 'Line chart - show change over time', helper: 'Best when dates, weeks, months, or periods matter.' },
  { key: 'area', label: 'Area chart - show volume movement', helper: 'Best for trend size, cumulative movement, demand, or workload.' },
  { key: 'ranking', label: 'Ranking - top and bottom items', helper: 'Best for priority review, leaders, underperformers, and exceptions.' },
  { key: 'comparison', label: 'Comparison - side-by-side groups', helper: 'Best when you need to compare segments or business units.' },
  { key: 'scorecards', label: 'Scorecards - KPI summary', helper: 'Best for executive snapshots and key numbers.' },
  { key: 'table', label: 'Table - inspect exact records', helper: 'Best when users need details, evidence, or downloadable rows.' },
  { key: 'insights', label: 'Insights - key findings', helper: 'Best when the story is more narrative than numeric.' },
];
const presetOptions: Array<{ key: PresentationPreset; label: string; helper: string }> = [
  { key: 'executive', label: 'Executive - decisions and summary', helper: 'Short, direct, focused on what changed and what to decide.' },
  { key: 'analyst', label: 'Analyst - evidence and details', helper: 'More metrics, assumptions, field behavior, and supporting evidence.' },
  { key: 'operations', label: 'Operations - actions and bottlenecks', helper: 'Priorities, exceptions, queues, delays, stock, owners, and next steps.' },
  { key: 'board', label: 'Board - performance and risk', helper: 'High-level performance, confidence, risk, and strategic recommendation.' },
];

export function ReportBuilder({ dashboard, upload }: ReportBuilderProps) {
  const uploadMetricOptions = upload?.columns.filter((column) => column.type === 'number').map((column) => column.name) ?? [];
  const uploadDimensionOptions = upload?.columns.filter((column) => column.type !== 'number').map((column) => column.name) ?? [];
  const [selectedSlideId, setSelectedSlideId] = useState('summary');
  const [config, setConfig] = useState<VisualStoryConfig>({
    dimension: uploadDimensionOptions[0] ?? 'name',
    metric: uploadMetricOptions[0] ?? 'value',
    narrativeStyle: 'guided',
    preset: 'executive',
    source: upload ? 'upload' : 'dashboard',
    theme: 'vibrant',
    visualType: 'bar',
  });

  const metricOptions = config.source === 'upload' && uploadMetricOptions.length ? uploadMetricOptions : ['value', 'revenue', 'conversion', 'users'];
  const dimensionOptions = config.source === 'upload' && uploadDimensionOptions.length ? uploadDimensionOptions : ['name', 'region', 'channel', 'source'];
  const preview = useMemo(() => buildVisualStoryPreview({ config, dashboard, upload }), [config, dashboard, upload]);
  const deck = useMemo(() => buildPresentationDeck({ config, dashboard, upload }), [config, dashboard, upload]);
  const selectedSlide = deck.slides.find((slide) => slide.id === selectedSlideId) ?? deck.slides[0];
  const maxSeries = Math.max(...preview.series.map((point) => point.value), 1);
  const selectedVisual = visualTypeOptions.find((option) => option.key === config.visualType) ?? visualTypeOptions[0];
  const selectedPreset = presetOptions.find((option) => option.key === config.preset) ?? presetOptions[0];

  const update = <K extends keyof VisualStoryConfig>(key: K, value: VisualStoryConfig[K]) => {
    setConfig((current) => ({ ...current, [key]: value }));
  };

  return (
    <section className="report-builder story-builder">
      <div className="panel-header story-header">
        <div>
          <p className="eyebrow">Visual Story Builder</p>
          <h3>Build visualizations and presentation-ready stories from your analyses</h3>
          <span className="panel-subtitle">Choose a source, visual style, and audience. BizDATA prepares a live visual and a slide-style story you can export.</span>
        </div>
        <div className="download-actions">
          <button className="secondary-button" onClick={() => downloadStoryConfig(config)} type="button">Export config</button>
          <button className="secondary-button" onClick={() => downloadPresentationOutline(deck)} type="button">Export outline</button>
          <button className="secondary-button" onClick={() => downloadPresentationPdf(deck)} type="button">Export PDF</button>
          <button className="install-button" onClick={() => downloadPresentationHtml(deck)} type="button">Export HTML</button>
        </div>
      </div>

      <div className="story-builder-grid">
        <aside className="builder-controls story-controls" aria-label="Visual story controls">
          <div className="builder-helper"><strong>Shape the story</strong><span>Use dashboard data for executive reporting or upload data for dataset-specific presentations.</span></div>
          <label>
            <span>Data source</span>
            <select value={config.source} onChange={(event) => update('source', event.target.value as VisualStoryConfig['source'])}>
              <option value="dashboard">Built-in dashboard</option>
              <option value="upload" disabled={!upload}>Latest upload</option>
            </select>
          </label>
          <label>
            <span>Chart style</span>
            <select value={config.visualType} onChange={(event) => update('visualType', event.target.value as VisualStoryType)}>
              {visualTypeOptions.map((type) => <option key={type.key} value={type.key}>{type.label}</option>)}
            </select>
          </label>
          <label>
            <span>Report audience</span>
            <select value={config.preset} onChange={(event) => update('preset', event.target.value as PresentationPreset)}>
              {presetOptions.map((preset) => <option key={preset.key} value={preset.key}>{preset.label}</option>)}
            </select>
          </label>
          <label>
            <span>Metric</span>
            <select value={config.metric} onChange={(event) => update('metric', event.target.value)}>
              {metricOptions.map((metric) => <option key={metric} value={metric}>{metric}</option>)}
            </select>
          </label>
          <label>
            <span>Dimension</span>
            <select value={config.dimension} onChange={(event) => update('dimension', event.target.value)}>
              {dimensionOptions.map((dimension) => <option key={dimension} value={dimension}>{dimension}</option>)}
            </select>
          </label>
          <label>
            <span>Explanation detail</span>
            <select value={config.narrativeStyle} onChange={(event) => update('narrativeStyle', event.target.value as VisualStoryConfig['narrativeStyle'])}>
              <option value="concise">Concise - short and direct</option>
              <option value="guided">Guided - explains the meaning</option>
              <option value="detailed">Detailed - more evidence and context</option>
            </select>
          </label>
        </aside>

        <div className="story-preview-column">
          <section className={`visual-preview ${config.visualType}`} aria-label="Visualization preview">
            <div className="panel-header compact">
              <div>
                <p className="eyebrow">{config.visualType} visualization</p>
                <h3>{preview.title}</h3>
                <span>{preview.subtitle}</span>
              </div>
              <span className="badge">{config.theme}</span>
            </div>

            {config.visualType === 'scorecards' ? (
              <div className="metrics-grid upload-metrics">
                {preview.metrics.slice(0, 4).map((metric) => (
                  <article className="metric-card compact-card" key={metric.label}>
                    <div><p>{metric.label}</p><h3>{metric.value}</h3></div>
                    <span className={`delta ${metric.sentiment}`}>{metric.delta}</span>
                  </article>
                ))}
              </div>
            ) : config.visualType === 'table' ? (
              <div className="analysis-table-scroll">
                <table className="analysis-table compact-analysis-table">
                  <thead><tr><th className="align-left">Item</th><th>Details</th></tr></thead>
                  <tbody>{preview.rows.slice(0, 8).map((row) => <tr key={row.label}><td>{row.label}</td><td>{Object.values(row.cells).join(' | ')}</td></tr>)}</tbody>
                </table>
              </div>
            ) : (
              <div className={`story-chart vivid-story-chart ${config.visualType}`} aria-label="Story visual series">
                {preview.series.slice(0, 12).map((point, index) => (
                  <div className="story-chart-point" data-tooltip={`${point.name}: ${point.value.toLocaleString('en-US')}`} key={point.name}>
                    <span
                      className="story-chart-bar"
                      style={{
                        height: `${Math.max(14, (point.value / maxSeries) * 100)}%`,
                        background: `linear-gradient(180deg, ${['#2563eb', '#00a6a6', '#f97316', '#7c3aed', '#e11d48', '#f59e0b'][index % 6]}, #0f172a)`,
                      }}
                    />
                    <b>{point.value.toLocaleString('en-US')}</b>
                    <small>{point.name}</small>
                  </div>
                ))}
                {!preview.series.length ? <strong>No chart series available yet. Upload data or choose dashboard source.</strong> : null}
              </div>
            )}

            <div className="insight-card-grid">
              {preview.insights.slice(0, 3).map((insight) => <article key={insight}><strong>Insight</strong><span>{insight}</span></article>)}
            </div>
          </section>

          <section className="presentation-builder" aria-label="Presentation preview">
            <div className="panel-header compact">
              <div>
                <p className="eyebrow">Presentation preview</p>
                <h3>{deck.title}</h3>
                <span>{deck.subtitle}</span>
              </div>
              <span className="badge">{deck.slides.length} slides</span>
            </div>

            <div className="slide-tabs" aria-label="Presentation slides">
              {deck.slides.map((slide) => (
                <button className={selectedSlide.id === slide.id ? 'active' : undefined} key={slide.id} onClick={() => setSelectedSlideId(slide.id)} type="button">
                  <strong>{slide.section}</strong>
                  <span>{slide.title}</span>
                </button>
              ))}
            </div>

            <article className="slide-preview">
              <p className="eyebrow">{selectedSlide.section}</p>
              <h3>{selectedSlide.title}</h3>
              <span>{selectedSlide.subtitle}</span>
              <p>{selectedSlide.narrative}</p>
              <div className="metrics-grid upload-metrics">
                {selectedSlide.metrics.slice(0, 4).map((metric) => (
                  <article className="metric-card compact-card" key={metric.label}>
                    <div><p>{metric.label}</p><h3>{metric.value}</h3></div>
                    <span className={`delta ${metric.sentiment}`}>{metric.delta}</span>
                  </article>
                ))}
              </div>
              <div className="slide-bullets">
                {selectedSlide.bullets.slice(0, 6).map((bullet) => <span key={bullet}>{bullet}</span>)}
              </div>
            </article>
          </section>
        </div>
      </div>
    </section>
  );
}

