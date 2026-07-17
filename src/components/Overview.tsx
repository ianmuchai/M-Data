import type { AnalyticsResponse } from '../../shared/analytics';

type OverviewProps = {
  summary?: AnalyticsResponse['summary'];
};

export function Overview({ summary }: OverviewProps) {
  return (
    <section className="overview-band">
      <div>
        <p className="eyebrow">Executive signal</p>
        <h2>{summary?.recommendation ?? 'Loading the latest performance signal'}</h2>
        <div className="signal-strip" aria-label="Operating posture">
          <span>Growth mode</span>
          <span>Target guarded</span>
          <span>Latency watched</span>
        </div>
      </div>
      <div className="score-block">
        <span>Health score</span>
        <strong>{summary?.score ?? '--'}</strong>
        <small>
          Target {summary?.target ?? '--'} | {summary?.change ?? 'No change yet'}
        </small>
      </div>
    </section>
  );
}
