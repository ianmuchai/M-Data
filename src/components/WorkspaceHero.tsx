import type { AnalyticsResponse, UploadAnalysisResponse } from '../../shared/analytics';
import type { WorkbenchSection } from './WorkbenchNav';
import { DatasetReadiness } from './DatasetReadiness';

type WorkspaceHeroProps = {
  appName: string;
  companyName: string;
  dashboard: AnalyticsResponse | null;
  latestUpload: UploadAnalysisResponse | null;
  loading: boolean;
  onNavigate: (section: WorkbenchSection) => void;
};

function qualityTone(score: number | undefined) {
  if (score == null) return 'waiting';
  if (score >= 85) return 'excellent';
  if (score >= 70) return 'ready';
  return 'attention';
}

export function WorkspaceHero({ appName, companyName, dashboard, latestUpload, loading, onNavigate }: WorkspaceHeroProps) {
  const readyMethods = latestUpload?.advancedAnalytics.methods.filter((method) => method.enabled).length ?? 0;
  const exportCount = latestUpload?.filterViews.length ?? 0;
  const trend = dashboard?.trend.slice(-7) ?? [];
  const maxTrend = Math.max(...trend.map((point) => point.value), 1);
  const score = latestUpload?.qualityScore ?? dashboard?.summary.score;
  const tone = qualityTone(score);

  return (
    <section className={`workspace-hero vibrant ${tone}`}>
      <div className="workspace-hero-copy">
        <p className="eyebrow">Welcome to {appName}</p>
        <h2>Explore your data with clarity, color, and confidence.</h2>
        <span>
          {companyName} can upload spreadsheets or JSON, inspect data quality, run guided analysis, build reports, and export polished results from one lively workspace.
        </span>
        <div className="hero-actions" aria-label="Common M-Data actions">
          <button className="cta-button" onClick={() => onNavigate('data')} type="button">Upload a file</button>
          <button className="secondary-button" disabled={!latestUpload} onClick={() => onNavigate('analyze')} type="button">Analyze latest data</button>
          <button className="secondary-button" onClick={() => onNavigate('reports')} type="button">Build a report</button>
          <button className="secondary-button" onClick={() => onNavigate('exports')} type="button">Download results</button>
        </div>
      </div>

      <div className="data-pulse-panel" aria-label="Live data pulse">
        <div className="pulse-header">
          <div>
            <span>{loading ? 'Syncing dashboard' : 'Live workspace pulse'}</span>
            <strong>{score != null ? `${score}/100` : 'Ready when you are'}</strong>
          </div>
          <b>{latestUpload ? latestUpload.fileName : 'No dataset loaded'}</b>
        </div>

        <div className="pulse-bars" aria-label="Recent dashboard trend">
          {trend.length ? trend.map((point) => (
            <span key={point.name} style={{ height: `${Math.max(18, (point.value / maxTrend) * 100)}%` }} title={`${point.name}: ${point.value}`} />
          )) : Array.from({ length: 7 }, (_, index) => <span className="empty" key={index} style={{ height: `${30 + index * 8}%` }} />)}
        </div>

        <div className="pulse-stats">
          <article><span>Methods</span><strong>{readyMethods}/9</strong></article>
          <article><span>Exports</span><strong>{exportCount + (dashboard ? 2 : 0)}</strong></article>
          <article><span>Rows</span><strong>{latestUpload ? latestUpload.rowCount.toLocaleString('en-US') : '-'}</strong></article>
        </div>
      </div>

      <div className="hero-status-grid">
        <article className="status-card blue">
          <span>Dashboard status</span>
          <strong>{loading ? 'Loading' : dashboard ? 'Ready' : 'Unavailable'}</strong>
          <small>{dashboard?.summary.change ?? 'Live dashboard metrics will appear here.'}</small>
        </article>
        <article className="status-card coral">
          <span>Recommended next step</span>
          <strong>{latestUpload ? 'Review analysis' : 'Upload data'}</strong>
          <small>{latestUpload ? 'Your latest dataset is ready for methods, reports, and exports.' : 'Start with a spreadsheet, delimited file, or JSON dataset.'}</small>
        </article>
        <DatasetReadiness upload={latestUpload} />
      </div>
    </section>
  );
}

