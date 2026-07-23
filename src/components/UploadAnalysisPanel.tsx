import { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import type { UploadAnalysisOption, UploadAnalysisResponse, UploadFilterView } from '../../shared/analytics';
import { analyzeUploadedData } from '../api/uploadAnalysis';
import { formatTimestamp, numberFormatter } from '../lib/format';
import { downloadAnalysisWorkbook, downloadUploadAnalysisJson } from '../lib/uploadExports';

const acceptedTypes =
  '.csv,.tsv,.txt,.json,.xlsx,.xls,.xlsm,.xlsb,text/csv,text/tab-separated-values,text/plain,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/vnd.ms-excel.sheet.macroEnabled.12,application/vnd.ms-excel.sheet.binary.macroEnabled.12';

function formatValue(value: number) {
  return numberFormatter.format(Math.round(value));
}

function safeSheetName(value: string) {
  return value.replace(/[\\/?*:[\]]/g, ' ').slice(0, 31) || 'Filtered data';
}

function downloadFilterWorkbook(fileName: string, filter: UploadFilterView) {
  const worksheet = XLSX.utils.json_to_sheet(filter.rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName(filter.title));
  const baseName = fileName.replace(/\.[^.]+$/, '') || 'uploaded-data';
  XLSX.writeFile(workbook, `${baseName}-${filter.key}.xlsx`);
}

function FilterViewDetail({ fileName, filter }: { fileName: string; filter: UploadFilterView }) {
  const previewColumns = filter.columns.slice(0, 8);
  const previewRows = filter.rows.slice(0, 12);

  return (
    <div className="filter-view-detail">
      <div className="panel-header compact">
        <div>
          <p className="eyebrow">Filtered file view</p>
          <h3>{filter.title}</h3>
          <span>{filter.description}</span>
        </div>
        <button
          className="install-button"
          data-tooltip="Download these filtered records as an Excel workbook"
          onClick={() => downloadFilterWorkbook(fileName, filter)}
          type="button"
        >
          Download Excel
        </button>
      </div>

      <div className="metrics-grid upload-metrics" aria-label={`${filter.title} filter metrics`}>
        {filter.metrics.map((metric) => (
          <article className="metric-card compact-card" key={metric.label}>
            <div>
              <p>{metric.label}</p>
              <h3>{metric.value}</h3>
            </div>
            <span className={`delta ${metric.sentiment}`}>{metric.delta}</span>
          </article>
        ))}
      </div>

      <div className="filter-meta">
        <span>{numberFormatter.format(filter.rowCount)} matching rows</span>
        <span>Matched by {filter.matchedBy}</span>
        <span>{filter.rows.length < filter.rowCount ? `${numberFormatter.format(filter.rows.length)} rows prepared for download` : 'Full filtered set ready'}</span>
      </div>

      <div className="analysis-table-card">
        <div className="panel-header compact">
          <div>
            <p className="eyebrow">Preview</p>
            <h3>Filtered records ready to view or export</h3>
          </div>
        </div>
        <div className="analysis-table-scroll">
          <table className="analysis-table filter-preview-table">
            <thead>
              <tr>
                {previewColumns.map((column) => (
                  <th className="align-left" key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, index) => (
                <tr key={`${filter.key}-${index}`}>
                  {previewColumns.map((column) => (
                    <td key={column}>{row[column] || '-'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="recommendation-list">
        {filter.recommendations.map((recommendation) => (
          <div className="recommendation-item" key={recommendation}>
            {recommendation}
          </div>
        ))}
      </div>
    </div>
  );
}

function plainMarketName(key: string) {
  const labels: Record<string, string> = {
    'agriculture-food': 'Agriculture and food supply',
    'banking-credit': 'Banking and lending',
    'education-training': 'Education and training',
    'energy-utilities': 'Energy and utilities',
    'finance-planning': 'Finance and planning',
    'healthcare-clinics': 'Healthcare',
    'hospitality-travel': 'Hospitality and travel',
    'hr-workforce': 'HR and workforce',
    'insurance-risk': 'Insurance and claims',
    'legal-compliance': 'Legal and compliance',
    'manufacturing-production': 'Manufacturing',
    'marketing-sales-crm': 'Marketing and sales',
    'media-entertainment': 'Media and entertainment',
    'operations-supply-chain': 'Operations and supply chain',
    'public-sector-ngo': 'Government and NGO programs',
    'real-estate-property': 'Real estate and property',
    'retail-commerce': 'Retail and commerce',
    'telecom-subscription': 'Telecom and subscriptions',
    'transport-mobility': 'Transport and mobility',
  };

  return labels[key] ?? key.replace(/-/g, ' ');
}
function plainRoleLabel(role: string) {
  const labels: Record<string, string> = {
    cost_or_loss_measure: 'Cost or loss field',
    descriptive_attribute: 'Description field',
    exposure_measure: 'Balance or exposure field',
    identifier: 'ID or reference field',
    inventory_position: 'Stock level field',
    numeric_measure: 'Number field',
    risk_indicator: 'Risk field',
    segment_dimension: 'Group or category',
    time_period: 'Date field',
    value_measure: 'Money or value field',
    volume_measure: 'Units or quantity field',
  };

  return labels[role] ?? role.replace(/_/g, ' ');
}
function IntelligencePanel({ analysis }: { analysis: UploadAnalysisResponse }) {
  const topRoles = analysis.roleInsights.slice(0, 10);

  return (
    <div className="intelligence-panel">
      <div className="panel-header compact">
        <div>
          <p className="eyebrow">Smart file understanding</p>
          <h3>Likely business type, key things to watch, and detected fields</h3>
        </div>
        <span className="badge">{analysis.learningSummary.datasetsSeen} files learned</span>
      </div>

      <div className="learning-summary">
        <strong>{analysis.learningSummary.message}</strong>
        <span>
          {numberFormatter.format(analysis.learningSummary.learnedFields)} field patterns learned
          {analysis.learningSummary.strongestMarkets.length > 0 ? ` | most common business types: ${analysis.learningSummary.strongestMarkets.map(plainMarketName).join(', ')}` : ''}
        </span>
      </div>

      {analysis.marketSignals.length > 0 ? (
        <div className="market-signal-grid">
          {analysis.marketSignals.map((market) => (
            <article className="market-signal" key={market.key}>
              <div>
                <strong>{market.title}</strong>
                <span>{market.confidence}% match | {market.matchedFields.length} fields found</span>
              </div>
              <div className="analysis-columns">
                {market.recommendedParameters.slice(0, 8).map((parameter) => (
                  <span key={parameter}>{parameter}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : null}

      <div className="role-chip-grid" aria-label="Detected field meanings">
        {topRoles.map((role) => (
          <article className="role-chip" key={role.column} data-tooltip={role.reason}>
            <strong>{role.column}</strong>
            <span>{plainRoleLabel(role.role)} | {role.confidence}% sure</span>
          </article>
        ))}
      </div>
    </div>
  );
}

export function CustomAnalysisStudio({ analysis }: { analysis: UploadAnalysisResponse }) {
  const numericColumns = analysis.columns.filter((column) => column.type === 'number');
  const dimensionColumns = analysis.columns.filter((column) => column.type !== 'number');
  const [metric, setMetric] = useState(numericColumns[0]?.name ?? '');
  const [dimension, setDimension] = useState(dimensionColumns[0]?.name ?? analysis.columns[0]?.name ?? '');
  const [filterField, setFilterField] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [rankField, setRankField] = useState(numericColumns[0]?.name ?? '');
  const [rankDirection, setRankDirection] = useState<'desc' | 'asc'>('desc');
  const [mode, setMode] = useState<'total' | 'average' | 'count' | 'variance' | 'share' | 'top-bottom'>('average');

  const metricProfile = analysis.columns.find((column) => column.name === metric);
  const metricRole = analysis.columnAnalyses.find((column) => column.name === metric)?.role ?? '';
  const isAdditiveMetric = Boolean(metricProfile && metricProfile.type === 'number' && !/reorder|point|threshold|score|rate|ratio|percent|percentage|age|rank|level/i.test(metricProfile.name + ' ' + metricRole));
  const primaryValueLabel = isAdditiveMetric ? 'Total' : 'Typical value';

  const filteredRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const rows = analysis.analysisRows.filter((row) => {
      const matchesFilter = !filterField || !filterValue || row[filterField] === filterValue;
      const matchesSearch = !query || Object.values(row).some((value) => String(value).toLowerCase().includes(query));
      return matchesFilter && matchesSearch;
    });

    if (!rankField) return rows;
    return [...rows].sort((a, b) => {
      const left = Number(String(a[rankField] ?? '').replace(/[$,%\s]/g, ''));
      const right = Number(String(b[rankField] ?? '').replace(/[$,%\s]/g, ''));
      const leftValue = Number.isFinite(left) ? left : Number.NEGATIVE_INFINITY;
      const rightValue = Number.isFinite(right) ? right : Number.NEGATIVE_INFINITY;
      return rankDirection === 'desc' ? rightValue - leftValue : leftValue - rightValue;
    });
  }, [analysis.analysisRows, filterField, filterValue, rankDirection, rankField, searchTerm]);

  const filterValues = useMemo(() => {
    if (!filterField) return [];
    return Array.from(new Set(analysis.analysisRows.map((row) => row[filterField]).filter(Boolean))).slice(0, 80);
  }, [analysis.analysisRows, filterField]);

  const result = useMemo(() => {
    if (!metric && mode !== 'count') {
      return { answer: 'Choose a numeric metric to calculate averages, ranking, spread, and contribution.', rows: [] as Array<{ average: number; count: number; label: string; max: number; min: number; share: number; spread: number; total: number; displayedValue: number }> };
    }

    const groups = new Map<string, number[]>();
    for (const row of filteredRows) {
      const key = row[dimension] || 'Blank';
      const values = groups.get(key) ?? [];
      if (mode === 'count') {
        values.push(1);
      } else {
        const value = Number(String(row[metric] ?? '').replace(/[$,%\s]/g, ''));
        if (Number.isFinite(value)) values.push(value);
      }
      groups.set(key, values);
    }

    const table = Array.from(groups.entries()).map(([label, values]) => {
      const total = values.reduce((sum, value) => sum + value, 0);
      const average = values.length ? total / values.length : 0;
      const min = values.length ? Math.min(...values) : 0;
      const max = values.length ? Math.max(...values) : 0;
      const spread = max - min;
      return { average, count: values.length, label, max, min, spread, total };
    }).filter((row) => row.count > 0);

    const grandTotal = table.reduce((sum, row) => sum + Math.abs(row.total), 0);
    const score = (row: (typeof table)[number]) => {
      if (mode === 'average') return row.average;
      if (mode === 'count') return row.count;
      if (mode === 'variance') return row.spread;
      if (mode === 'share') return grandTotal ? (Math.abs(row.total) / grandTotal) * 100 : 0;
      if (mode === 'top-bottom') return row.max;
      return isAdditiveMetric ? row.total : row.average;
    };
    const sorted = table.sort((a, b) => score(b) - score(a)).slice(0, 25);
    const top = sorted[0];
    const bottom = sorted[sorted.length - 1];
    const modeLabel = mode === 'total' && !isAdditiveMetric ? 'typical value' : mode.replace('-', ' ');

    return {
      answer: top
        ? `${top.label} leads by ${modeLabel} for ${metric || 'records'} grouped by ${dimension}. ${bottom && bottom.label !== top.label ? `${bottom.label} is the lowest among the displayed groups.` : ''}`
        : 'Choose fields with enough matching data to generate a custom answer.',
      rows: sorted.map((row) => ({
        ...row,
        displayedValue: isAdditiveMetric || mode === 'count' ? row.total : row.average,
        share: grandTotal ? (Math.abs(row.total) / grandTotal) * 100 : 0,
      })),
    };
  }, [dimension, filteredRows, isAdditiveMetric, metric, mode]);

  if (!analysis.analysisRows.length || !analysis.columns.length) return null;

  return (
    <div className="custom-analysis-studio">
      <div className="panel-header compact">
        <div>
          <p className="eyebrow">Spreadsheet analysis builder</p>
          <h3>Customize filters, rankings, groups, and calculated parameters</h3>
          <span>Pick a business question yourself. BizDATA calculates from the active uploaded workbook and keeps the data available when you change pages.</span>
        </div>
        <span className="badge">{filteredRows.length.toLocaleString('en-US')} rows in view</span>
      </div>

      <div className="custom-analysis-controls spreadsheet-controls">
        <label data-tooltip="A numeric field BizDATA will calculate, compare, or rank. Dates and text are used as groups or filters instead of being summed.">
          <span>Metric</span>
          <select value={metric} onChange={(event) => setMetric(event.target.value)}>
            {numericColumns.map((column) => <option key={column.name} value={column.name}>{column.name}</option>)}
          </select>
        </label>
        <label data-tooltip="The column used to split the metric into rows, such as product, branch, category, customer, supplier, department, or month.">
          <span>Group by</span>
          <select value={dimension} onChange={(event) => setDimension(event.target.value)}>
            {analysis.columns.map((column) => <option key={column.name} value={column.name}>{column.name}</option>)}
          </select>
        </label>
        <label data-tooltip="Average is best for reorder points, rates, scores, and thresholds. Total is best for revenue, sales, cost, quantity, or other additive values.">
          <span>Analysis mode</span>
          <select value={mode} onChange={(event) => setMode(event.target.value as typeof mode)}>
            <option value="average">Average / actual typical value</option>
            <option value="total">Total where meaningful</option>
            <option value="count">Record count</option>
            <option value="variance">Variance and spread</option>
            <option value="share">Share of total</option>
            <option value="top-bottom">Top vs bottom</option>
          </select>
        </label>
        <label data-tooltip="Choose a column to narrow the workbook before calculating results.">
          <span>Filter field</span>
          <select value={filterField} onChange={(event) => { setFilterField(event.target.value); setFilterValue(''); }}>
            <option value="">No filter</option>
            {analysis.columns.map((column) => <option key={column.name} value={column.name}>{column.name}</option>)}
          </select>
        </label>
        <label data-tooltip="Choose one value from the filter field, or keep all values.">
          <span>Filter value</span>
          <select disabled={!filterField} value={filterValue} onChange={(event) => setFilterValue(event.target.value)}>
            <option value="">All values</option>
            {filterValues.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <label data-tooltip="Search across the active workbook rows before ranking or grouping.">
          <span>Search rows</span>
          <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search any value" />
        </label>
        <label data-tooltip="Rank spreadsheet rows by a numeric field before previewing them.">
          <span>Rank field</span>
          <select value={rankField} onChange={(event) => setRankField(event.target.value)}>
            {numericColumns.map((column) => <option key={column.name} value={column.name}>{column.name}</option>)}
          </select>
        </label>
        <label data-tooltip="Descending shows highest values first. Ascending shows lowest values first.">
          <span>Rank order</span>
          <select value={rankDirection} onChange={(event) => setRankDirection(event.target.value as typeof rankDirection)}>
            <option value="desc">Highest first</option>
            <option value="asc">Lowest first</option>
          </select>
        </label>
      </div>

      <div className="custom-answer-card">
        <strong>{result.answer}</strong>
        <span>{isAdditiveMetric ? `${metric} can be totaled because it behaves like an additive measure.` : `${metric} is treated as a threshold, score, rate, or position field, so BizDATA emphasizes average, min, max, and spread instead of pretending totals are always meaningful.`}</span>
      </div>

      <div className="analysis-table-card">
        <div className="analysis-table-scroll">
          <table className="analysis-table">
            <thead>
              <tr>
                <th className="align-left">{dimension}</th>
                <th data-tooltip={isAdditiveMetric ? 'Sum of the selected metric for this group.' : 'For non-additive fields such as reorder points, this shows the typical value instead of a misleading sum.'}>{primaryValueLabel}</th>
                <th data-tooltip="Average value across records in this group. Best for reorder points, rates, scores, and thresholds.">Average</th>
                <th data-tooltip="How many rows are included in this group after filters and search.">Count</th>
                <th data-tooltip="Smallest value found in this group.">Min</th>
                <th data-tooltip="Largest value found in this group.">Max</th>
                <th data-tooltip="Difference between maximum and minimum. Wider spread means less consistency.">Spread</th>
                <th data-tooltip="This group as a percentage of the absolute measured total.">Share</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row) => (
                <tr key={row.label}>
                  <td>{row.label}</td>
                  <td>{formatValue(row.displayedValue)}</td>
                  <td>{formatValue(row.average)}</td>
                  <td>{numberFormatter.format(row.count)}</td>
                  <td>{formatValue(row.min)}</td>
                  <td>{formatValue(row.max)}</td>
                  <td>{formatValue(row.spread)}</td>
                  <td>{row.share.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="analysis-table-card spreadsheet-preview-card">
        <div className="panel-header compact">
          <div>
            <p className="eyebrow">Spreadsheet preview</p>
            <h3>Filtered and ranked workbook rows</h3>
          </div>
          <span className="badge">top {Math.min(filteredRows.length, 12)} rows</span>
        </div>
        <div className="analysis-table-scroll">
          <table className="analysis-table compact-analysis-table">
            <thead>
              <tr>{analysis.columns.slice(0, 8).map((column) => <th className="align-left" key={column.name}>{column.name}</th>)}</tr>
            </thead>
            <tbody>
              {filteredRows.slice(0, 12).map((row, index) => (
                <tr key={`spreadsheet-${index}`}>
                  {analysis.columns.slice(0, 8).map((column) => <td key={column.name}>{row[column.name] || '-'}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
function distributionExplanation(column: UploadAnalysisResponse['columnAnalyses'][number]) {
  const distribution = column.distribution;
  const top = [...distribution].sort((a, b) => b.share - a.share)[0];
  const lowest = [...distribution].sort((a, b) => a.share - b.share)[0];
  const spread = top && lowest ? top.share - lowest.share : 0;
  const isBalanced = distribution.length >= 3 && spread <= 12;
  const isConcentrated = top ? top.share >= 50 || spread >= 28 : false;
  const columnLabel = column.name;
  const topLabel = top?.label ?? 'the largest band';

  if (isBalanced) {
    return {
      headline: `${columnLabel} is evenly spread across the shown ranges.`,
      verdict: 'Generally healthy, but it depends on the column.',
      meaning: `The records are not heavily packed into one band. Low, typical, and high values all appear in similar proportions, so ${columnLabel} has a balanced spread rather than one dominant cluster.`,
      businessImpact: `An even spread is usually good for comparison, segmentation, forecasting, and fair workload/performance analysis because the business is not relying on only one value range. For risk, price, cost, reorder, or delay fields, it still means each band deserves separate review because high values may carry different business consequences.`,
      recommendation: `Compare the low, typical, and high ${columnLabel} bands by product, branch, supplier, customer, date, or department. If high values are costly, risky, delayed, or unusually expensive, create a priority review filter for the high band.`,
    };
  }

  if (isConcentrated) {
    return {
      headline: `${columnLabel} is concentrated in ${topLabel}.`,
      verdict: 'Needs business review.',
      meaning: `${topLabel} contains the largest share of records, so this column is not evenly distributed. The business activity is clustered in one range.`,
      businessImpact: `Concentration can be good when it reflects a deliberate strategy, standard pricing, consistent process control, or stable demand. It can be bad when it shows dependency, bottlenecks, high cost exposure, stock imbalance, risk concentration, or too many records sitting in an exception range.`,
      recommendation: `Review why ${topLabel} dominates ${columnLabel}. Segment it by product, branch, supplier, customer, date, or team. If the concentrated band represents high cost, high price, high delay, low stock, or high risk, treat it as a management action queue.`,
    };
  }

  return {
    headline: `${columnLabel} has a mixed distribution across the shown ranges.`,
    verdict: 'Useful for deeper segmentation.',
    meaning: `The values are spread across multiple bands, but not perfectly evenly and not dominated by a single band. This usually means the column has meaningful variation for analysis.`,
    businessImpact: `Mixed spread can reveal different customer/product/operation/accounting behaviors inside the same dataset. It is neither automatically good nor bad; the business meaning depends on whether high or low values represent success, risk, cost, delay, stock pressure, or opportunity.`,
    recommendation: `Use this distribution as a starting point for filters and rankings. Compare each band against business dimensions like product, branch, supplier, customer, date, department, or region.`,
  };
}

function downloadDistributionExplanation(column: UploadAnalysisResponse['columnAnalyses'][number]) {
  const explanation = distributionExplanation(column);
  const lines = [
    `BizDATA distribution explanation: ${column.name}`,
    '',
    explanation.headline,
    '',
    `Verdict: ${explanation.verdict}`,
    '',
    `What it means: ${explanation.meaning}`,
    '',
    `Business impact: ${explanation.businessImpact}`,
    '',
    `Recommendation: ${explanation.recommendation}`,
    '',
    'Distribution:',
    ...column.distribution.map((item) => `- ${item.label}: ${item.value.toLocaleString('en-US')} records (${item.share}%)`),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${column.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'column'}-distribution-explanation.txt`;
  link.click();
  URL.revokeObjectURL(url);
}
export function ColumnAnalysisPanel({ analysis }: { analysis: UploadAnalysisResponse }) {
  const [selectedColumnName, setSelectedColumnName] = useState<string | null>(null);
  const selectedColumn = analysis.columnAnalyses.find((column) => column.name === selectedColumnName) ?? null;
  const selectedExplanation = selectedColumn ? distributionExplanation(selectedColumn) : null;

  if (!analysis.columnAnalyses.length) return null;

  return (
    <div className="column-analysis-panel">
      <div className="panel-header compact">
        <div>
          <p className="eyebrow">Every column explained</p>
          <h3>Column-by-column parameters, distributions, and recommended uses</h3>
          <span>Click a distribution to understand whether the spread or concentration is good, bad, or worth management review.</span>
        </div>
        <span className="badge">{analysis.columnAnalyses.length} columns</span>
      </div>
      <div className="column-analysis-grid">
        {analysis.columnAnalyses.map((column) => (
          <article className="column-analysis-card" key={column.name}>
            <div className="business-question-heading">
              <strong>{column.name}</strong>
              <span>{column.type}</span>
            </div>
            <p>{column.summary}</p>
            <div className="question-evidence">
              {column.parameters.map((parameter) => (
                <span key={`${column.name}-${parameter.label}`}><b>{parameter.label}</b>{parameter.value}</span>
              ))}
            </div>
            {column.distribution.length ? (
              <button
                className="column-distribution clickable-distribution"
                data-tooltip="Click to understand what this spread or concentration means for the business"
                onClick={() => setSelectedColumnName(column.name)}
                type="button"
              >
                {column.distribution.slice(0, 6).map((item) => (
                  <div key={`${column.name}-${item.label}`}>
                    <span>{item.label}</span>
                    <b>{item.value.toLocaleString('en-US')} ({item.share}%)</b>
                  </div>
                ))}
              </button>
            ) : null}
            <div className="recommendation-list compact-recommendations">
              {column.recommendations.map((recommendation) => <div className="recommendation-item" key={recommendation}>{recommendation}</div>)}
            </div>
          </article>
        ))}
      </div>

      {selectedColumn && selectedExplanation ? (
        <div className="distribution-modal-backdrop" role="presentation" onClick={() => setSelectedColumnName(null)}>
          <section
            aria-label={`${selectedColumn.name} distribution business explanation`}
            aria-modal="true"
            className="distribution-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="distribution-modal-header">
              <div>
                <p className="eyebrow">Distribution meaning</p>
                <h3>{selectedExplanation.headline}</h3>
                <span>{selectedExplanation.verdict}</span>
              </div>
              <button aria-label="Close distribution explanation" onClick={() => setSelectedColumnName(null)} type="button">Close</button>
            </div>

            <div className="distribution-modal-grid">
              {selectedColumn.distribution.map((item) => (
                <div className="distribution-modal-stat" key={`${selectedColumn.name}-${item.label}`}>
                  <span>{item.label}</span>
                  <strong>{item.value.toLocaleString('en-US')}</strong>
                  <small>{item.share}% of records</small>
                </div>
              ))}
            </div>

            <div className="question-explainer distribution-explainer">
              <div><b>What it means</b><span>{selectedExplanation.meaning}</span></div>
              <div><b>Business impact</b><span>{selectedExplanation.businessImpact}</span></div>
              <div><b>Recommendation</b><span>{selectedExplanation.recommendation}</span></div>
            </div>

            <div className="distribution-modal-actions">
              <button className="secondary-button" onClick={() => downloadDistributionExplanation(selectedColumn)} type="button">Download explanation</button>
              <button className="install-button" onClick={() => setSelectedColumnName(null)} type="button">Done</button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
function explainBusinessQuestion(question: UploadAnalysisResponse['businessQuestions'][number]) {
  const text = `${question.question} ${question.answer} ${question.recommendation} ${question.fields.join(' ')}`.toLowerCase();
  if (/unit price|price|pricing|supplier|procurement/.test(text)) {
    return {
      meaning: 'BizDATA is highlighting unusually high prices compared with the rest of the uploaded file.',
      why: 'High unit prices can be normal for premium products, but they can also reveal pricing errors, supplier cost pressure, margin risk, or inconsistent purchasing.',
      action: 'Open the matching records, compare product/category/supplier, and confirm whether the high price is expected before making pricing or procurement decisions.',
    };
  }
  if (/reorder|stock|inventory|overstock|slow-moving/.test(text)) {
    return {
      meaning: 'This question is about inventory action: what needs replenishment, review, transfer, markdown, or purchasing control.',
      why: 'Inventory fields can expose stockouts, excess stock, slow movement, warehouse imbalance, or reorder rules that do not match demand.',
      action: 'Compare stock against reorder point, units sold, supplier, warehouse, and lead time before placing orders or freezing purchases.',
    };
  }
  if (/budget|expense|cost|receivable|payable|accounting|invoice/.test(text)) {
    return {
      meaning: 'This question is about financial control, accounting pressure, cash movement, or settlement priority.',
      why: 'Large values or variances can affect reporting accuracy, cash flow, approvals, and management accountability.',
      action: 'Review the source records, owner, period, counterparty, approval status, and variance reason before reporting or escalation.',
    };
  }
  if (/delay|lead time|route|warehouse|supplier|team|bottleneck/.test(text)) {
    return {
      meaning: 'This question is about operational bottlenecks and service performance.',
      why: 'Delays and wide variation often point to capacity gaps, supplier SLA issues, handoff problems, route inefficiency, or staffing constraints.',
      action: 'Compare the affected group against volume, dates, location, staff/team, supplier, and exception records to decide the first operational fix.',
    };
  }
  if (/correlation|related|relationship|pattern|segment|investigate/.test(text)) {
    return {
      meaning: 'This question helps you understand patterns and relationships worth deeper analysis.',
      why: 'Strong differences between segments or related variables can point to customer behavior, operational drivers, research hypotheses, or hidden risks.',
      action: 'Use correlation, regression, ranking, and filters on the Analyze page to verify the pattern before treating it as a business cause.',
    };
  }
  return {
    meaning: 'BizDATA found a business-significant pattern in the uploaded data.',
    why: 'The evidence values show why this item, segment, field, or period stands out from the rest of the file.',
    action: 'Review the records behind the evidence, compare against related fields, and decide whether it is an opportunity, risk, data-quality issue, or operational action.',
  };
}

function evidenceTooltip(label: string) {
  const normalized = label.toLowerCase();
  if (normalized.includes('threshold')) return 'The cut-off where BizDATA starts treating records as unusually high or important for review.';
  if (normalized.includes('records')) return 'The number of rows BizDATA used to calculate this answer.';
  if (normalized.includes('missing')) return 'Blank values that may reduce confidence in decisions or reports.';
  if (normalized.includes('spread')) return 'The gap between the lowest and highest value; wider spread means less consistency.';
  if (normalized.includes('average')) return 'The typical value for the selected group or field.';
  return 'Evidence from the uploaded file that supports this business answer.';
}
function BusinessQuestionsPanel({ analysis }: { analysis: UploadAnalysisResponse }) {
  const [openQuestionKey, setOpenQuestionKey] = useState<string | null>(analysis.businessQuestions[0]?.key ?? null);

  if (analysis.businessQuestions.length === 0) return null;

  return (
    <div className="business-questions-panel">
      <div className="panel-header compact">
        <div>
          <p className="eyebrow">Business questions answered</p>
          <h3>Click any answer to understand what it means for the business</h3>
          <span>BizDATA explains the finding, the evidence, the business implication, and the next action.</span>
        </div>
        <span className="badge">{analysis.businessQuestions.length} answers</span>
      </div>

      <div className="business-question-grid clickable-question-grid">
        {analysis.businessQuestions.map((question) => {
          const isOpen = openQuestionKey === question.key;
          const explanation = explainBusinessQuestion(question);
          return (
            <article className={`business-question-card clickable-question-card ${isOpen ? 'expanded' : ''}`} key={question.key}>
              <button
                aria-expanded={isOpen}
                className="question-card-trigger"
                onClick={() => setOpenQuestionKey(isOpen ? null : question.key)}
                type="button"
              >
                <div className="business-question-heading">
                  <strong>{question.question}</strong>
                  <span>{question.confidence}% confidence</span>
                </div>
                <p>{question.answer}</p>
              </button>

              <div className="question-evidence" aria-label={`${question.question} evidence`}>
                {question.evidence.slice(0, 5).map((item) => (
                  <span data-tooltip={evidenceTooltip(item.label)} key={`${question.key}-${item.label}`}>
                    <b>{item.label}</b>
                    {item.value}
                    {item.detail ? <small>{item.detail}</small> : null}
                  </span>
                ))}
              </div>

              <div className="question-fields">
                {question.fields.map((field) => <span data-tooltip="Field from the uploaded dataset used in this answer" key={`${question.key}-${field}`}>{field}</span>)}
              </div>

              {isOpen ? (
                <div className="question-explainer">
                  <div><b>What it means</b><span>{explanation.meaning}</span></div>
                  <div><b>Why it matters</b><span>{explanation.why}</span></div>
                  <div><b>What to do next</b><span>{explanation.action}</span></div>
                </div>
              ) : null}

              <em>{question.recommendation}</em>
            </article>
          );
        })}
      </div>
    </div>
  );
}
export function AnalysisOptionDetail({ option }: { option: UploadAnalysisOption }) {
  return (
    <div className="analysis-option-detail">
      <div className="analysis-option-copy">
        <p className="eyebrow">Focused analysis</p>
        <h3>{option.title}</h3>
        <span>{option.description}</span>
      </div>

      <div className="metrics-grid upload-metrics" aria-label={`${option.title} metrics`}>
        {option.metrics.map((metric) => (
          <article className="metric-card compact-card" key={metric.label}>
            <div>
              <p>{metric.label}</p>
              <h3>{metric.value}</h3>
            </div>
            <span className={`delta ${metric.sentiment}`}>{metric.delta}</span>
          </article>
        ))}
      </div>

      {option.insights.length > 0 ? (
        <div className="analysis-insight-grid" aria-label={`${option.title} insights`}>
          {option.insights.map((insight) => (
            <article className={`analysis-insight ${insight.severity}`} key={insight.title}>
              <strong>{insight.title}</strong>
              <span>{insight.detail}</span>
            </article>
          ))}
        </div>
      ) : null}

      {option.fieldStats.length > 0 ? (
        <div className="analysis-table-card">
          <div className="panel-header compact">
            <div>
              <p className="eyebrow">Field performance</p>
              <h3>Totals, averages, medians, ranges, and data quality</h3>
            </div>
          </div>
          <div className="analysis-table-scroll">
            <table className="analysis-table">
              <thead>
                <tr>
                  <th className="align-left">Field</th>
                  <th>Total</th>
                  <th>Average</th>
                  <th>Median</th>
                  <th>Min</th>
                  <th>Max</th>
                  <th>Share</th>
                  <th>Outliers</th>
                  <th>Missing</th>
                </tr>
              </thead>
              <tbody>
                {option.fieldStats.map((field) => (
                  <tr key={field.name}>
                    <td>{field.name}</td>
                    <td>{formatValue(field.total)}</td>
                    <td>{formatValue(field.average)}</td>
                    <td>{formatValue(field.median)}</td>
                    <td>{formatValue(field.min)}</td>
                    <td>{formatValue(field.max)}</td>
                    <td>{field.shareOfOptionTotal}%</td>
                    <td>{numberFormatter.format(field.outlierCount)}</td>
                    <td>{numberFormatter.format(field.missing)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {option.segmentBreakdowns.length > 0 ? (
        <div className="analysis-table-card">
          <div className="panel-header compact">
            <div>
              <p className="eyebrow">Segment drivers</p>
              <h3>Where value, volume, risk, or claims are concentrated</h3>
            </div>
          </div>
          <div className="segment-driver-grid">
            {option.segmentBreakdowns.map((segment) => (
              <article className="segment-driver" key={`${segment.segmentField}-${segment.segmentValue}-${segment.metricField}`}>
                <div>
                  <strong>{segment.segmentValue}</strong>
                  <span>{segment.segmentField} / {segment.metricField}</span>
                </div>
                <div className="segment-driver-values">
                  <b>{formatValue(segment.total)}</b>
                  <span>{segment.share}% share | avg {formatValue(segment.average)} | {numberFormatter.format(segment.records)} rows</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      <div className="analysis-columns" aria-label={`${option.title} detected fields`}>
        {option.columns.map((column) => (
          <span key={column}>{column}</span>
        ))}
      </div>

      <div className="recommendation-list">
        {option.recommendations.map((recommendation) => (
          <div className="recommendation-item" key={recommendation}>
            {recommendation}
          </div>
        ))}
      </div>
    </div>
  );
}

export function UploadAnalysisPanel({ analysis: providedAnalysis = null, onAnalysisComplete, onAnalyzeRequest }: { analysis?: UploadAnalysisResponse | null; onAnalysisComplete?: (analysis: UploadAnalysisResponse) => void; onAnalyzeRequest?: () => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [analysis, setAnalysis] = useState<UploadAnalysisResponse | null>(providedAnalysis);
  const [selectedOptionKey, setSelectedOptionKey] = useState<string | null>(null);
  const [selectedFilterKey, setSelectedFilterKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedOption = useMemo(() => {
    if (!analysis) return null;
    return analysis.analysisOptions.find((option) => option.key === selectedOptionKey) ?? analysis.analysisOptions[0] ?? null;
  }, [analysis, selectedOptionKey]);

  const selectedFilter = useMemo(() => {
    if (!analysis) return null;
    return analysis.filterViews.find((filter) => filter.key === selectedFilterKey) ?? analysis.filterViews[0] ?? null;
  }, [analysis, selectedFilterKey]);

  useEffect(() => {
    setAnalysis(providedAnalysis);
  }, [providedAnalysis]);

  const handleFile = async (file?: File) => {
    if (!file) {
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const result = await analyzeUploadedData(file);
      setAnalysis(result);
      onAnalysisComplete?.(result);
      setSelectedOptionKey(result.analysisOptions[0]?.key ?? null);
      setSelectedFilterKey(result.filterViews[0]?.key ?? null);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Unable to analyse upload');
    } finally {
      setLoading(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  return (
    <section className="panel upload-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Data workspace</p>
          <h3>Upload a file and let BizDATA prepare the analysis for you</h3>
          <span className="panel-subtitle">CSV, TSV, TXT, JSON, XLS, XLSX, XLSM, and XLSB files are supported.</span>
        </div>
        <button
          className="install-button"
          data-tooltip="Upload CSV, TSV, TXT, JSON, XLS, XLSX, XLSM, or XLSB data"
          disabled={loading}
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          {loading ? 'Analysing...' : 'Upload data'}
        </button>
      </div>

      <input
        accept={acceptedTypes}
        className="visually-hidden"
        onChange={(event) => void handleFile(event.target.files?.[0])}
        ref={inputRef}
        type="file"
      />

      <div
        className="upload-dropzone"
        data-tooltip="Choose a structured file with headers. Excel workbooks use the first sheet."
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click();
        }}
        role="button"
        tabIndex={0}
      >
        <strong>Drop in a spreadsheet, delimited file, or JSON dataset</strong>
        <span>BizDATA profiles fields, detects business meaning, suggests analysis paths, and prepares downloads.</span>
        <div className="supported-file-strip" aria-label="Supported upload file types">
          {['CSV', 'TSV', 'TXT', 'JSON', 'XLS', 'XLSX', 'XLSM', 'XLSB'].map((fileType) => <span key={fileType}>{fileType}</span>)}
        </div>
      </div>

      <div className="upload-guidance" aria-label="What happens after upload">
        <article><strong>1. Understand</strong><span>Column types, missing values, business roles, and market signals are detected.</span></article>
        <article><strong>2. Analyze</strong><span>Compatible methods such as regression, trends, segmentation, and anomalies are prepared.</span></article>
        <article><strong>3. Download</strong><span>Export filtered Excel views, analyzed summaries, and compact workbooks.</span></article>
      </div>

      {error ? <div className="upload-error">{error}</div> : null}

      {analysis ? (
        <div className="upload-results">
          <div className="upload-summary">
            <div>
              <span>File</span>
              <strong>{analysis.fileName}</strong>
            </div>
            <div>
              <span>Rows</span>
              <strong>{numberFormatter.format(analysis.rowCount)}</strong>
            </div>
            <div>
              <span>Columns</span>
              <strong>{numberFormatter.format(analysis.columnCount)}</strong>
            </div>
            <div>
              <span>Quality</span>
              <strong>{analysis.qualityScore}/100</strong>
            </div>
          </div>

          <div className="upload-meta-row">
            <div className="upload-meta">Analysed {formatTimestamp(analysis.generatedAt)}</div>
            <div className="download-actions">
              <button className="secondary-button" onClick={() => downloadUploadAnalysisJson(analysis)} type="button">Download analysis JSON</button>
              <button className="install-button" onClick={() => downloadAnalysisWorkbook(analysis)} type="button">Download workbook</button>
            </div>
          </div>

          <div className="metrics-grid upload-metrics" aria-label="Uploaded data metrics">
            {analysis.metrics.map((metric) => (
              <article className="metric-card" key={metric.label}>
                <div>
                  <p>{metric.label}</p>
                  <h3>{metric.value}</h3>
                </div>
                <span className={`delta ${metric.sentiment}`}>{metric.delta}</span>
              </article>
            ))}
          </div>
          <IntelligencePanel analysis={analysis} />
          <BusinessQuestionsPanel analysis={analysis} />

          <div className="analysis-transfer-card">
            <div>
              <p className="eyebrow">Analyze workspace ready</p>
              <h3>Advanced analytics, spreadsheet ranking, and column-by-column analysis are now on the Analyze page</h3>
              <span>Data stays here for business review, operational filters, quality checks, and workbook downloads. Your uploaded workbook remains active when you switch pages.</span>
            </div>
            <button className="install-button" onClick={onAnalyzeRequest} type="button">Open Analyze</button>
          </div>

          {analysis.filterViews.length > 0 ? (
            <div className="analysis-workspace filter-workspace">
              <div className="panel-header compact">
                <div>
                  <p className="eyebrow">Suggested Excel exports</p>
                  <h3>Click an auto-generated view to inspect matching records and download Excel</h3>
                </div>
                <span className="badge">{analysis.filterViews.length} exports</span>
              </div>

              <div className="filter-option-grid" aria-label="Auto-generated export views">
                {analysis.filterViews.map((filter) => (
                  <button
                    className={selectedFilter?.key === filter.key ? 'active' : undefined}
                    data-tooltip={`View and export ${filter.title.toLowerCase()}`}
                    key={filter.key}
                    onClick={() => setSelectedFilterKey(filter.key)}
                    type="button"
                  >
                    <strong>{filter.title}</strong>
                    <span>{numberFormatter.format(filter.rowCount)} rows</span>
                  </button>
                ))}
              </div>

              {selectedFilter ? <FilterViewDetail fileName={analysis.fileName} filter={selectedFilter} /> : null}
            </div>
          ) : null}
          <div className="upload-two-column">
            <div className="alert-list">
              {analysis.signals.map((signal) => (
                <article className={`alert ${signal.severity}`} key={signal.title}>
                  <strong>{signal.title}</strong>
                  <span>{signal.detail}</span>
                </article>
              ))}
            </div>
            <div className="recommendation-list">
              {analysis.recommendations.map((recommendation) => (
                <div className="recommendation-item" key={recommendation}>
                  {recommendation}
                </div>
              ))}
            </div>
          </div>

          <div className="column-profile-grid">
            {analysis.columns.slice(0, 8).map((column) => (
              <article className="column-profile" key={column.name}>
                <div>
                  <strong>{column.name}</strong>
                  <span>{column.type}</span>
                </div>
                <p>
                  {column.unique} unique | {column.missing} missing
                </p>
                <small>{column.average != null ? `Avg ${column.average}` : column.sample || 'No sample'}</small>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}


















