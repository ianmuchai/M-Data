import type { Category, CategoryKey, RangeKey, RangeOption } from '../../shared/analytics';

type DashboardControlsProps = {
  categories: Category[];
  category: CategoryKey;
  range: RangeKey;
  ranges: RangeOption[];
  onCategoryChange: (category: CategoryKey) => void;
  onRangeChange: (range: RangeKey) => void;
};

export function DashboardControls({
  categories,
  category,
  range,
  ranges,
  onCategoryChange,
  onRangeChange,
}: DashboardControlsProps) {
  return (
    <section className="control-bar" aria-label="Dashboard controls">
      <div className="tabs" role="tablist" aria-label="Analytics category">
        {categories.map((item) => (
          <button
            key={item.key}
            role="tab"
            aria-selected={category === item.key}
            className={category === item.key ? 'active' : ''}
            data-tooltip={`View ${item.label.toLowerCase()} performance`}
            onClick={() => onCategoryChange(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="segmented" aria-label="Time range">
        {ranges.map((item) => (
          <button
            key={item.key}
            aria-pressed={range === item.key}
            className={range === item.key ? 'active' : ''}
            data-tooltip={`Show ${item.label} trend`}
            onClick={() => onRangeChange(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </section>
  );
}
