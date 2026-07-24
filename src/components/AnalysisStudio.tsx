import { useEffect, useMemo, useState } from 'react';
import type { AdvancedAnalysisMethodKey, AdvancedAnalysisResult, UploadAnalysisResponse } from '../../shared/analytics';
import { numberFormatter } from '../lib/format';
import { AnalysisOptionDetail, ColumnAnalysisPanel, CustomAnalysisStudio } from './UploadAnalysisPanel';

type AnalysisStudioProps = {
  analysis: UploadAnalysisResponse | null;
  onUploadRequest: () => void;
};

const methodGroups: Array<{ title: string; methods: AdvancedAnalysisMethodKey[] }> = [
  { title: 'Explain', methods: ['regression', 'correlation'] },
  { title: 'Predict', methods: ['forecasting', 'trend'] },
  { title: 'Detect', methods: ['anomaly-detection', 'distribution'] },
  { title: 'Compare', methods: ['segmentation', 'ranking'] },
  { title: 'Plan', methods: ['what-if'] },
];
function AnalysisCommandCenter({ analysis }: { analysis: UploadAnalysisResponse }) {
  const readyResults = analysis.advancedAnalytics.results.filter((result) => result.status === 'ready');
  const topQuestion = analysis.businessQuestions[0];
  const numericCount = analysis.columns.filter((column) => column.type === 'number').length;
  const dimensionCount = analysis.columns.filter((column) => column.type !== 'number').length;

  return (
    <section className="analysis-command-center" aria-label="Analysis command center">
      <article>
        <span>Workbook</span>
        <strong>{numberFormatter.format(analysis.rowCount)} rows</strong>
        <p>{numberFormatter.format(numericCount)} measures and {numberFormatter.format(dimensionCount)} grouping/filter fields are available.</p>
      </article>
      <article>
        <span>Ready Methods</span>
        <strong>{numberFormatter.format(readyResults.length)}</strong>
        <p>{readyResults.slice(0, 3).map((result) => result.title).join(', ') || 'Upload more complete fields to unlock methods.'}</p>
      </article>
      <article>
        <span>Best Starting Question</span>
        <strong>{topQuestion ? `${topQuestion.confidence}% confidence` : 'Not detected'}</strong>
        <p>{topQuestion?.question ?? 'Use the custom analysis builder to ask a specific question.'}</p>
      </article>
    </section>
  );
}
function ResultTable({ result }: { result: AdvancedAnalysisResult }) {
  const columns = Array.from(new Set(result.rows.flatMap((row) => Object.keys(row.cells)))).slice(0, 6);
  if (!result.rows.length || !columns.length) return null;

  return (
    <div className="analysis-table-card">
      <div className="analysis-table-scroll">
        <table className="analysis-table compact-analysis-table">
          <thead>
            <tr>
              <th className="align-left">Item</th>
              {columns.map((column) => <th key={column}>{column}</th>)}
            </tr>
          </thead>
          <tbody>
            {result.rows.slice(0, 10).map((row) => (
              <tr key={row.label}>
                <td>{row.label}</td>
                {columns.map((column) => <td key={column}>{row.cells[column] ?? '-'}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ResultSeries({ result }: { result: AdvancedAnalysisResult }) {
  const max = Math.max(...result.series.map((point) => point.value), 1);
  if (!result.series.length) return null;

  return (
    <div className="mini-series" aria-label={`${result.title} result series`}>
      {result.series.slice(0, 18).map((point) => (
        <div className={`mini-series-point ${point.kind ?? 'actual'}`} key={`${point.name}-${point.kind ?? 'actual'}`}>
          <span style={{ height: `${Math.max(10, (point.value / max) * 100)}%` }} />
          <small>{point.name}</small>
        </div>
      ))}
    </div>
  );
}

export function AnalysisStudio({ analysis, onUploadRequest }: AnalysisStudioProps) {
  const firstEnabled = useMemo(() => analysis?.advancedAnalytics.methods.find((method) => method.enabled)?.key ?? null, [analysis]);
  const [selectedMethod, setSelectedMethod] = useState<AdvancedAnalysisMethodKey | null>(firstEnabled);
  const [selectedOptionKey, setSelectedOptionKey] = useState<string | null>(analysis?.analysisOptions[0]?.key ?? null);

  useEffect(() => {
    setSelectedMethod(firstEnabled);
  }, [firstEnabled]);

  useEffect(() => {
    setSelectedOptionKey(analysis?.analysisOptions[0]?.key ?? null);
  }, [analysis]);

  const selectedResult = useMemo(
    () => analysis?.advancedAnalytics.results.find((result) => result.method === selectedMethod) ?? null,
    [analysis, selectedMethod],
  );

  const selectedOption = useMemo(
    () => analysis?.analysisOptions.find((option) => option.key === selectedOptionKey) ?? analysis?.analysisOptions[0] ?? null,
    [analysis, selectedOptionKey],
  );

  if (!analysis) {
    return (
      <section className="panel studio-empty">
        <p className="eyebrow">Analysis Studio</p>
        <h3>Upload data to unlock statistical methods</h3>
        <span>Regression, correlation, forecasting, anomaly detection, segmentation, distribution, trend, ranking, and what-if analysis appear here once fields are detected.</span>
        <button className="cta-button" onClick={onUploadRequest} type="button">Go to upload</button>
      </section>
    );
  }

  return (
    <section className="analysis-studio">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Analysis Studio</p>
          <h3>Choose analytical methods for {analysis.fileName}</h3>
        </div>
        <span className="badge">{numberFormatter.format(analysis.rowCount)} rows</span>
      </div>

      <AnalysisCommandCenter analysis={analysis} />

      <CustomAnalysisStudio analysis={analysis} />

      <ColumnAnalysisPanel analysis={analysis} />

      {analysis.analysisOptions.length > 0 ? (
        <div className="analysis-workspace compact-analysis-paths">
          <div className="panel-header compact">
            <div>
              <p className="eyebrow">Detected analysis paths</p>
              <h3>Business lenses calculated from the uploaded workbook</h3>
            </div>
            <span className="badge">{analysis.analysisOptions.length} options</span>
          </div>

          <div className="analysis-option-grid compact-option-grid" aria-label="Detected upload analysis options">
            {analysis.analysisOptions.map((option) => (
              <button
                className={selectedOption?.key === option.key ? 'active' : undefined}
                data-tooltip={`Analyze ${option.title.toLowerCase()}`}
                key={option.key}
                onClick={() => setSelectedOptionKey(option.key)}
                type="button"
              >
                <strong>{option.title}</strong>
                <span>{option.fieldStats.length} measures</span>
              </button>
            ))}
          </div>

          {selectedOption ? <AnalysisOptionDetail option={selectedOption} /> : null}
        </div>
      ) : null}
      <div className="method-group-list" aria-label="Available analytical methods">
        {methodGroups.map((group) => (
          <section className={`method-group ${group.title.toLowerCase()}`} key={group.title}>
            <p className="eyebrow">{group.title}</p>
            <div className="method-grid">
              {analysis.advancedAnalytics.methods.filter((method) => group.methods.includes(method.key)).map((method) => (
                <button
                  className={selectedMethod === method.key ? 'active' : undefined}
                  data-tooltip={method.enabled ? method.description : method.disabledReason}
                  disabled={!method.enabled}
                  key={method.key}
                  onClick={() => setSelectedMethod(method.key)}
                  type="button"
                >
                  <strong>{method.title}</strong>
                  <span>{method.enabled ? `${method.suggestedFields.slice(0, 3).join(', ') || 'Ready to use'}` : method.disabledReason}</span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>

      {selectedResult ? (
        <div className="analysis-result-panel">
          <div className="analysis-option-copy">
            <p className="eyebrow">{selectedResult.status === 'ready' ? 'Ready result' : 'Unavailable'}</p>
            <h3>{selectedResult.title}</h3>
            <span>{selectedResult.summary}</span>
          </div>

          <div className="field-pill-row">
            {Object.entries(selectedResult.primaryFields).map(([label, value]) => (
              <span key={label}><b>{label}</b> {value}</span>
            ))}
          </div>

          <div className="metrics-grid upload-metrics">
            {selectedResult.metrics.map((metric) => (
              <article className="metric-card compact-card" key={metric.label}>
                <div>
                  <p>{metric.label}</p>
                  <h3>{metric.value}</h3>
                </div>
                <span className={`delta ${metric.sentiment}`}>model</span>
              </article>
            ))}
          </div>

          <ResultSeries result={selectedResult} />
          <ResultTable result={selectedResult} />

          {selectedResult.warnings.length ? (
            <div className="alert-list">
              {selectedResult.warnings.map((warning) => <article className="alert warning" key={warning}><strong>Check confidence</strong><span>{warning}</span></article>)}
            </div>
          ) : null}

          <div className="recommendation-list">
            {selectedResult.recommendations.map((recommendation) => <div className="recommendation-item" key={recommendation}>{recommendation}</div>)}
          </div>
        </div>
      ) : null}
    </section>
  );
}





