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
        <img className="brand-mark" src="/bizyako-logo.svg" alt="" aria-hidden="true" />
        <div>
          <p className="eyebrow">{companyName}</p>
        </div>
      </div>
      <div className="topbar-actions">
        <span className="sync-status" data-tooltip="Last time data refreshed">Updated {generatedAt}</span>
        <label className="toggle" data-tooltip="Refresh data every 30 seconds">
          <input checked={autoRefresh} onChange={(event) => onAutoRefreshChange(event.target.checked)} type="checkbox" />
          <span>Live</span>
        </label>
        <button className="secondary-button" data-tooltip="Load the latest analytics" onClick={onRefresh} disabled={loading}>
          Refresh
        </button>
        {showInstall ? (
          <button className="install-button" data-tooltip="Add BizDATA to your device" onClick={onInstall}>
            Install app
          </button>
        ) : null}
        <button className="secondary-button" data-tooltip="Download table data" onClick={onExportCsv} disabled={!canExport}>
          Export CSV
        </button>
        <button className="cta-button" data-tooltip="Download full report" onClick={onExportJson} disabled={!canExport}>
          Export JSON
        </button>
      </div>
      <a className="bizyako-header-logo" href="https://bizyako.com" aria-label="BizYako" data-tooltip="BizYako">
        <img src="/bizyako-logo.svg" alt="BizYako" />
      </a>
    </header>
  );
}
