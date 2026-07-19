import { useMemo, useState } from 'react';
import type { AnalyticsResponse, ReportBuilderConfig, UploadAnalysisResponse } from '../../shared/analytics';

type ReportBuilderProps = {
  dashboard: AnalyticsResponse | null;
  upload: UploadAnalysisResponse | null;
};

const chartTypes: ReportBuilderConfig['chartType'][] = ['bar', 'line', 'area', 'table', 'scorecards'];
const layouts: ReportBuilderConfig['layout'][] = ['executive', 'analyst', 'operations'];

function downloadReportConfig(config: ReportBuilderConfig) {
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'm-data-report-config.json';
  link.click();
  URL.revokeObjectURL(url);
}

export function ReportBuilder({ dashboard, upload }: ReportBuilderProps) {
  const uploadMetricOptions = upload?.columns.filter((column) => column.type === 'number').map((column) => column.name) ?? [];
  const uploadDimensionOptions = upload?.columns.filter((column) => column.type !== 'number').map((column) => column.name) ?? [];
  const [config, setConfig] = useState<ReportBuilderConfig>({
    chartType: 'bar',
    dimension: uploadDimensionOptions[0] ?? 'name',
    filter: 'All records',
    layout: 'executive',
    metric: uploadMetricOptions[0] ?? 'value',
    source: upload ? 'upload' : 'dashboard',
  });

  const preview = useMemo(() => {
    if (config.source === 'upload' && upload) {
      const result = upload.advancedAnalytics.results.find((item) => item.status === 'ready' && (item.series.length || item.rows.length));
      return {
        metrics: upload.metrics,
        recommendations: result?.recommendations ?? upload.recommendations,
        rows: result?.rows ?? [],
        series: result?.series ?? [],
        subtitle: `${config.layout} layout using ${config.metric} by ${config.dimension}`,
        title: `${upload.fileName} report`,
      };
    }

    return {
      metrics: dashboard?.metrics ?? [],
      recommendations: dashboard ? [dashboard.summary.recommendation] : ['Dashboard data is loading.'],
      rows: dashboard?.breakdown.map((row) => ({ label: row.name, cells: { conversion: row.conversion, latency: row.latency, revenue: row.revenue, users: row.users } })) ?? [],
      series: dashboard?.trend.map((point) => ({ name: point.name, value: point.value, comparison: point.target })) ?? [],
      subtitle: `${config.layout} layout using ${config.metric} by ${config.dimension}`,
      title: 'Executive dashboard report',
    };
  }, [config, dashboard, upload]);

  const update = <K extends keyof ReportBuilderConfig>(key: K, value: ReportBuilderConfig[K]) => {
    setConfig((current) => ({ ...current, [key]: value }));
  };

  return (
    <section className="report-builder">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Report Builder Lite</p>
          <h3>Create report-ready views from dashboard or uploaded data</h3>
        </div>
        <button className="secondary-button" onClick={() => downloadReportConfig(config)} type="button">Export report setup</button>
      </div>

      <div className="builder-grid">
        <aside className="builder-controls" aria-label="Report controls">
          <div className="builder-helper"><strong>Choose the story</strong><span>Select a source and M-Data will prepare a readable preview from the available fields.</span></div>
          <label>
            <span>Data source</span>
            <select value={config.source} onChange={(event) => update('source', event.target.value as ReportBuilderConfig['source'])}>
              <option value="dashboard">Built-in dashboard</option>
              <option value="upload" disabled={!upload}>Latest upload</option>
            </select>
          </label>
          <label>
            <span>Chart type</span>
            <select value={config.chartType} onChange={(event) => update('chartType', event.target.value as ReportBuilderConfig['chartType'])}>
              {chartTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
          <label>
            <span>Metric</span>
            <select value={config.metric} onChange={(event) => update('metric', event.target.value)}>
              {(config.source === 'upload' && uploadMetricOptions.length ? uploadMetricOptions : ['value', 'revenue', 'conversion', 'users']).map((metric) => <option key={metric} value={metric}>{metric}</option>)}
            </select>
          </label>
          <label>
            <span>Dimension</span>
            <select value={config.dimension} onChange={(event) => update('dimension', event.target.value)}>
              {(config.source === 'upload' && uploadDimensionOptions.length ? uploadDimensionOptions : ['name', 'region', 'channel', 'source']).map((dimension) => <option key={dimension} value={dimension}>{dimension}</option>)}
            </select>
          </label>
          <label>
            <span>Layout</span>
            <select value={config.layout} onChange={(event) => update('layout', event.target.value as ReportBuilderConfig['layout'])}>
              {layouts.map((layout) => <option key={layout} value={layout}>{layout}</option>)}
            </select>
          </label>
        </aside>

        <div className={`report-preview ${config.layout}`}>
          <div className="panel-header compact">
            <div>
              <p className="eyebrow">{config.chartType} preview</p>
              <h3>{preview.title}</h3>
              <span>{preview.subtitle}</span>
            </div>
          </div>
          <div className="metrics-grid upload-metrics">
            {preview.metrics.slice(0, 4).map((metric) => (
              <article className="metric-card compact-card" key={metric.label}>
                <div><p>{metric.label}</p><h3>{metric.value}</h3></div>
                <span className={`delta ${metric.sentiment}`}>{metric.delta}</span>
              </article>
            ))}
          </div>
          <div className={`report-bars ${config.chartType}`}>
            {preview.series.slice(0, 12).map((point) => <span key={point.name} style={{ height: `${Math.max(12, point.value / Math.max(...preview.series.map((item) => item.value), 1) * 100)}%` }} title={`${point.name}: ${point.value}`} />)}
          </div>
          <div className="recommendation-list">
            {preview.recommendations.slice(0, 3).map((item) => <div className="recommendation-item" key={item}>{item}</div>)}
          </div>
        </div>
      </div>
    </section>
  );
}



