import type { AnalyticsResponse, CategoryKey, RangeKey } from '../shared/analytics';

export const categories: AnalyticsResponse['categories'] = [
  { key: 'source', label: 'Source' },
  { key: 'channel', label: 'Channel' },
  { key: 'region', label: 'Region' },
];

export const ranges: AnalyticsResponse['ranges'] = [
  { key: '7d', label: '7D' },
  { key: '30d', label: '30D' },
  { key: '90d', label: '90D' },
];

export const categoryInsights: Record<CategoryKey, AnalyticsResponse['insights']> = {
  source: [
    { label: 'Organic search', value: '42%' },
    { label: 'Paid acquisition', value: '31%' },
    { label: 'Partner referrals', value: '18%' },
    { label: 'Direct traffic', value: '9%' },
  ],
  channel: [
    { label: 'Web app', value: '58%' },
    { label: 'Mobile app', value: '27%' },
    { label: 'API clients', value: '15%' },
    { label: 'Self-serve exports', value: '4.8K' },
  ],
  region: [
    { label: 'Americas', value: '46%' },
    { label: 'EMEA', value: '34%' },
    { label: 'APAC', value: '20%' },
    { label: 'Fastest growth', value: 'EMEA' },
  ],
};

export const breakdownByCategory: Record<CategoryKey, AnalyticsResponse['breakdown']> = {
  source: [
    { name: 'Organic', users: 5240, conversion: 10.4, revenue: 18400, latency: 104 },
    { name: 'Paid', users: 3868, conversion: 7.8, revenue: 13200, latency: 126 },
    { name: 'Referral', users: 2246, conversion: 9.2, revenue: 5400, latency: 118 },
    { name: 'Direct', users: 1118, conversion: 6.1, revenue: 2400, latency: 112 },
  ],
  channel: [
    { name: 'Web', users: 7235, conversion: 9.8, revenue: 21300, latency: 112 },
    { name: 'Mobile', users: 3369, conversion: 8.1, revenue: 11600, latency: 124 },
    { name: 'API', users: 1868, conversion: 7.4, revenue: 6500, latency: 95 },
  ],
  region: [
    { name: 'Americas', users: 5738, conversion: 9.7, revenue: 17300, latency: 114 },
    { name: 'EMEA', users: 4240, conversion: 9.1, revenue: 14800, latency: 121 },
    { name: 'APAC', users: 2494, conversion: 7.3, revenue: 7300, latency: 136 },
  ],
};

export const detailPointsByCategory: Record<CategoryKey, AnalyticsResponse['detailPoints']> = {
  source: [
    { title: 'Best acquisition lane', value: 'Organic', caption: 'Highest conversion and lowest latency mix.', tone: 'teal' },
    { title: 'Efficiency gap', value: '2.6 pts', caption: 'Paid trails organic conversion by this margin.', tone: 'gold' },
    { title: 'Referral quality', value: '$5.4K', caption: 'Revenue is smaller but stable and low risk.', tone: 'blue' },
  ],
  channel: [
    { title: 'Primary experience', value: 'Web', caption: '58% of traffic with the strongest revenue base.', tone: 'teal' },
    { title: 'Mobile opportunity', value: '+1.7 pts', caption: 'Conversion lift needed to match web performance.', tone: 'coral' },
    { title: 'API reliability', value: '95ms', caption: 'Fastest P95 latency across all delivery channels.', tone: 'blue' },
    { title: 'Export demand', value: '4.8K', caption: 'Self-serve exports indicate strong repeat workflow usage.', tone: 'gold' },
  ],
  region: [
    { title: 'Largest market', value: 'Americas', caption: '46% contribution with conversion above target.', tone: 'teal' },
    { title: 'Growth leader', value: 'EMEA', caption: 'Fastest improvement in the current operating period.', tone: 'blue' },
    { title: 'Latency watch', value: 'APAC', caption: '136ms P95 latency is above the target guardrail.', tone: 'coral' },
    { title: 'Expansion balance', value: '3 regions', caption: 'Healthy geographic spread with no single-region dependency.', tone: 'gold' },
  ],
};

export const baseTrendByCategory: Record<CategoryKey, number[]> = {
  source: [240, 310, 270, 340, 420, 390, 460],
  channel: [180, 230, 260, 310, 365, 348, 401],
  region: [210, 260, 255, 330, 375, 410, 438],
};

export const rangeMultiplier: Record<RangeKey, number> = {
  '7d': 1,
  '30d': 3.9,
  '90d': 10.8,
};
