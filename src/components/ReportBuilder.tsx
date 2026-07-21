import { useMemo, useState } from 'react';
import type { AnalyticsResponse, PresentationPreset, UploadAnalysisResponse, VisualStoryConfig, VisualStoryType } from '../../shared/analytics';
import {
  buildPresentationDeck,
  buildVisualStoryPreview,
  downloadPresentationHtml,
  downloadPresentationOutline,
  downloadStoryConfig,
} from '../lib/storyBuilder';

type ReportBuilderProps = {
  dashboard: AnalyticsResponse | null;
  upload: UploadAnalysisResponse | null;
};

const visualTypes: VisualStoryType[] = ['bar', 'line', 'area', 'scorecards', 'table', 'comparison', 'ranking', 'insights'];
const presets: PresentationPreset[] = ['executive', 'analyst', 'operations', 'board'];

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
            <span>Visual type</span>
            <select value={config.visualType} onChange={(event) => update('visualType', event.target.value as VisualStoryType)}>
              {visualTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
          <label>
            <span>Audience preset</span>
            <select value={config.preset} onChange={(event) => update('preset', event.target.value as PresentationPreset)}>
              {presets.map((preset) => <option key={preset} value={preset}>{preset}</option>)}
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
            <span>Narrative</span>
            <select value={config.narrativeStyle} onChange={(event) => update('narrativeStyle', event.target.value as VisualStoryConfig['narrativeStyle'])}>
              <option value="concise">concise</option>
              <option value="guided">guided</option>
              <option value="detailed">detailed</option>
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
              <div className="story-bars" aria-label="Story visual series">
                {preview.series.slice(0, 14).map((point) => <span key={point.name} style={{ height: `${Math.max(12, (point.value / maxSeries) * 100)}%` }} title={`${point.name}: ${point.value}`} />)}
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

