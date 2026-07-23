import * as XLSX from 'xlsx';
import type { AdvancedAnalysisResult, UploadAnalysisResponse, UploadFilterView } from '../../shared/analytics';
import { openPrintablePdfReport } from './printablePdf';

function safeFilePart(value: string) {
  return value.replace(/\.[^.]+$/, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'bizdata-analysis';
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

export function downloadUploadAnalysisPdf(analysis: UploadAnalysisResponse) {
  const enabledMethods = analysis.advancedAnalytics.results.slice(0, 8);
  openPrintablePdfReport({
    fileName: `${safeFilePart(analysis.fileName)}-analysis-summary`,
    generatedAt: new Date(analysis.generatedAt).toLocaleString(),
    subtitle: `${analysis.fileName} | ${analysis.rowCount.toLocaleString()} rows | ${analysis.columns.length.toLocaleString()} columns`,
    title: 'Uploaded dataset analytics summary',
    sections: [
      {
        title: 'Business review snapshot',
        body: 'This PDF summarizes the uploaded workbook profile, detected business questions, recommended actions, and available analytical methods.',
        cards: analysis.metrics.map((metric) => ({ label: metric.label, value: metric.value, detail: metric.delta })),
      },
      {
        title: 'Recommended business actions',
        bullets: analysis.recommendations.slice(0, 12),
      },
      {
        title: 'Business questions answered',
        tables: [
          {
            title: 'Detected business questions',
            columns: ['Question', 'Answer', 'Confidence', 'Business recommendation'],
            rows: analysis.businessQuestions.slice(0, 12).map((question) => [
              question.question,
              question.answer,
              `${question.confidence}%`,
              question.recommendation,
            ]),
          },
        ],
      },
      {
        title: 'Column profile and data quality',
        tables: [
          {
            title: 'Columns reviewed',
            columns: ['Column', 'Type', 'Missing', 'Unique', 'Average', 'Min', 'Max'],
            rows: analysis.columns.slice(0, 40).map((column) => [
              column.name,
              column.type,
              column.missing,
              column.unique,
              column.average ?? '',
              column.min ?? '',
              column.max ?? '',
            ]),
          },
        ],
      },
      {
        title: 'Advanced analytical results',
        tables: enabledMethods.map((result) => ({
          title: result.title,
          description: result.summary,
          columns: ['Label', 'Value', 'Sentiment'],
          rows: result.metrics.map((metric) => [metric.label, metric.value, metric.sentiment]),
        })),
      },
      {
        title: 'Downloadable spreadsheet views',
        tables: [
          {
            title: 'Prepared filtered views',
            columns: ['View', 'Rows', 'Matched by', 'Description'],
            rows: analysis.filterViews.map((view) => [view.title, view.rowCount, view.matchedBy, view.description]),
          },
        ],
      },
    ],
  });
}

export function downloadFilterViewWorkbook(fileName: string, filter: UploadFilterView) {
  const worksheet = XLSX.utils.json_to_sheet(filter.rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName(filter.title));
  XLSX.writeFile(workbook, `${safeFilePart(fileName)}-${filter.key}.xlsx`);
}
export function downloadFilterViewPdf(fileName: string, filter: UploadFilterView) {
  const previewColumns = filter.columns.slice(0, 10);
  openPrintablePdfReport({
    fileName: `${safeFilePart(fileName)}-${filter.key}`,
    subtitle: `${filter.description} | ${filter.rowCount.toLocaleString()} matching rows`,
    title: filter.title,
    sections: [
      {
        title: 'Filtered view summary',
        body: `This PDF documents the filtered spreadsheet view generated from ${fileName}.`,
        cards: filter.metrics.map((metric) => ({ label: metric.label, value: metric.value, detail: metric.delta })),
      },
      {
        title: 'Filtered records preview',
        tables: [
          {
            title: 'Records included in this view',
            description: filter.rows.length < filter.rowCount ? `Showing ${filter.rows.length.toLocaleString()} prepared rows from ${filter.rowCount.toLocaleString()} matching records.` : 'Showing the complete prepared filtered view.',
            columns: previewColumns,
            rows: filter.rows.slice(0, 80).map((row) => previewColumns.map((column) => row[column] ?? '')),
          },
        ],
      },
    ],
  });
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
