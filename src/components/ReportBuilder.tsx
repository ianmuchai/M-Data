import { useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { AnalyticsResponse, PresentationPreset, UploadAnalysisResponse, VisualStoryConfig, VisualStoryType } from '../../shared/analytics';
import {
  buildPresentationDeck,
  buildVisualStoryPreview,
  downloadPresentationPdf,
  downloadPresentationPpt,
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
type SlideChartKind = 'bar' | 'line' | 'pie';

const slidePalette = ['#0f766e', '#2563eb', '#f97316', '#7c3aed', '#14b8a6', '#e11d48', '#f59e0b', '#64748b'];

function chooseSlideChartKind(slideId: string, slideIndex: number, hasComparison: boolean, pointCount: number, preset: PresentationPreset, visualType: VisualStoryType): SlideChartKind {
  if (visualType === 'line' || visualType === 'area') return 'line';
  if (visualType === 'bar' || visualType === 'ranking' || visualType === 'comparison') return 'bar';
  if (preset === 'board' || (preset === 'executive' && slideId.includes('summary'))) return 'pie';
  if (preset === 'analyst' || preset === 'operations') return 'bar';
  if (slideId.includes('trend') || slideId.includes('visual') || hasComparison) return 'line';
  if (slideId.includes('summary') || slideId.includes('quality') || (pointCount > 1 && pointCount <= 6 && slideIndex % 3 === 0)) return 'pie';
  return 'bar';
}

function SlideEvidenceChart({ data, kind }: { data: Array<{ name: string; value: number; comparison?: number }>; kind: SlideChartKind }) {
  if (kind === 'pie') {
    const pieData = data.slice(0, 8).map((entry) => ({ ...entry, value: Math.max(Math.abs(entry.value), 0.01) }));

    return (
      <ResponsiveContainer width='100%' height={240}>
        <PieChart>
          <Tooltip formatter={(value) => Number(value).toLocaleString('en-US')} />
          <Pie data={pieData} dataKey='value' innerRadius={48} nameKey='name' outerRadius={86} paddingAngle={2}>
            {pieData.map((entry, index) => <Cell fill={slidePalette[index % slidePalette.length]} key={entry.name} />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (kind === 'bar') {
    return (
      <ResponsiveContainer width='100%' height={240}>
        <BarChart data={data} margin={{ bottom: 16, left: 0, right: 14, top: 14 }}>
          <CartesianGrid stroke='rgba(15, 23, 42, 0.08)' vertical={false} />
          <XAxis dataKey='name' interval={0} tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} />
          <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} width={44} />
          <Tooltip formatter={(value) => Number(value).toLocaleString('en-US')} />
          <Bar dataKey='value' fill='#0f766e' radius={[7, 7, 0, 0]} />
          <Bar dataKey='comparison' fill='#f97316' radius={[7, 7, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width='100%' height={240}>
      <LineChart data={data} margin={{ bottom: 16, left: 0, right: 14, top: 14 }}>
        <CartesianGrid stroke='rgba(15, 23, 42, 0.08)' vertical={false} />
        <XAxis dataKey='name' interval={0} tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} />
        <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} width={44} />
        <Tooltip formatter={(value) => Number(value).toLocaleString('en-US')} />
        <Line dataKey='value' dot={{ fill: '#f97316', r: 4, stroke: '#ffffff', strokeWidth: 2 }} stroke='#0f766e' strokeWidth={3} type='monotone' />
        <Line dataKey='comparison' dot={false} stroke='#94a3b8' strokeDasharray='5 5' strokeWidth={2} type='monotone' />
      </LineChart>
    </ResponsiveContainer>
  );
}

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
    visualType: 'line',
  });

  const metricOptions = config.source === 'upload' && uploadMetricOptions.length ? uploadMetricOptions : ['value', 'revenue', 'conversion', 'users'];
  const dimensionOptions = config.source === 'upload' && uploadDimensionOptions.length ? uploadDimensionOptions : ['name', 'region', 'channel', 'source'];
  const preview = useMemo(() => buildVisualStoryPreview({ config, dashboard, upload }), [config, dashboard, upload]);
  const deck = useMemo(() => buildPresentationDeck({ config, dashboard, upload }), [config, dashboard, upload]);
  const selectedSlide = deck.slides.find((slide) => slide.id === selectedSlideId) ?? deck.slides[0];
  const selectedSlideIndex = Math.max(0, deck.slides.findIndex((slide) => slide.id === selectedSlide.id));
  const selectedSlideChartData = useMemo(() => selectedSlide.visualPoints.slice(0, 12).map((point) => ({ name: point.name, value: point.value, comparison: point.comparison ?? undefined })), [selectedSlide]);
  const selectedSlideChartKind = useMemo(() => chooseSlideChartKind(selectedSlide.id, selectedSlideIndex, selectedSlideChartData.some((point) => typeof point.comparison === 'number'), selectedSlideChartData.length, config.preset, config.visualType), [config.preset, config.visualType, selectedSlide.id, selectedSlideIndex, selectedSlideChartData]);
  const chartData = useMemo(() => preview.series.slice(0, 12).map((point) => ({ name: point.name, value: point.value, comparison: point.comparison ?? undefined })), [preview.series]);
  const selectedVisual = visualTypeOptions.find((option) => option.key === config.visualType) ?? visualTypeOptions[0];
  const selectedPreset = presetOptions.find((option) => option.key === config.preset) ?? presetOptions[0];

  useEffect(() => {
    if (!deck.slides.some((slide) => slide.id === selectedSlideId)) setSelectedSlideId(deck.slides[0]?.id ?? 'summary');
  }, [deck.slides, selectedSlideId]);

  const update = <K extends keyof VisualStoryConfig>(key: K, value: VisualStoryConfig[K]) => {
    setConfig((current) => ({ ...current, [key]: value }));
    if (key === 'preset') setSelectedSlideId('summary');
  };

  return (
    <section className="report-builder story-builder">
      <div className="panel-header story-header">
        <div>
          <p className="eyebrow">Visual Story Builder</p>
          <h3>Board-ready presentation from the full analysis</h3>
          <span className="panel-subtitle">BizDATA turns the dashboard, workbook findings, business questions, charts, risks, and recommendations into a clear slide deck.</span>
        </div>
        <div className="download-actions">
          <button className="secondary-button" onClick={() => downloadPresentationPdf(deck)} type="button">Download PDF</button>
          <button className="install-button" onClick={() => downloadPresentationPpt(deck)} type="button">Download PPT</button>
        </div>
      </div>

      <div className="story-builder-grid comprehensive-story-grid">
        <aside className="builder-controls story-controls" aria-label="Visual story controls">
          <div className="builder-helper audience-helper"><strong>{selectedPreset.label}</strong><span>{selectedPreset.helper} The slide order, chart emphasis, and exported deck update when this changes.</span></div>
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
              <option value="detailed">Detailed - evidence, risk, and next steps</option>
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
              <span className="badge">{chartData.length} points</span>
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
                  <tbody>{preview.rows.slice(0, 10).map((row) => <tr key={row.label}><td>{row.label}</td><td>{Object.values(row.cells).join(' | ')}</td></tr>)}</tbody>
                </table>
              </div>
            ) : (
              <div className={`story-chart vivid-story-chart ${config.visualType}`} aria-label="Story visual series">
                <ResponsiveContainer width="100%" height={320}>
                  {config.visualType === 'line' ? (
                    <LineChart data={chartData} margin={{ bottom: 18, left: 4, right: 18, top: 18 }}>
                      <CartesianGrid stroke="rgba(15, 23, 42, 0.08)" vertical={false} />
                      <XAxis dataKey="name" interval={0} tick={{ fill: '#475569', fontSize: 11 }} tickLine={false} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} width={48} />
                      <Tooltip formatter={(value) => Number(value).toLocaleString('en-US')} />
                      <Line dataKey="value" dot={{ fill: '#f97316', r: 4, stroke: '#ffffff', strokeWidth: 2 }} stroke="#0f766e" strokeWidth={3} type="monotone" />
                      <Line dataKey="comparison" dot={false} stroke="#94a3b8" strokeDasharray="5 5" strokeWidth={2} type="monotone" />
                    </LineChart>
                  ) : config.visualType === 'area' ? (
                    <AreaChart data={chartData} margin={{ bottom: 18, left: 4, right: 18, top: 18 }}>
                      <defs>
                        <linearGradient id="storyArea" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#2563eb" stopOpacity={0.42} />
                          <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.08} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(15, 23, 42, 0.08)" vertical={false} />
                      <XAxis dataKey="name" interval={0} tick={{ fill: '#475569', fontSize: 11 }} tickLine={false} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} width={48} />
                      <Tooltip formatter={(value) => Number(value).toLocaleString('en-US')} />
                      <Area dataKey="value" fill="url(#storyArea)" stroke="#2563eb" strokeWidth={3} type="monotone" />
                    </AreaChart>
                  ) : (
                    <BarChart data={chartData} margin={{ bottom: 18, left: 4, right: 18, top: 18 }}>
                      <CartesianGrid stroke="rgba(15, 23, 42, 0.08)" vertical={false} />
                      <XAxis dataKey="name" interval={0} tick={{ fill: '#475569', fontSize: 11 }} tickLine={false} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} width={48} />
                      <Tooltip formatter={(value) => Number(value).toLocaleString('en-US')} />
                      <Bar dataKey="value" fill="#0f766e" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
                {!preview.series.length ? <strong>No chart series available yet. Upload data or choose dashboard source.</strong> : null}
              </div>
            )}

            <div className="insight-card-grid">
              {preview.insights.slice(0, 4).map((insight) => <article key={insight}><strong>Insight</strong><span>{insight}</span></article>)}
            </div>
          </section>

          <section className="presentation-builder" aria-label="Presentation preview">
            <div className="panel-header compact">
              <div>
                <p className="eyebrow">Presentation preview</p>
                <h3>{deck.title}</h3>
                <span>{deck.subtitle}</span>
              </div>
              <span className="badge">{selectedPreset.key} audience | {deck.slides.length} slides</span>
            </div>

            <div className="slide-tabs" aria-label="Presentation slides">
              {deck.slides.map((slide) => (
                <button className={selectedSlide.id === slide.id ? 'active' : undefined} key={slide.id} onClick={() => setSelectedSlideId(slide.id)} type="button">
                  <strong>{slide.section}</strong>
                  <span>{slide.title}</span>
                </button>
              ))}
            </div>

            <article className="slide-preview powerpoint-slide">
              <header className="slide-preview-header">
                <p className="eyebrow">{selectedSlide.section}</p>
                <span>{String(selectedSlideIndex + 1).padStart(2, '0')} / {String(deck.slides.length).padStart(2, '0')}</span>
              </header>

              <div className="slide-preview-body">
                <div className="slide-copy-block">
                  <h3>{selectedSlide.title}</h3>
                  <span>{selectedSlide.subtitle}</span>
                  <p>{selectedSlide.narrative}</p>
                </div>

                <div className="slide-metric-strip">
                  {selectedSlide.metrics.slice(0, 4).map((metric) => (
                    <article key={metric.label}>
                      <span>{metric.label}</span>
                      <strong>{metric.value}</strong>
                      <small>{metric.delta}</small>
                    </article>
                  ))}
                  {!selectedSlide.metrics.length ? <article><span>Slide focus</span><strong>{selectedSlide.section.split('/').pop()?.trim() ?? 'Review'}</strong><small>narrative slide</small></article> : null}
                </div>

                {selectedSlideChartData.length ? (
                  <div className={['slide-evidence-chart', selectedSlideChartKind].join(' ')} aria-label='Selected slide visual evidence'>
                    <div className='slide-chart-title'>
                      <strong>{selectedPreset.key === 'board' ? 'Risk and share evidence' : selectedPreset.key === 'operations' ? 'Operational priority evidence' : selectedPreset.key === 'analyst' ? 'Detailed analytical evidence' : selectedSlideChartKind === 'pie' ? 'Share of visual evidence' : selectedSlideChartKind === 'bar' ? 'Ranked analytics evidence' : 'Trend and comparison evidence'}</strong>
                      <span>{selectedSlideChartData.length} chartable findings from this slide</span>
                    </div>
                    <SlideEvidenceChart data={selectedSlideChartData} kind={selectedSlideChartKind} />
                  </div>
                ) : null}

                <div className="slide-content-grid">
                  <div className="slide-bullets">
                    {selectedSlide.bullets.slice(0, 8).map((bullet) => <span key={bullet}>{bullet}</span>)}
                  </div>
                  <aside className="slide-speaker-notes">
                    <strong>Recommended action</strong>
                    {(selectedSlide.recommendations.length ? selectedSlide.recommendations : ['Use this slide to explain the finding, business meaning, and next decision.']).slice(0, 5).map((recommendation) => <p key={recommendation}>{recommendation}</p>)}
                  </aside>
                </div>
              </div>

              <footer className="slide-preview-footer">
                <span>BizDATA analytics presentation</span>
                <span>{new Date(deck.generatedAt).toLocaleDateString()}</span>
              </footer>
            </article>
          </section>
        </div>
      </div>
    </section>
  );
}
