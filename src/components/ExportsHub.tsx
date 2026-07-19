import type { AnalyticsResponse, ReportBuilderConfig, UploadAnalysisResponse } from '../../shared/analytics';
import { numberFormatter } from '../lib/format';

type ExportsHubProps = {
  dashboard: AnalyticsResponse | null;
  upload: UploadAnalysisResponse | null;
  onExportCsv: () => void;
  onExportJson: () => void;
};

function downloadJson(name: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export function ExportsHub({ dashboard, onExportCsv, onExportJson, upload }: ExportsHubProps) {
  const reportConfig: ReportBuilderConfig = {
    chartType: 'bar',
    dimension: upload?.columns.find((column) => column.type !== 'number')?.name ?? 'name',
    filter: 'All records',
    layout: 'executive',
    metric: upload?.columns.find((column) => column.type === 'number')?.name ?? 'value',
    source: upload ? 'upload' : 'dashboard',
  };

  return (
    <section className="exports-hub">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Exports Hub</p>
          <h3>Centralized outputs for dashboards, filtered data, and report setup</h3>
        </div>
        <span className="badge">{upload ? `${upload.filterViews.length} Excel views` : 'Dashboard exports'}</span>
      </div>

      <div className="export-grid">
        <article className="export-card">
          <div><strong>Dashboard CSV</strong><span>Export the built-in executive analytics as spreadsheet-ready rows.</span></div>
          <button className="secondary-button" disabled={!dashboard} onClick={onExportCsv} type="button">Export CSV</button>
        </article>
        <article className="export-card">
          <div><strong>Dashboard JSON</strong><span>Export metrics, trend, alerts, and breakdown data for integrations.</span></div>
          <button className="secondary-button" disabled={!dashboard} onClick={onExportJson} type="button">Export JSON</button>
        </article>
        <article className="export-card">
          <div><strong>Report config</strong><span>Download the current starter report setup as JSON.</span></div>
          <button className="secondary-button" onClick={() => downloadJson('m-data-report-config.json', reportConfig)} type="button">Export config</button>
        </article>
      </div>

      {upload ? (
        <div className="analysis-workspace filter-workspace">
          <div className="panel-header compact">
            <div>
              <p className="eyebrow">Generated Excel views</p>
              <h3>{upload.fileName}</h3>
            </div>
            <span className="badge">{numberFormatter.format(upload.rowCount)} source rows</span>
          </div>
          <div className="export-list">
            {upload.filterViews.map((view) => (
              <article className="export-row" key={view.key}>
                <div>
                  <strong>{view.title}</strong>
                  <span>{numberFormatter.format(view.rowCount)} rows | matched by {view.matchedBy}</span>
                </div>
                <small>Open Data section to preview and download this Excel view.</small>
              </article>
            ))}
          </div>
        </div>
      ) : (
        <div className="state-panel compact-state">
          <strong>No uploaded export views yet</strong>
          <span>Upload a file in Data to generate targeted Excel exports.</span>
        </div>
      )}
    </section>
  );
}
