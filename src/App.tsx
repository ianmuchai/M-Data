import { useMemo, useState } from 'react';
import type { CategoryKey, RangeKey } from '../shared/analytics';
import { BreakdownTable } from './components/BreakdownTable';
import { ChartPanel } from './components/ChartPanel';
import { DashboardControls } from './components/DashboardControls';
import { DeepDivePanel } from './components/DeepDivePanel';
import { MetricsGrid } from './components/MetricsGrid';
import { Overview } from './components/Overview';
import { SignalsPanel } from './components/SignalsPanel';
import { Topbar } from './components/Topbar';
import { UploadAnalysisPanel } from './components/UploadAnalysisPanel';
import { useAnalytics } from './hooks/useAnalytics';
import { useAppConfig } from './hooks/useAppConfig';
import { usePwaInstall } from './hooks/usePwaInstall';
import { exportAnalytics } from './lib/exportReport';
import { formatTimestamp, numberFormatter } from './lib/format';
import { fallbackCategories, fallbackRanges } from './lib/options';

function App() {
  const [category, setCategory] = useState<CategoryKey>('source');
  const [range, setRange] = useState<RangeKey>('7d');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const { data, error, loading, refresh } = useAnalytics(category, range, autoRefresh);
  const pwaInstall = usePwaInstall();
  const appConfig = useAppConfig();

  const averageConversion = useMemo(() => {
    if (!data?.breakdown.length) {
      return '0.0%';
    }

    const average = data.breakdown.reduce((total, row) => total + row.conversion, 0) / data.breakdown.length;
    return `${average.toFixed(1)}%`;
  }, [data?.breakdown]);

  const totalVolume = useMemo(
    () => numberFormatter.format(data?.trend.reduce((total, point) => total + point.value, 0) ?? 0),
    [data?.trend],
  );

  return (
    <div className="app-shell">
      <Topbar
        appName={appConfig.appName}
        companyName={appConfig.companyName}
        autoRefresh={autoRefresh}
        canExport={Boolean(data)}
        generatedAt={formatTimestamp(data?.generatedAt)}
        loading={loading}
        onAutoRefreshChange={setAutoRefresh}
        onExportCsv={() => data && exportAnalytics(data, 'csv')}
        onExportJson={() => data && exportAnalytics(data, 'json')}
        onInstall={() => void pwaInstall.install()}
        onRefresh={() => void refresh()}
        showInstall={pwaInstall.canInstall}
      />

      {!pwaInstall.canInstall && !pwaInstall.isInstalled ? (
        <section className="install-hint" aria-label="Install M-Data">
          <strong>Install M-Data on your phone</strong>
          <span>Open this site in your mobile browser menu and choose Add to Home Screen.</span>
        </section>
      ) : null}

      <DashboardControls
        categories={data?.categories ?? fallbackCategories}
        category={category}
        range={range}
        ranges={data?.ranges ?? fallbackRanges}
        onCategoryChange={setCategory}
        onRangeChange={setRange}
      />

      <Overview summary={data?.summary} />
      <UploadAnalysisPanel />
      <MetricsGrid loading={loading} metrics={data?.metrics ?? []} />
      <DeepDivePanel category={category} details={data?.detailPoints ?? []} />

      <main className="main-grid">
        <ChartPanel error={error} totalVolume={totalVolume} trend={data?.trend ?? []} onRetry={() => void refresh()} />
        <SignalsPanel
          alerts={data?.alerts ?? []}
          averageConversion={averageConversion}
          insights={data?.insights ?? []}
        />
      </main>

      <BreakdownTable rows={data?.breakdown ?? []} />
    </div>
  );
}

export default App;
