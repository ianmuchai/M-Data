import * as XLSX from 'xlsx';
import type { UploadAnalysisResponse } from '../../shared/analytics';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '';

export async function analyzeUploadedData(file: File) {
  const isExcel = /\.(xlsx|xls|xlsm|xlsb)$/i.test(file.name);
  const body = isExcel
    ? JSON.stringify({ fileName: file.name, rows: await fileToRows(file) })
    : JSON.stringify({ content: await file.text(), fileName: file.name, encoding: 'text' });

  const response = await fetch(apiBaseUrl + '/api/analyze-upload', {
    body,
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? 'Upload analysis failed with ' + response.status);
  }

  return response.json() as Promise<UploadAnalysisResponse>;
}

function fileToArrayBuffer(file: File) {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Unable to read file'));
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.readAsArrayBuffer(file);
  });
}

async function fileToRows(file: File) {
  const workbook = XLSX.read(await fileToArrayBuffer(file), { cellDates: true, type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  return XLSX.utils
    .sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], {
      blankrows: false,
      defval: '',
      raw: false,
    })
    .slice(0, 10000);
}
