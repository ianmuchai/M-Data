import { useCallback, useEffect, useState } from 'react';
import type { AnalyticsResponse, CategoryKey, RangeKey } from '../../shared/analytics';
import { loadAnalytics } from '../api/analytics';

type AnalyticsState = {
  data: AnalyticsResponse | null;
  error: string | null;
  loading: boolean;
  refresh: (signal?: AbortSignal) => Promise<void>;
};

export function useAnalytics(category: CategoryKey, range: RangeKey, autoRefresh: boolean): AnalyticsState {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);

      try {
        setData(await loadAnalytics(category, range, signal));
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') {
          return;
        }

        setError(requestError instanceof Error ? requestError.message : 'Unable to load analytics');
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [category, range],
  );

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);

    return () => controller.abort();
  }, [refresh]);

  useEffect(() => {
    if (!autoRefresh) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      void refresh();
    }, 30000);

    return () => window.clearInterval(interval);
  }, [autoRefresh, refresh]);

  return { data, error, loading, refresh };
}
