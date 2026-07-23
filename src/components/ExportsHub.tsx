import type { AnalyticsResponse, ReportBuilderConfig, UploadAnalysisResponse } from '../../shared/analytics';
import { numberFormatter } from '../lib/format';
import { downloadAnalysisWorkbook, downloadFilterViewPdf, downloadFilterViewWorkbook, downloadUploadAnalysisJson, downloadUploadAnalysisPdf } from '../lib/uploadExports';

type ExportsHubProps = {
  dashboard: AnalyticsResponse | null;
  upload: UploadAnalysisResponse | null;
  onExportCsv: () => void;
  onExportJson: () => void;
  onExportPdf: () => void;
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

export function ExportsHub({ dashboard, onExportCsv, onExportJson, onExportPdf, upload }: ExportsHubProps) {
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
          <p className="eyebrow">Downloads Hub</p>
          <h3>Download dashboard files, analyzed summaries, workbooks, and focused Excel views</h3>
        </div>
        <span className="badge">{upload ? `${upload.filterViews.length} Excel views` : 'Upload data for more downloads'}</span>
      </div>

      <div className="export-grid">
        <article className="export-card premium">
          <div><strong>Analyzed summary</strong><span>Download the latest uploaded dataset profile, methods, recommendations, and results as JSON or PDF.</span></div>
          <div className="download-actions compact-actions">
            <button className="secondary-button" disabled={!upload} onClick={() => upload && downloadUploadAnalysisJson(upload)} type="button">Export JSON</button>
            <button className="install-button" disabled={!upload} onClick={() => upload && downloadUploadAnalysisPdf(upload)} type="button">Export PDF</button>
          </div>
        </article>
        <article className="export-card premium">
          <div><strong>Analysis workbook</strong><span>Download a compact Excel workbook with metrics, columns, methods, results, filtered views, and recommendations.</span></div>
          <button className="install-button" disabled={!upload} onClick={() => upload && downloadAnalysisWorkbook(upload)} type="button">Download workbook</button>
        </article>
        <article className="export-card premium">
          <div><strong>Dashboard CSV</strong><span>Export the built-in executive analytics as spreadsheet-ready rows.</span></div>
          <button className="secondary-button" disabled={!dashboard} onClick={onExportCsv} type="button">Export CSV</button>
        </article>
        <article className="export-card premium">
          <div><strong>Dashboard JSON / PDF</strong><span>Export metrics, trend, alerts, and breakdown data for integrations or PDF reporting.</span></div>
          <div className="download-actions compact-actions">
            <button className="secondary-button" disabled={!dashboard} onClick={onExportJson} type="button">Export JSON</button>
            <button className="install-button" disabled={!dashboard} onClick={onExportPdf} type="button">Export PDF</button>
          </div>
        </article>
        <article className="export-card premium">
          <div><strong>Report setup</strong><span>Download the current starter report configuration as JSON.</span></div>
          <button className="secondary-button" onClick={() => downloadJson('m-data-report-config.json', reportConfig)} type="button">Export setup</button>
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
                <div className="download-actions compact-actions">
                  <button className="secondary-button" onClick={() => downloadFilterViewPdf(upload.fileName, view)} type="button">Export PDF</button>
                  <button className="install-button" onClick={() => downloadFilterViewWorkbook(upload.fileName, view)} type="button">Export Excel</button>
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : (
        <div className="state-panel compact-state">
          <strong>No uploaded export views yet</strong>
          <span>Upload a file in Data to unlock analyzed summaries, workbooks, and targeted Excel exports.</span>
        </div>
      )}
    </section>
  );
}


