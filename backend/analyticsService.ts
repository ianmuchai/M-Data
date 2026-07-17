import type { AnalyticsResponse, CategoryKey, RangeKey } from '../shared/analytics';
import {
  baseTrendByCategory,
  breakdownByCategory,
  categories,
  categoryInsights,
  detailPointsByCategory,
  rangeMultiplier,
  ranges,
} from './analyticsData';

export function normalizeCategory(value: unknown): CategoryKey {
  return categories.some((category) => category.key === value) ? (value as CategoryKey) : 'source';
}

export function normalizeRange(value: unknown): RangeKey {
  return ranges.some((range) => range.key === value) ? (value as RangeKey) : '7d';
}

function buildTrend(category: CategoryKey, range: RangeKey): AnalyticsResponse['trend'] {
  const labels = getRangeLabels(range);
  const base = baseTrendByCategory[category];
  const multiplier = rangeMultiplier[range];

  return labels.map((name, index) => {
    const value = Math.round(base[index % base.length] * multiplier + index * 24);

    return {
      name,
      target: Math.round(value * 0.92),
      value,
    };
  });
}

function getRangeLabels(range: RangeKey) {
  if (range === '30d') {
    return ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Today'];
  }

  if (range === '90d') {
    return ['Apr', 'May', 'Jun', 'Jul'];
  }

  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
}

function buildMetrics(category: CategoryKey, range: RangeKey): AnalyticsResponse['metrics'] {
  const multiplier = rangeMultiplier[range];
  const users = Math.round(1248 * multiplier);
  const revenue = Math.round(39400 * multiplier);
  const latency = category === 'region' ? 124 : category === 'channel' ? 111 : 118;

  return [
    { label: 'Active users', value: users.toLocaleString('en-US'), delta: '+9.4%', sentiment: 'positive' },
    { label: 'Conversion', value: '8.9%', delta: '+1.1 pts', sentiment: 'positive' },
    { label: 'Revenue', value: `$${(revenue / 1000).toFixed(1)}K`, delta: '+12.3%', sentiment: 'positive' },
    {
      label: 'P95 latency',
      value: `${latency}ms`,
      delta: latency > 120 ? '+6ms' : '-14ms',
      sentiment: latency > 120 ? 'warning' : 'positive',
    },
  ];
}

function buildAlerts(category: CategoryKey, range: RangeKey): AnalyticsResponse['alerts'] {
  const alerts: AnalyticsResponse['alerts'] = [
    {
      detail: `${range.toUpperCase()} revenue is tracking 12.3% above the previous period.`,
      severity: 'info',
      title: 'Revenue pacing above goal',
    },
  ];

  if (category === 'region') {
    alerts.push({
      detail: 'P95 latency is 136ms, above the 120ms operating target.',
      severity: 'warning',
      title: 'APAC latency needs attention',
    });
  }

  if (category === 'source') {
    alerts.push({
      detail: 'Paid traffic has scale, but trails organic conversion by 2.6 points.',
      severity: 'warning',
      title: 'Paid conversion below organic',
    });
  }

  return alerts;
}

export function buildAnalyticsResponse(category: CategoryKey, range: RangeKey): AnalyticsResponse {
  return {
    alerts: buildAlerts(category, range),
    breakdown: breakdownByCategory[category],
    categories,
    detailPoints: detailPointsByCategory[category],
    generatedAt: new Date().toISOString(),
    insights: categoryInsights[category],
    metrics: buildMetrics(category, range),
    ranges,
    selectedCategory: category,
    selectedRange: range,
    summary: {
      change: '+12.3% vs previous period',
      recommendation:
        category === 'region'
          ? 'Regional performance is healthy, with APAC latency the main follow-up item.'
          : 'Conversion is improving while latency remains inside the target range.',
      score: category === 'region' ? 81 : 84,
      target: 80,
    },
    trend: buildTrend(category, range),
  };
}
