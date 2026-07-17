import type { AnalyticsResponse, CategoryKey, RangeKey } from '../../shared/analytics';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '';

export async function loadAnalytics(category: CategoryKey, range: RangeKey, signal?: AbortSignal) {
  const params = new URLSearchParams({ category, range });
  const response = await fetch(`${apiBaseUrl}/api/analytics?${params.toString()}`, {
    headers: { Accept: 'application/json' },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Analytics request failed with ${response.status}`);
  }

  return response.json() as Promise<AnalyticsResponse>;
}
