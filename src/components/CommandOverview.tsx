import type { AnalyticsResponse, UploadAnalysisResponse } from '../../shared/analytics';
import type { WorkbenchSection } from './WorkbenchNav';
import { numberFormatter } from '../lib/format';

type CommandOverviewProps = {
  dashboard: AnalyticsResponse | null;
  loading: boolean;
  latestUpload: UploadAnalysisResponse | null;
  onNavigate: (section: WorkbenchSection) => void;
};

export function CommandOverview({ dashboard, latestUpload, loading, onNavigate }: CommandOverviewProps) {
  const readyMethods = latestUpload?.advancedAnalytics.methods.filter((method) => method.enabled).length ?? 0;
  const exportCount = latestUpload?.filterViews.length ?? 0;

  return (
    <section className="command-overview">
      <div className="command-copy">
        <p className="eyebrow">Command dashboard</p>
        <h2>One workspace for data quality, statistical analysis, guided reporting, and exports</h2>
        <div className="command-actions" aria-label="Primary analytics actions">
          <button className="cta-button" onClick={() => onNavigate('data')} type="button">Upload data</button>
          <button className="secondary-button" disabled={!latestUpload} onClick={() => onNavigate('analyze')} type="button">Run analysis</button>
          <button className="secondary-button" onClick={() => onNavigate('reports')} type="button">Build report</button>
          <button className="secondary-button" onClick={() => onNavigate('exports')} type="button">Export</button>
        </div>
      </div>

      <div className="command-grid" aria-label="Workspace readiness">
        <article>
          <span>Dashboard</span>
          <strong>{loading ? 'Loading' : dashboard ? `${dashboard.summary.score}/100` : 'Offline'}</strong>
          <small>{dashboard?.summary.recommendation ?? 'Built-in executive analytics remain available.'}</small>
        </article>
        <article>
          <span>Latest dataset</span>
          <strong>{latestUpload ? latestUpload.fileName : 'No upload yet'}</strong>
          <small>{latestUpload ? `${numberFormatter.format(latestUpload.rowCount)} rows, ${latestUpload.qualityScore}/100 quality` : 'Upload a structured file to unlock Analysis Studio.'}</small>
        </article>
        <article>
          <span>Analysis methods</span>
          <strong>{readyMethods}/9 ready</strong>
          <small>{latestUpload ? 'Compatible methods are enabled automatically.' : 'Requires an uploaded dataset.'}</small>
        </article>
        <article>
          <span>Export paths</span>
          <strong>{exportCount + (dashboard ? 2 : 0)}</strong>
          <small>Dashboard CSV/JSON plus generated Excel views when uploaded data exists.</small>
        </article>
      </div>
    </section>
  );
}
