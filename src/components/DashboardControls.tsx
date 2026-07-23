import { useMemo, useState } from 'react';
import type { Category, CategoryKey, RangeKey } from '../../shared/analytics';

type DashboardControlsProps = {
  categories: Category[];
  category: CategoryKey;
  range: RangeKey;
  onCategoryChange: (category: CategoryKey) => void;
  onRangeChange: (range: RangeKey) => void;
};

const categoryHelp: Record<CategoryKey, string> = {
  source: 'Source compares how users or customers entered the business flow, such as organic, paid, referral, and direct demand.',
  channel: 'Channel compares delivery or sales routes, such as web, retail, partner, field, or support channels.',
  region: 'Region compares geography or operating markets so users can see where performance, demand, or risk differs.',
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

function rangeLabel(range: RangeKey) {
  if (range === '7d') return '7-day analytics window';
  if (range === '30d') return '30-day analytics window';
  return '90-day analytics window';
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
  const activeCategory = categories.find((item) => item.key === category) ?? categories[0];
  const periodCopy = useMemo(() => rangeLabel(range), [range]);

  const updateDates = (nextStart: string, nextEnd: string) => {
    setStartDate(nextStart);
    setEndDate(nextEnd);
    onRangeChange(rangeFromDates(nextStart, nextEnd));
  };

  return (
    <section className={`control-bar dashboard-filter-panel ${category}`} aria-label="Dashboard controls">
      <div className="filter-copy">
        <p className="eyebrow">Dashboard focus</p>
        <h3>{activeCategory?.label ?? 'Source'} view is active</h3>
        <span>{categoryHelp[category]}</span>
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
            <strong>{item.label}</strong>
            <span>{item.key === 'source' ? 'Demand origin' : item.key === 'channel' ? 'Route to market' : 'Market location'}</span>
          </button>
        ))}
      </div>

      <div className="calendar-range-panel" aria-label="Custom period selector">
        <div>
          <p className="eyebrow">Period</p>
          <strong>{periodCopy}</strong>
          <span>Choose dates. BizDATA uses the closest supported analytics window while preserving your selected period on screen.</span>
        </div>
        <label>
          <span>Start date</span>
          <input max={endDate} type="date" value={startDate} onChange={(event) => updateDates(event.target.value, endDate)} />
        </label>
        <label>
          <span>End date</span>
          <input min={startDate} type="date" value={endDate} onChange={(event) => updateDates(startDate, event.target.value)} />
        </label>
      </div>
    </section>
  );
}
