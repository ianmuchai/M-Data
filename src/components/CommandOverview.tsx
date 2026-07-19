import type { AnalyticsResponse, UploadAnalysisResponse } from '../../shared/analytics';
import type { WorkbenchSection } from './WorkbenchNav';
import { WorkspaceHero } from './WorkspaceHero';

type CommandOverviewProps = {
  appName: string;
  companyName: string;
  dashboard: AnalyticsResponse | null;
  loading: boolean;
  latestUpload: UploadAnalysisResponse | null;
  onNavigate: (section: WorkbenchSection) => void;
};

export function CommandOverview({ appName, companyName, dashboard, latestUpload, loading, onNavigate }: CommandOverviewProps) {
  const readyMethods = latestUpload?.advancedAnalytics.methods.filter((method) => method.enabled).length ?? 0;
  const exportCount = latestUpload?.filterViews.length ?? 0;

  return (
    <div className="command-overview-shell">
      <WorkspaceHero
        appName={appName}
        companyName={companyName}
        dashboard={dashboard}
        latestUpload={latestUpload}
        loading={loading}
        onNavigate={onNavigate}
      />

      <section className="workflow-cards" aria-label="Workspace summary">
        <article>
          <span>Business view</span>
          <strong>{dashboard ? `${dashboard.summary.score}/100` : 'Preparing'}</strong>
          <small>{dashboard?.summary.recommendation ?? 'Your built-in dashboard stays available while you work with uploads.'}</small>
        </article>
        <article>
          <span>Dataset</span>
          <strong>{latestUpload ? 'Loaded' : 'Waiting'}</strong>
          <small>{latestUpload ? latestUpload.fileName : 'Upload CSV, Excel, TXT, TSV, or JSON data.'}</small>
        </article>
        <article>
          <span>Analysis</span>
          <strong>{readyMethods}/9 ready</strong>
          <small>Methods turn on automatically when matching fields are found.</small>
        </article>
        <article>
          <span>Downloads</span>
          <strong>{exportCount + (dashboard ? 2 : 0)}</strong>
          <small>Export dashboard files, analyzed summaries, workbooks, and filtered Excel views.</small>
        </article>
      </section>
    </div>
  );
}



