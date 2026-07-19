import type {
  AdvancedAnalysisMethod,
  AdvancedAnalysisMethodKey,
  AdvancedAnalysisMetric,
  AdvancedAnalysisResult,
  AdvancedAnalysisRow,
  AdvancedAnalysisSeriesPoint,
  AdvancedAnalyticsSummary,
  ColumnProfile,
} from '../shared/analytics';

type DataRow = Record<string, string>;

type NumericColumn = ColumnProfile & { type: 'number' };
type DateColumn = ColumnProfile & { type: 'date' };

const methodCopy: Record<AdvancedAnalysisMethodKey, { title: string; description: string; requiredFields: string[] }> = {
  regression: {
    title: 'Regression',
    description: 'Estimate how one numeric measure changes as another numeric predictor changes.',
    requiredFields: ['Numeric target', 'Numeric predictor'],
  },
  correlation: {
    title: 'Correlation',
    description: 'Find numeric fields that move together and deserve deeper explanation.',
    requiredFields: ['Two or more numeric fields'],
  },
  forecasting: {
    title: 'Forecasting',
    description: 'Project the next periods from dated numeric activity.',
    requiredFields: ['Date field', 'Numeric metric'],
  },
  'anomaly-detection': {
    title: 'Anomaly detection',
    description: 'Flag unusually high or low records using transparent statistical thresholds.',
    requiredFields: ['Numeric metric'],
  },
  segmentation: {
    title: 'Segmentation',
    description: 'Compare totals, averages, and contribution share across groups.',
    requiredFields: ['Category field', 'Numeric metric'],
  },
  distribution: {
    title: 'Distribution',
    description: 'Understand spread, quartiles, buckets, and outlier pressure for a metric.',
    requiredFields: ['Numeric metric'],
  },
  trend: {
    title: 'Trend',
    description: 'Aggregate a numeric metric by date and compare period movement.',
    requiredFields: ['Date field', 'Numeric metric'],
  },
  ranking: {
    title: 'Ranking',
    description: 'Rank top and bottom groups or records by a selected numeric measure.',
    requiredFields: ['Group or identifier field', 'Numeric metric'],
  },
  'what-if': {
    title: 'What-if scenario',
    description: 'Model a simple percentage uplift or reduction on a baseline metric.',
    requiredFields: ['Numeric metric'],
  },
};

const methodOrder = Object.keys(methodCopy) as AdvancedAnalysisMethodKey[];

function cleanNumber(value: string | undefined) {
  if (!value) return null;
  const number = Number(value.replace(/[$,%\s]/g, ''));
  return Number.isFinite(number) ? number : null;
}

function round(value: number, places = 2) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function format(value: number) {
  return Math.round(value).toLocaleString('en-US');
}

function numericValues(rows: DataRow[], column: string) {
  return rows.map((row) => cleanNumber(row[column])).filter((value): value is number => value != null);
}

function numericPairs(rows: DataRow[], xColumn: string, yColumn: string) {
  return rows
    .map((row) => ({ x: cleanNumber(row[xColumn]), y: cleanNumber(row[yColumn]) }))
    .filter((point): point is { x: number; y: number } => point.x != null && point.y != null);
}

function mean(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function quantile(values: number[], ratio: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * ratio)));
  return sorted[index];
}

function variance(values: number[]) {
  if (values.length < 2) return 0;
  const avg = mean(values);
  return values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length;
}

function robustPairs(pairs: Array<{ x: number; y: number }>) {
  if (pairs.length < 4) return pairs;
  const xs = pairs.map((point) => point.x);
  const ys = pairs.map((point) => point.y);
  const xQ1 = quantile(xs, 0.25);
  const xQ3 = quantile(xs, 0.75);
  const yQ1 = quantile(ys, 0.25);
  const yQ3 = quantile(ys, 0.75);
  const xIqr = xQ3 - xQ1;
  const yIqr = yQ3 - yQ1;
  const filtered = pairs.filter((point) => point.x >= xQ1 - 1.5 * xIqr && point.x <= xQ3 + 1.5 * xIqr && point.y >= yQ1 - 1.5 * yIqr && point.y <= yQ3 + 1.5 * yIqr);
  return filtered.length >= 3 ? filtered : pairs;
}
function pearson(pairs: Array<{ x: number; y: number }>) {
  if (pairs.length < 2) return 0;
  const avgX = mean(pairs.map((point) => point.x));
  const avgY = mean(pairs.map((point) => point.y));
  const numerator = pairs.reduce((sum, point) => sum + (point.x - avgX) * (point.y - avgY), 0);
  const denominatorX = Math.sqrt(pairs.reduce((sum, point) => sum + (point.x - avgX) ** 2, 0));
  const denominatorY = Math.sqrt(pairs.reduce((sum, point) => sum + (point.y - avgY) ** 2, 0));
  const denominator = denominatorX * denominatorY;
  return denominator ? numerator / denominator : 0;
}

function metric(label: string, value: string, sentiment: AdvancedAnalysisMetric['sentiment'], rawValue?: number): AdvancedAnalysisMetric {
  return { label, rawValue, sentiment, value };
}

function rowsToSeries(rows: DataRow[], dateColumn: string, metricColumn: string): AdvancedAnalysisSeriesPoint[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const timestamp = Date.parse(row[dateColumn] ?? '');
    const value = cleanNumber(row[metricColumn]);
    if (!Number.isFinite(timestamp) || value == null) continue;
    const key = new Date(timestamp).toISOString().slice(0, 10);
    totals.set(key, (totals.get(key) ?? 0) + value);
  }
  return Array.from(totals.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-24)
    .map(([name, value]) => ({ kind: 'actual', name, value: round(value) }));
}

function segmentColumn(columns: ColumnProfile[]) {
  return columns.find((column) => column.type === 'text' && column.unique > 1 && column.unique <= 40);
}

function identityOrSegmentColumn(columns: ColumnProfile[]) {
  return segmentColumn(columns) ?? columns.find((column) => column.type === 'text');
}

function baseResult(method: AdvancedAnalysisMethodKey, status: AdvancedAnalysisResult['status'], summary: string): AdvancedAnalysisResult {
  return {
    method,
    metrics: [],
    primaryFields: {},
    recommendations: [],
    rows: [],
    series: [],
    status,
    summary,
    title: methodCopy[method].title,
    warnings: [],
  };
}

function regression(rows: DataRow[], numericColumns: NumericColumn[]): AdvancedAnalysisResult {
  const target = numericColumns[0];
  const predictor = numericColumns[1];
  if (!target || !predictor) return baseResult('regression', 'unavailable', 'Regression needs at least two numeric fields.');
  const pairs = numericPairs(rows, predictor.name, target.name);
  if (pairs.length < 3) return baseResult('regression', 'unavailable', 'Regression needs at least three complete numeric records.');

  const yValues = pairs.map((point) => point.y);
  const q1 = quantile(yValues, 0.25);
  const q3 = quantile(yValues, 0.75);
  const iqr = q3 - q1;
  const lower = q1 - 1.5 * iqr;
  const upper = q3 + 1.5 * iqr;
  const fitPairs = pairs.filter((point) => point.y >= lower && point.y <= upper);
  const modelPairs = fitPairs.length >= 3 ? fitPairs : pairs;
  const avgX = mean(modelPairs.map((point) => point.x));
  const avgY = mean(modelPairs.map((point) => point.y));
  const slopeDenominator = modelPairs.reduce((sum, point) => sum + (point.x - avgX) ** 2, 0);
  const slope = slopeDenominator ? modelPairs.reduce((sum, point) => sum + (point.x - avgX) * (point.y - avgY), 0) / slopeDenominator : 0;
  const intercept = avgY - slope * avgX;
  const r = pearson(modelPairs);
  const rSquared = r ** 2;
  const residuals = pairs.map((point) => point.y - (intercept + slope * point.x));

  return {
    ...baseResult('regression', 'ready', `${target.name} tends to move ${slope >= 0 ? 'up' : 'down'} as ${predictor.name} changes.`),
    metrics: [
      metric('Slope', round(slope, 4).toString(), slope >= 0 ? 'positive' : 'warning', slope),
      metric('Intercept', round(intercept, 2).toString(), 'neutral', intercept),
      metric('R-squared', `${round(rSquared * 100, 1)}%`, rSquared >= 0.55 ? 'positive' : 'warning', rSquared),
      metric('Records', format(pairs.length), 'neutral', pairs.length),
    ],
    primaryFields: { predictor: predictor.name, target: target.name },
    recommendations: [`Use ${predictor.name} as a first explanatory variable for ${target.name}.`, 'Treat this as directional insight; validate causality before making policy decisions.'],
    rows: pairs.slice(0, 12).map((point, index) => ({ label: `Record ${index + 1}`, cells: { actual: point.y, predicted: round(intercept + slope * point.x, 2), predictor: point.x, residual: round(residuals[index], 2) } })),
    series: pairs.slice(0, 24).map((point, index) => ({ comparison: round(intercept + slope * point.x, 2), kind: 'prediction', name: String(index + 1), value: point.y })),
  };
}

function correlation(rows: DataRow[], numericColumns: NumericColumn[]): AdvancedAnalysisResult {
  if (numericColumns.length < 2) return baseResult('correlation', 'unavailable', 'Correlation needs at least two numeric fields.');
  const pairs: AdvancedAnalysisRow[] = [];
  for (let left = 0; left < numericColumns.length; left += 1) {
    for (let right = left + 1; right < numericColumns.length; right += 1) {
      const x = numericColumns[left].name;
      const y = numericColumns[right].name;
      const pairValues = numericPairs(rows, x, y);
      const value = pearson(robustPairs(pairValues));
      const resolution = round((numericColumns[left].unique + numericColumns[right].unique) / Math.max(rows.length * 2, 1), 3);
      pairs.push({ label: `${x} / ${y}`, cells: { correlation: round(value, 3), pair: `${x} / ${y}`, resolution, strength: Math.abs(value) >= 0.7 ? 'Strong' : Math.abs(value) >= 0.35 ? 'Moderate' : 'Weak' } });
    }
  }
  pairs.sort((a, b) => {
    const aStrong = a.cells.strength === 'Strong';
    const bStrong = b.cells.strength === 'Strong';
    if (aStrong && bStrong) return Number(b.cells.resolution) - Number(a.cells.resolution);
    const strengthDelta = Math.abs(Number(b.cells.correlation)) - Math.abs(Number(a.cells.correlation));
    if (Math.abs(strengthDelta) < 0.2) return Number(b.cells.resolution) - Number(a.cells.resolution);
    return strengthDelta;
  });
  return {
    ...baseResult('correlation', 'ready', 'Strong pairings reveal fields that move together and may explain business drivers.'),
    metrics: [metric('Pairs checked', format(pairs.length), 'neutral', pairs.length), metric('Strong pairs', format(pairs.filter((row) => row.cells.strength === 'Strong').length), 'positive')],
    primaryFields: { fields: numericColumns.map((column) => column.name).join(', ') },
    recommendations: ['Use strong correlations to select candidates for regression or what-if modeling.', 'Investigate weak correlations before assuming two KPIs are related.'],
    rows: pairs.slice(0, 12),
  };
}

function forecasting(rows: DataRow[], dateColumns: DateColumn[], numericColumns: NumericColumn[]): AdvancedAnalysisResult {
  const date = dateColumns[0];
  const target = numericColumns[0];
  if (!date || !target) return baseResult('forecasting', 'unavailable', 'Forecasting needs one date field and one numeric metric.');
  const actual = rowsToSeries(rows, date.name, target.name);
  if (actual.length < 3) return baseResult('forecasting', 'unavailable', 'Forecasting needs at least three dated periods.');
  const changes = actual.slice(1).map((point, index) => point.value - actual[index].value);
  const avgChange = mean(changes);
  const last = actual[actual.length - 1];
  const forecast = [1, 2, 3].map((step) => ({ kind: 'forecast' as const, name: `Forecast ${step}`, value: Math.max(0, round(last.value + avgChange * step)) }));
  return {
    ...baseResult('forecasting', 'ready', `${target.name} is projected with a ${avgChange >= 0 ? 'rising' : 'falling'} short-term trend.`),
    metrics: [metric('Periods', format(actual.length), 'neutral', actual.length), metric('Avg movement', round(avgChange, 2).toString(), avgChange >= 0 ? 'positive' : 'warning', avgChange)],
    primaryFields: { date: date.name, metric: target.name },
    recommendations: ['Use the forecast as an operating signal, not a locked budget.', 'Add more history for stronger seasonality and confidence.'],
    series: [...actual, ...forecast],
    warnings: actual.length < 8 ? ['Forecast confidence is limited because the dataset has short history.'] : [],
  };
}

function anomalies(rows: DataRow[], numericColumns: NumericColumn[]): AdvancedAnalysisResult {
  const target = numericColumns[0];
  if (!target) return baseResult('anomaly-detection', 'unavailable', 'Anomaly detection needs one numeric metric.');
  const values = numericValues(rows, target.name);
  if (values.length < 4) return baseResult('anomaly-detection', 'unavailable', 'Anomaly detection needs at least four numeric values.');
  const q1 = quantile(values, 0.25);
  const q3 = quantile(values, 0.75);
  const iqr = q3 - q1;
  const lower = q1 - 1.5 * iqr;
  const upper = q3 + 1.5 * iqr;
  const flagged = rows
    .map((row, index) => ({ index, value: cleanNumber(row[target.name]) }))
    .filter((item): item is { index: number; value: number } => item.value != null && (item.value < lower || item.value > upper))
    .sort((a, b) => Math.abs(b.value - mean(values)) - Math.abs(a.value - mean(values)));
  return {
    ...baseResult('anomaly-detection', 'ready', `${flagged.length} unusual ${target.name} records were found using IQR thresholds.`),
    metrics: [metric('Anomalies', format(flagged.length), flagged.length ? 'warning' : 'positive', flagged.length), metric('Upper threshold', round(upper, 2).toString(), 'neutral', upper)],
    primaryFields: { metric: target.name },
    recommendations: flagged.length ? ['Review the highest anomalies before sharing management reports.', 'Compare anomalies against segment and date fields to find root causes.'] : ['No major numeric outliers were detected for the selected metric.'],
    rows: flagged.slice(0, 12).map((item) => ({ label: `Row ${item.index + 1}`, cells: { threshold: round(upper, 2), value: item.value } })),
  };
}

function segmentation(rows: DataRow[], columns: ColumnProfile[], numericColumns: NumericColumn[]): AdvancedAnalysisResult {
  const segment = segmentColumn(columns);
  const target = numericColumns[0];
  if (!segment || !target) return baseResult('segmentation', 'unavailable', 'Segmentation needs one category field and one numeric metric.');
  const groups = new Map<string, { count: number; total: number }>();
  for (const row of rows) {
    const key = (row[segment.name] || 'Blank').slice(0, 80);
    const value = cleanNumber(row[target.name]);
    if (value == null) continue;
    const group = groups.get(key) ?? { count: 0, total: 0 };
    group.count += 1;
    group.total += value;
    groups.set(key, group);
  }
  const total = Array.from(groups.values()).reduce((sum, group) => sum + group.total, 0) || 1;
  const resultRows = Array.from(groups.entries())
    .map(([label, group]) => ({ label, cells: { average: round(group.total / group.count, 2), count: group.count, share: round((group.total / total) * 100, 1), total: round(group.total, 2) } }))
    .sort((a, b) => Number(b.cells.total) - Number(a.cells.total));
  return {
    ...baseResult('segmentation', 'ready', `${segment.name} shows where ${target.name} is concentrated.`),
    metrics: [metric('Segments', format(resultRows.length), 'neutral', resultRows.length), metric('Top share', `${resultRows[0]?.cells.share ?? 0}%`, 'positive', Number(resultRows[0]?.cells.share ?? 0))],
    primaryFields: { metric: target.name, segment: segment.name },
    recommendations: [`Use ${segment.name} as a report slicer for ${target.name}.`, 'Investigate top-contributing segments for concentration or growth opportunities.'],
    rows: resultRows.slice(0, 12),
  };
}

function distribution(numericColumns: NumericColumn[], rows: DataRow[]): AdvancedAnalysisResult {
  const target = numericColumns[0];
  if (!target) return baseResult('distribution', 'unavailable', 'Distribution needs one numeric metric.');
  const values = numericValues(rows, target.name);
  if (values.length < 2) return baseResult('distribution', 'unavailable', 'Distribution needs at least two numeric values.');
  const min = Math.min(...values);
  const max = Math.max(...values);
  const bucketCount = Math.min(6, Math.max(3, Math.ceil(Math.sqrt(values.length))));
  const width = Math.max((max - min) / bucketCount, 1);
  const buckets = Array.from({ length: bucketCount }, (_, index) => ({ count: 0, from: min + width * index, to: index === bucketCount - 1 ? max : min + width * (index + 1) }));
  for (const value of values) {
    const index = Math.min(bucketCount - 1, Math.floor((value - min) / width));
    buckets[index].count += 1;
  }
  return {
    ...baseResult('distribution', 'ready', `${target.name} ranges from ${round(min)} to ${round(max)} across ${values.length} records.`),
    metrics: [metric('Average', round(mean(values), 2).toString(), 'neutral', mean(values)), metric('Median', round(median(values), 2).toString(), 'neutral', median(values)), metric('Std dev', round(Math.sqrt(variance(values)), 2).toString(), 'neutral')],
    primaryFields: { metric: target.name },
    recommendations: ['Use quartiles to set operating thresholds.', 'Check outlier-heavy distributions before forecasting.'],
    rows: [
      { label: 'Quartiles', cells: { max: round(max, 2), median: round(median(values), 2), min: round(min, 2), q1: round(quantile(values, 0.25), 2), q3: round(quantile(values, 0.75), 2) } },
    ],
    series: buckets.map((bucket) => ({ kind: 'bucket', name: `${round(bucket.from)}-${round(bucket.to)}`, value: bucket.count })),
  };
}

function trend(rows: DataRow[], dateColumns: DateColumn[], numericColumns: NumericColumn[]): AdvancedAnalysisResult {
  const date = dateColumns[0];
  const target = numericColumns[0];
  if (!date || !target) return baseResult('trend', 'unavailable', 'Trend analysis needs one date field and one numeric metric.');
  const series = rowsToSeries(rows, date.name, target.name);
  if (series.length < 2) return baseResult('trend', 'unavailable', 'Trend analysis needs at least two dated periods.');
  const first = series[0].value;
  const last = series[series.length - 1].value;
  const movement = first ? ((last - first) / Math.abs(first)) * 100 : 0;
  return {
    ...baseResult('trend', 'ready', `${target.name} moved ${round(movement, 1)}% from the first to latest period.`),
    metrics: [metric('Periods', format(series.length), 'neutral', series.length), metric('Movement', `${round(movement, 1)}%`, movement >= 0 ? 'positive' : 'warning', movement)],
    primaryFields: { date: date.name, metric: target.name },
    recommendations: ['Use this trend in the report builder for management monitoring.', 'Pair trend movement with anomaly checks to explain spikes.'],
    series,
  };
}

function ranking(rows: DataRow[], columns: ColumnProfile[], numericColumns: NumericColumn[]): AdvancedAnalysisResult {
  const dimension = identityOrSegmentColumn(columns);
  const target = numericColumns[0];
  if (!dimension || !target) return baseResult('ranking', 'unavailable', 'Ranking needs one dimension and one numeric metric.');
  const groups = new Map<string, number>();
  for (const row of rows) {
    const value = cleanNumber(row[target.name]);
    if (value == null) continue;
    const key = (row[dimension.name] || 'Blank').slice(0, 80);
    groups.set(key, (groups.get(key) ?? 0) + value);
  }
  const total = Array.from(groups.values()).reduce((sum, value) => sum + value, 0) || 1;
  const ranked = Array.from(groups.entries())
    .map(([label, value]) => ({ label, cells: { share: round((value / total) * 100, 1), value: round(value, 2) } }))
    .sort((a, b) => Number(b.cells.value) - Number(a.cells.value));
  return {
    ...baseResult('ranking', 'ready', `${dimension.name} ranking highlights the highest contributors to ${target.name}.`),
    metrics: [metric('Ranked items', format(ranked.length), 'neutral', ranked.length), metric('Top value', format(Number(ranked[0]?.cells.value ?? 0)), 'positive')],
    primaryFields: { dimension: dimension.name, metric: target.name },
    recommendations: ['Monitor top and bottom ranked groups separately.', 'Use contribution share to focus action where it changes the total.'],
    rows: ranked.slice(0, 12),
  };
}

function whatIf(rows: DataRow[], numericColumns: NumericColumn[]): AdvancedAnalysisResult {
  const target = numericColumns[0];
  if (!target) return baseResult('what-if', 'unavailable', 'What-if analysis needs one numeric metric.');
  const baseline = numericValues(rows, target.name).reduce((sum, value) => sum + value, 0);
  const uplift = baseline * 1.05;
  const reduction = baseline * 0.95;
  return {
    ...baseResult('what-if', 'ready', `A 5% movement in ${target.name} changes the baseline by ${format(Math.abs(uplift - baseline))}.`),
    metrics: [metric('Baseline', format(baseline), 'neutral', baseline), metric('5% uplift', format(uplift), 'positive', uplift), metric('5% reduction', format(reduction), 'warning', reduction)],
    primaryFields: { metric: target.name, scenario: '5%' },
    recommendations: [`Use ${target.name} scenario movement for planning conversations.`, 'Add segment filters to turn this into targeted action planning.'],
    rows: [
      { label: 'Baseline', cells: { delta: 0, value: round(baseline, 2) } },
      { label: '5% uplift', cells: { delta: round(uplift - baseline, 2), value: round(uplift, 2) } },
      { label: '5% reduction', cells: { delta: round(reduction - baseline, 2), value: round(reduction, 2) } },
    ],
  };
}

function buildMethods(columns: ColumnProfile[]): AdvancedAnalysisMethod[] {
  const numericColumns = columns.filter((column): column is NumericColumn => column.type === 'number');
  const dateColumns = columns.filter((column): column is DateColumn => column.type === 'date');
  const segment = segmentColumn(columns);
  const identity = identityOrSegmentColumn(columns);
  const suggestions = {
    numeric: numericColumns.map((column) => column.name),
    date: dateColumns.map((column) => column.name),
    segment: [segment?.name, identity?.name].filter((value): value is string => Boolean(value)),
  };

  const enabled: Record<AdvancedAnalysisMethodKey, boolean> = {
    regression: numericColumns.length >= 2,
    correlation: numericColumns.length >= 2,
    forecasting: dateColumns.length >= 1 && numericColumns.length >= 1,
    'anomaly-detection': numericColumns.length >= 1,
    segmentation: Boolean(segment) && numericColumns.length >= 1,
    distribution: numericColumns.length >= 1,
    trend: dateColumns.length >= 1 && numericColumns.length >= 1,
    ranking: Boolean(identity) && numericColumns.length >= 1,
    'what-if': numericColumns.length >= 1,
  };

  return methodOrder.map((key) => ({
    ...methodCopy[key],
    disabledReason: enabled[key] ? undefined : `${methodCopy[key].title} needs ${methodCopy[key].requiredFields.join(' and ').toLowerCase()}.`,
    enabled: enabled[key],
    key,
    suggestedFields: key === 'forecasting' || key === 'trend' ? [...suggestions.date, ...suggestions.numeric] : key === 'segmentation' || key === 'ranking' ? [...suggestions.segment, ...suggestions.numeric] : suggestions.numeric,
  }));
}

export function buildAdvancedAnalytics(rows: DataRow[], columns: ColumnProfile[]): AdvancedAnalyticsSummary {
  const safeRows = rows.slice(0, 10000);
  const numericColumns = columns.filter((column): column is NumericColumn => column.type === 'number');
  const dateColumns = columns.filter((column): column is DateColumn => column.type === 'date');
  const results = [
    regression(safeRows, numericColumns),
    correlation(safeRows, numericColumns),
    forecasting(safeRows, dateColumns, numericColumns),
    anomalies(safeRows, numericColumns),
    segmentation(safeRows, columns, numericColumns),
    distribution(numericColumns, safeRows),
    trend(safeRows, dateColumns, numericColumns),
    ranking(safeRows, columns, numericColumns),
    whatIf(safeRows, numericColumns),
  ];
  const methods = buildMethods(columns);

  return {
    methods,
    recommendedMethodKeys: methods.filter((method) => method.enabled).slice(0, 4).map((method) => method.key),
    results,
  };
}







