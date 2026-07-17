import { useMemo, useState } from 'react';
import type { BreakdownRow } from '../../shared/analytics';
import { currencyFormatter, numberFormatter } from '../lib/format';

type BreakdownTableProps = {
  rows: BreakdownRow[];
};

type SortKey = keyof BreakdownRow;
type SortDirection = 'asc' | 'desc';

const columns: Array<{ align?: 'left' | 'right'; key: SortKey; label: string }> = [
  { align: 'left', key: 'name', label: 'Segment' },
  { key: 'users', label: 'Users' },
  { key: 'conversion', label: 'Conversion' },
  { key: 'revenue', label: 'Revenue' },
  { key: 'latency', label: 'P95 latency' },
];

function compareRows(a: BreakdownRow, b: BreakdownRow, key: SortKey) {
  if (key === 'name') {
    return a.name.localeCompare(b.name);
  }

  return a[key] - b[key];
}

export function BreakdownTable({ rows }: BreakdownTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('revenue');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const result = compareRows(a, b, sortKey);
      return sortDirection === 'asc' ? result : -result;
    });
  }, [rows, sortDirection, sortKey]);

  const updateSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(key);
    setSortDirection(key === 'name' ? 'asc' : 'desc');
  };

  return (
    <section className="panel table-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Segment breakdown</p>
          <h3>Compare operating inputs</h3>
        </div>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th className={column.align === 'left' ? 'align-left' : undefined} key={column.key}>
                  <button
                    aria-label={`Sort by ${column.label}`}
                    className={sortKey === column.key ? 'active' : undefined}
                    data-tooltip={`Sort by ${column.label.toLowerCase()}`}
                    onClick={() => updateSort(column.key)}
                    type="button"
                  >
                    {column.label}
                    {sortKey === column.key ? <span>{sortDirection === 'asc' ? 'up' : 'down'}</span> : null}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.length > 0 ? (
              sortedRows.map((row) => (
                <tr key={row.name}>
                  <td>{row.name}</td>
                  <td>{numberFormatter.format(row.users)}</td>
                  <td>{row.conversion.toFixed(1)}%</td>
                  <td>{currencyFormatter.format(row.revenue)}</td>
                  <td>
                    <span className={row.latency > 120 ? 'latency-warning' : undefined}>{row.latency}ms</span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="empty-cell" colSpan={columns.length}>
                  No segment data available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
