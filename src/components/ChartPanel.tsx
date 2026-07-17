import { Suspense, lazy } from 'react';
import type { DataPoint } from '../../shared/analytics';

const TrendChart = lazy(() => import('./TrendChart'));

type ChartPanelProps = {
  error: string | null;
  totalVolume: string;
  trend: DataPoint[];
  onRetry: () => void;
};

export function ChartPanel({ error, totalVolume, trend, onRetry }: ChartPanelProps) {
  return (
    <section className="chart-panel panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Trend overview</p>
          <h3>Conversion volume</h3>
        </div>
        <div className="badge">{totalVolume} total</div>
      </div>

      {error ? (
        <div className="state-panel">
          <strong>Analytics unavailable</strong>
          <span>{error}</span>
          <button className="secondary-button" data-tooltip="Try loading the chart again" onClick={onRetry}>
            Try again
          </button>
        </div>
      ) : (
        <Suspense fallback={<div className="loader">Preparing chart...</div>}>
          <TrendChart data={trend} />
        </Suspense>
      )}
    </section>
  );
}
