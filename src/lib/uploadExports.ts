import * as XLSX from 'xlsx';
import type { AdvancedAnalysisResult, UploadAnalysisResponse } from '../../shared/analytics';

function safeFilePart(value: string) {
  return value.replace(/\.[^.]+$/, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'm-data-analysis';
}

function safeSheetName(value: string) {
  return value.replace(/[\\/?*:[\]]/g, ' ').slice(0, 31) || 'Sheet';
}

function downloadBlob(fileName: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function resultRows(result: AdvancedAnalysisResult) {
  const metricRows = result.metrics.map((metric) => ({
    method: result.title,
    type: 'metric',
    label: metric.label,
    value: metric.value,
    rawValue: metric.rawValue ?? '',
    sentiment: metric.sentiment,
  }));
  const detailRows = result.rows.slice(0, 50).map((row) => ({
    method: result.title,
    type: 'detail',
    label: row.label,
    ...row.cells,
  }));

  return [...metricRows, ...detailRows];
}

export function downloadUploadAnalysisJson(analysis: UploadAnalysisResponse) {
  downloadBlob(`${safeFilePart(analysis.fileName)}-analysis-summary.json`, JSON.stringify(analysis, null, 2), 'application/json');
}

export function downloadAnalysisWorkbook(analysis: UploadAnalysisResponse) {
  const workbook = XLSX.utils.book_new();
  const metrics = analysis.metrics.map((metric) => ({ label: metric.label, value: metric.value, delta: metric.delta, sentiment: metric.sentiment }));
  const columns = analysis.columns.map((column) => ({
    name: column.name,
    type: column.type,
    missing: column.missing,
    unique: column.unique,
    sample: column.sample,
    min: column.min ?? '',
    max: column.max ?? '',
    average: column.average ?? '',
  }));
  const methods = analysis.advancedAnalytics.methods.map((method) => ({
    method: method.title,
    enabled: method.enabled ? 'Yes' : 'No',
    requiredFields: method.requiredFields.join(', '),
    suggestedFields: method.suggestedFields.join(', '),
    note: method.disabledReason ?? method.description,
  }));
  const results = analysis.advancedAnalytics.results.flatMap(resultRows);
  const filters = analysis.filterViews.map((view) => ({
    title: view.title,
    rowCount: view.rowCount,
    matchedBy: view.matchedBy,
    description: view.description,
  }));
  const recommendations = analysis.recommendations.map((recommendation) => ({ recommendation }));

  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(metrics), 'Metrics');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(columns), 'Columns');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(methods), 'Methods');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(results), safeSheetName('Analysis results'));
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(filters), safeSheetName('Filtered views'));
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(recommendations), 'Recommendations');
  XLSX.writeFile(workbook, `${safeFilePart(analysis.fileName)}-analysis-workbook.xlsx`);
}

