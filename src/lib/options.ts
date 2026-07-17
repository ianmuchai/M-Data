import type { Category, RangeOption } from '../../shared/analytics';

export const fallbackCategories: Category[] = [
  { key: 'source', label: 'Source' },
  { key: 'channel', label: 'Channel' },
  { key: 'region', label: 'Region' },
];

export const fallbackRanges: RangeOption[] = [
  { key: '7d', label: '7D' },
  { key: '30d', label: '30D' },
  { key: '90d', label: '90D' },
];
