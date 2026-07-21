type TopbarProps = {
  appName: string;
  companyName: string;
  autoRefresh: boolean;
  canExport: boolean;
  generatedAt: string;
  loading: boolean;
  onAutoRefreshChange: (enabled: boolean) => void;
  onExportCsv: () => void;
  onExportJson: () => void;
  onInstall: () => void;
  onRefresh: () => void;
  showInstall: boolean;
};

export function Topbar({
  companyName,
  autoRefresh,
  canExport,
  generatedAt,
  loading,
  onAutoRefreshChange,
  onExportCsv,
  onExportJson,
  onInstall,
  onRefresh,
  showInstall,
}: TopbarProps) {
  return (
    <header className="topbar">
      <div className="brand-lockup" aria-label="BizDATA workspace">
        <img className="brand-mark" src="/bizyako-logo-square.png" alt="" aria-hidden="true" />
        <div>
          <p className="eyebrow">{companyName}</p>
        </div>
      </div>
      <div className="topbar-actions" aria-label="Workspace actions">
        <div className="topbar-action-group status-group" aria-label="Workspace status">
          <span className="sync-status" data-tooltip="Last time data refreshed">Updated {generatedAt}</span>
          <label className="toggle" data-tooltip="Refresh data every 30 seconds">
            <input checked={autoRefresh} onChange={(event) => onAutoRefreshChange(event.target.checked)} type="checkbox" />
            <span>Live</span>
          </label>
        </div>
        <div className="topbar-action-group utility-group" aria-label="Quick actions">
          <button className="secondary-button" data-tooltip="Load the latest analytics" onClick={onRefresh} disabled={loading}>
            Refresh
          </button>
          <button
            aria-label="Download BizDATA for PC or mobile"
            className="app-download-button"
            data-tooltip="Download for PC or mobile"
            onClick={showInstall ? onInstall : undefined}
            type="button"
          >
            <span className="download-icon" aria-hidden="true" />
          </button>
        </div>
        <div className="topbar-action-group export-group" aria-label="Export actions">
          <button className="secondary-button" data-tooltip="Download table data" onClick={onExportCsv} disabled={!canExport}>
            Export CSV
          </button>
          <button className="cta-button" data-tooltip="Download full report" onClick={onExportJson} disabled={!canExport}>
            Export JSON
          </button>
        </div>
      </div>
      <a className="bizyako-header-logo" href="https://bizyako.com" aria-label="BizYako" data-tooltip="BizYako">
        <img src="/bizyako-logo-square.png" alt="BizYako" />
      </a>
    </header>
  );
}
