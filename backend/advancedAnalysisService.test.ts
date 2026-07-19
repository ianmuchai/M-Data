import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ColumnProfile } from '../shared/analytics';
import { buildAdvancedAnalytics } from './advancedAnalysisService';

const rows = [
  { date: '2026-01-01', region: 'North', sales: '10', units: '2', risk: '1' },
  { date: '2026-01-02', region: 'North', sales: '20', units: '4', risk: '1' },
  { date: '2026-01-03', region: 'South', sales: '30', units: '6', risk: '2' },
  { date: '2026-01-04', region: 'South', sales: '40', units: '8', risk: '2' },
  { date: '2026-01-05', region: 'West', sales: '500', units: '10', risk: '9' },
];

const columns: ColumnProfile[] = [
  { name: 'date', type: 'date', missing: 0, unique: 5, sample: '2026-01-01', min: '2026-01-01', max: '2026-01-05' },
  { name: 'region', type: 'text', missing: 0, unique: 3, sample: 'North' },
  { name: 'sales', type: 'number', missing: 0, unique: 5, sample: '10', min: 10, max: 500, average: 120 },
  { name: 'units', type: 'number', missing: 0, unique: 5, sample: '2', min: 2, max: 10, average: 6 },
  { name: 'risk', type: 'number', missing: 0, unique: 3, sample: '1', min: 1, max: 9, average: 3 },
];

describe('buildAdvancedAnalytics', () => {
  it('enables every supported method when the uploaded dataset has numeric, date, and segment fields', () => {
    const result = buildAdvancedAnalytics(rows, columns);

    assert.deepEqual(
      result.methods.map((method) => [method.key, method.enabled]),
      [
        ['regression', true],
        ['correlation', true],
        ['forecasting', true],
        ['anomaly-detection', true],
        ['segmentation', true],
        ['distribution', true],
        ['trend', true],
        ['ranking', true],
        ['what-if', true],
      ],
    );
  });

  it('calculates a simple regression result with positive fit details', () => {
    const result = buildAdvancedAnalytics(rows, columns);
    const regression = result.results.find((item) => item.method === 'regression');

    assert.equal(regression?.status, 'ready');
    assert.equal(regression?.primaryFields.target, 'sales');
    assert.equal(regression?.primaryFields.predictor, 'units');
    assert.ok((regression?.metrics.find((metric) => metric.label === 'R-squared')?.rawValue ?? 0) > 0.8);
    assert.ok((regression?.series ?? []).length > 0);
  });

  it('ranks strong correlations and flags high numeric anomalies', () => {
    const result = buildAdvancedAnalytics(rows, columns);
    const correlation = result.results.find((item) => item.method === 'correlation');
    const anomalies = result.results.find((item) => item.method === 'anomaly-detection');

    assert.equal(correlation?.status, 'ready');
    assert.equal(correlation?.rows[0]?.cells.pair, 'sales / units');
    assert.ok(Number(correlation?.rows[0]?.cells.correlation) > 0.8);
    assert.equal(anomalies?.status, 'ready');
    assert.equal(anomalies?.rows[0]?.cells.value, 500);
  });

  it('returns segment, trend, forecast, distribution, ranking, and what-if summaries', () => {
    const result = buildAdvancedAnalytics(rows, columns);
    const methods = new Set(result.results.filter((item) => item.status === 'ready').map((item) => item.method));

    assert.ok(methods.has('segmentation'));
    assert.ok(methods.has('trend'));
    assert.ok(methods.has('forecasting'));
    assert.ok(methods.has('distribution'));
    assert.ok(methods.has('ranking'));
    assert.ok(methods.has('what-if'));
    assert.ok(result.results.find((item) => item.method === 'forecasting')?.series.some((point) => point.kind === 'forecast'));
  });
});
