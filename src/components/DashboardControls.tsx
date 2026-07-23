import { useState } from 'react';
import type { Category, CategoryKey, RangeKey } from '../../shared/analytics';

type DashboardControlsProps = {
  categories: Category[];
  category: CategoryKey;
  range: RangeKey;
  onCategoryChange: (category: CategoryKey) => void;
  onRangeChange: (range: RangeKey) => void;
};

const categoryHelp: Record<CategoryKey, string> = {
  source: 'Shows performance by demand source, such as organic, paid, referral, and direct.',
  channel: 'Shows performance by route to market or delivery channel.',
  region: 'Shows performance by geography or operating market.',
};

function isoDate(daysAgo: number) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

function rangeFromDates(startDate: string, endDate: string): RangeKey {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const span = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1);

  if (span <= 7) return '7d';
  if (span <= 30) return '30d';
  return '90d';
}

export function DashboardControls({
  categories,
  category,
  range,
  onCategoryChange,
  onRangeChange,
}: DashboardControlsProps) {
  const [startDate, setStartDate] = useState(() => isoDate(6));
  const [endDate, setEndDate] = useState(() => isoDate(0));

  const updateDates = (nextStart: string, nextEnd: string) => {
    setStartDate(nextStart);
    setEndDate(nextEnd);
    onRangeChange(rangeFromDates(nextStart, nextEnd));
  };

  return (
    <section className={`control-bar dashboard-filter-panel ${category}`} aria-label="Dashboard controls">
      <div className="filter-copy">
        <p className="eyebrow">View</p>
        <strong>{category.toUpperCase()}</strong>
      </div>

      <div className="tabs dashboard-focus-tabs" role="tablist" aria-label="Analytics category">
        {categories.map((item) => (
          <button
            key={item.key}
            role="tab"
            aria-selected={category === item.key}
            className={category === item.key ? 'active' : ''}
            data-tooltip={categoryHelp[item.key]}
            onClick={() => onCategoryChange(item.key)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="calendar-range-panel" aria-label="Custom period selector">
        <span className="range-badge">{range.toUpperCase()}</span>
        <label>
          <span>From</span>
          <input max={endDate} type="date" value={startDate} onChange={(event) => updateDates(event.target.value, endDate)} />
        </label>
        <label>
          <span>To</span>
          <input min={startDate} type="date" value={endDate} onChange={(event) => updateDates(startDate, event.target.value)} />
        </label>
      </div>
    </section>
  );
}
