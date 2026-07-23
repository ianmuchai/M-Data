import { useEffect, useMemo, useState } from 'react';
import type { CategoryKey, RangeKey, UploadAnalysisResponse } from '../shared/analytics';
import { BreakdownTable } from './components/BreakdownTable';
import { ChartPanel } from './components/ChartPanel';
import { CommandOverview } from './components/CommandOverview';
import { DashboardControls } from './components/DashboardControls';
import { DataAssistant } from './components/DataAssistant';
import { DeepDivePanel } from './components/DeepDivePanel';
import { ExportsHub } from './components/ExportsHub';
import { MetricsGrid } from './components/MetricsGrid';
import { Overview } from './components/Overview';
import { ReportBuilder } from './components/ReportBuilder';
import { AnalysisStudio } from './components/AnalysisStudio';
import { SignalsPanel } from './components/SignalsPanel';
import { Topbar } from './components/Topbar';
import { UploadAnalysisPanel } from './components/UploadAnalysisPanel';
import { WorkbenchNav, type WorkbenchSection } from './components/WorkbenchNav';
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
  const [activeSection, setActiveSection] = useState<WorkbenchSection>('overview');
  const [latestUpload, setLatestUpload] = useState<UploadAnalysisResponse | null>(() => {
    try {
      const stored = window.localStorage.getItem('bizdata.latestUploadAnalysis');
      return stored ? (JSON.parse(stored) as UploadAnalysisResponse) : null;
    } catch {
      return null;
    }
  });
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

  useEffect(() => {
    try {
      if (latestUpload) {
        window.localStorage.setItem('bizdata.latestUploadAnalysis', JSON.stringify(latestUpload));
      } else {
        window.localStorage.removeItem('bizdata.latestUploadAnalysis');
      }
    } catch {
      // Browser storage can be unavailable in private mode; the in-memory workbook still stays active.
    }
  }, [latestUpload]);

  const handleDashboardCsv = () => data && exportAnalytics(data, 'csv');
  const handleDashboardJson = () => data && exportAnalytics(data, 'json');

  return (
    <div className="app-shell modern-shell">
      <Topbar
        appName={appConfig.appName}
        companyName={appConfig.companyName}
        autoRefresh={autoRefresh}
        canExport={Boolean(data)}
        generatedAt={formatTimestamp(data?.generatedAt)}
        loading={loading}
        onAutoRefreshChange={setAutoRefresh}
        onExportCsv={handleDashboardCsv}
        onExportJson={handleDashboardJson}
        onInstall={() => void pwaInstall.install()}
        onRefresh={() => void refresh()}
        showInstall={pwaInstall.canInstall}
      />


      <WorkbenchNav activeSection={activeSection} hasUpload={Boolean(latestUpload)} onSectionChange={setActiveSection} />

      {activeSection === 'overview' ? (
        <div className="section-stack">
          <CommandOverview appName={appConfig.appName} companyName={appConfig.companyName} dashboard={data ?? null} latestUpload={latestUpload} loading={loading} onNavigate={setActiveSection} />
          <DashboardControls
            categories={data?.categories ?? fallbackCategories}
            category={category}
            range={range}
            ranges={data?.ranges ?? fallbackRanges}
            onCategoryChange={setCategory}
            onRangeChange={setRange}
          />
          <Overview summary={data?.summary} />
          <MetricsGrid loading={loading} metrics={data?.metrics ?? []} />
          <main className="main-grid">
            <ChartPanel error={error} totalVolume={totalVolume} trend={data?.trend ?? []} onRetry={() => void refresh()} />
            <SignalsPanel alerts={data?.alerts ?? []} averageConversion={averageConversion} insights={data?.insights ?? []} />
          </main>
          <DeepDivePanel category={category} details={data?.detailPoints ?? []} />
          <BreakdownTable rows={data?.breakdown ?? []} />
        </div>
      ) : null}

      {activeSection === 'data' ? <UploadAnalysisPanel analysis={latestUpload} onAnalysisComplete={setLatestUpload} onAnalyzeRequest={() => setActiveSection('analyze')} /> : null}

      {activeSection === 'analyze' ? <AnalysisStudio analysis={latestUpload} onUploadRequest={() => setActiveSection('data')} /> : null}

      {activeSection === 'reports' ? <ReportBuilder dashboard={data ?? null} upload={latestUpload} /> : null}

      {activeSection === 'exports' ? (
        <ExportsHub dashboard={data ?? null} upload={latestUpload} onExportCsv={handleDashboardCsv} onExportJson={handleDashboardJson} />
      ) : null}

      <DataAssistant analysis={latestUpload} enabled={appConfig.dataAssistantEnabled} onUploadRequest={() => setActiveSection('data')} />
    </div>
  );
}

export default App;


