import type { Alert, Insight } from '../../shared/analytics';

type SignalsPanelProps = {
  alerts: Alert[];
  averageConversion: string;
  insights: Insight[];
};

export function SignalsPanel({ alerts, averageConversion, insights }: SignalsPanelProps) {
  return (
    <aside className="side-panel panel">
      <div className="panel-header compact">
        <div>
          <p className="eyebrow">Signals</p>
          <h3>Alerts and mix</h3>
        </div>
        <span className="badge">{averageConversion} avg CVR</span>
      </div>

      <div className="alert-list">
        {alerts.map((alert) => (
          <article className={`alert ${alert.severity}`} key={alert.title}>
            <strong>{alert.title}</strong>
            <span>{alert.detail}</span>
          </article>
        ))}
      </div>

      <div className="insight-list">
        {insights.map((detail) => (
          <div key={detail.label} className="insight-item">
            <span>{detail.label}</span>
            <strong>{detail.value}</strong>
          </div>
        ))}
      </div>
    </aside>
  );
}
