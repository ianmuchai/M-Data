import type { UploadAnalysisResponse } from '../../shared/analytics';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '';

export async function analyzeUploadedData(file: File) {
  const isExcel = /\.(xlsx|xls|xlsm|xlsb)$/i.test(file.name);
  const content = isExcel ? await fileToBase64(file) : await file.text();
  const response = await fetch(`${apiBaseUrl}/api/analyze-upload`, {
    body: JSON.stringify({ content, fileName: file.name, encoding: isExcel ? 'base64' : 'text' }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `Upload analysis failed with ${response.status}`);
  }

  return response.json() as Promise<UploadAnalysisResponse>;
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Unable to read file'));
    reader.onload = () => {
      const result = String(reader.result ?? '');
      resolve(result.includes(',') ? result.split(',')[1] : result);
    };
    reader.readAsDataURL(file);
  });
}

