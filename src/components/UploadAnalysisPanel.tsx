import { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import type { UploadAnalysisOption, UploadAnalysisResponse, UploadFilterView } from '../../shared/analytics';
import { analyzeUploadedData } from '../api/uploadAnalysis';
import { formatTimestamp, numberFormatter } from '../lib/format';

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

function AnalysisOptionDetail({ option }: { option: UploadAnalysisOption }) {
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

export function UploadAnalysisPanel({ onAnalysisComplete }: { onAnalysisComplete?: (analysis: UploadAnalysisResponse) => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [analysis, setAnalysis] = useState<UploadAnalysisResponse | null>(null);
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

  const handleFile = async (file?: File) => {
    if (!file) {
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const result = await analyzeUploadedData(file);
      setAnalysis(result);
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
          <p className="eyebrow">Upload intelligence</p>
          <h3>Analyse bank, insurance, finance, operations, and enterprise data</h3>
        </div>
        <button
          className="install-button"
          data-tooltip="Upload CSV, JSON, XLS, XLSX, XLSM, or XLSB data"
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
        <strong>Drop in CSV, TSV, JSON, XLS, XLSX, XLSM, or XLSB data</strong>
        <span>Finds useful business patterns, totals, categories, low stock, risks, filtered views, and Excel exports.</span>
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

          <div className="upload-meta">Analysed {formatTimestamp(analysis.generatedAt)}</div>

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

          {analysis.analysisOptions.length > 0 ? (
            <div className="analysis-workspace">
              <div className="panel-header compact">
                <div>
                  <p className="eyebrow">Detected analysis paths</p>
                  <h3>Click a business lens to see statistics, segment drivers, and optimization actions</h3>
                </div>
                <span className="badge">{analysis.analysisOptions.length} options</span>
              </div>

              <div className="analysis-option-grid" aria-label="Detected upload analysis options">
                {analysis.analysisOptions.map((option) => (
                  <button
                    className={selectedOption?.key === option.key ? 'active' : undefined}
                    data-tooltip={`Analyse ${option.title.toLowerCase()}`}
                    key={option.key}
                    onClick={() => setSelectedOptionKey(option.key)}
                    type="button"
                  >
                    <strong>{option.title}</strong>
                    <span>{option.fieldStats.length} measures | {option.segmentBreakdowns.length} segment cuts</span>
                  </button>
                ))}
              </div>

              {selectedOption ? <AnalysisOptionDetail option={selectedOption} /> : null}
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








