import type { Metric } from '../../shared/analytics';

type MetricsGridProps = {
  loading: boolean;
  metrics: Metric[];
};

export function MetricsGrid({ loading, metrics }: MetricsGridProps) {
  return (
    <section className="metrics-grid" aria-label="Key metrics">
      {metrics.map((metric) => (
        <article key={metric.label} className="metric-card">
          <div>
            <p>{metric.label}</p>
            <h3>{metric.value}</h3>
          </div>
          <span className={`delta ${metric.sentiment}`}>{metric.delta}</span>
        </article>
      ))}
      {loading && metrics.length === 0
        ? Array.from({ length: 4 }, (_, index) => <div className="metric-card skeleton" key={index} />)
        : null}
    </section>
  );
}
