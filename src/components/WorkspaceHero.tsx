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

export function WorkspaceHero({ appName, companyName, dashboard, latestUpload, loading, onNavigate }: WorkspaceHeroProps) {
  return (
    <section className="workspace-hero">
      <div className="workspace-hero-copy">
        <p className="eyebrow">Welcome to {appName}</p>
        <h2>Turn everyday files into clear decisions, reports, and downloads.</h2>
        <span>
          {companyName} can upload spreadsheets or JSON, inspect data quality, run guided analysis, build reports, and export results without wrestling with a complicated BI setup.
        </span>
        <div className="hero-actions" aria-label="Common M-Data actions">
          <button className="cta-button" onClick={() => onNavigate('data')} type="button">Upload a file</button>
          <button className="secondary-button" disabled={!latestUpload} onClick={() => onNavigate('analyze')} type="button">Analyze latest data</button>
          <button className="secondary-button" onClick={() => onNavigate('reports')} type="button">Build a report</button>
          <button className="secondary-button" onClick={() => onNavigate('exports')} type="button">Download results</button>
        </div>
      </div>
      <div className="hero-status-grid">
        <article>
          <span>Dashboard status</span>
          <strong>{loading ? 'Loading' : dashboard ? 'Ready' : 'Unavailable'}</strong>
          <small>{dashboard?.summary.change ?? 'Live dashboard metrics will appear here.'}</small>
        </article>
        <article>
          <span>Recommended next step</span>
          <strong>{latestUpload ? 'Review analysis' : 'Upload data'}</strong>
          <small>{latestUpload ? 'Your latest dataset is ready for methods, reports, and exports.' : 'Start with a spreadsheet, delimited file, or JSON dataset.'}</small>
        </article>
        <DatasetReadiness upload={latestUpload} />
      </div>
    </section>
  );
}

