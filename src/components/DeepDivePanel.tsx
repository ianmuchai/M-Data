import type { CategoryKey, DetailPoint } from '../../shared/analytics';

type DeepDivePanelProps = {
  category: CategoryKey;
  details: DetailPoint[];
};

const categoryCopy: Record<CategoryKey, { eyebrow: string; title: string }> = {
  source: {
    eyebrow: 'Source detail',
    title: 'Acquisition quality and efficiency',
  },
  channel: {
    eyebrow: 'Channel detail',
    title: 'Delivery mix, usage depth, and reliability',
  },
  region: {
    eyebrow: 'Region detail',
    title: 'Market spread, growth pockets, and latency risk',
  },
};

export function DeepDivePanel({ category, details }: DeepDivePanelProps) {
  const copy = categoryCopy[category];

  return (
    <section className="panel deep-dive-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">{copy.eyebrow}</p>
          <h3>{copy.title}</h3>
        </div>
      </div>
      <div className="detail-grid">
        {details.map((detail) => (
          <article className={`detail-card ${detail.tone}`} key={detail.title}>
            <span>{detail.title}</span>
            <strong>{detail.value}</strong>
            <p>{detail.caption}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
