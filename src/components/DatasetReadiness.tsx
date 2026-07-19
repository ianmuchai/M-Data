import type { UploadAnalysisResponse } from '../../shared/analytics';
import { numberFormatter } from '../lib/format';

const supportedFiles = ['CSV', 'TSV', 'TXT', 'JSON', 'XLS', 'XLSX', 'XLSM', 'XLSB'];

type DatasetReadinessProps = {
  upload: UploadAnalysisResponse | null;
};

function qualityTone(score: number | undefined) {
  if (score == null) return 'waiting';
  if (score >= 85) return 'excellent';
  if (score >= 70) return 'ready';
  return 'attention';
}

export function DatasetReadiness({ upload }: DatasetReadinessProps) {
  const readyMethods = upload?.advancedAnalytics.methods.filter((method) => method.enabled).length ?? 0;
  const tone = qualityTone(upload?.qualityScore);

  return (
    <aside className={`dataset-readiness ${tone}`} aria-label="Dataset readiness">
      <div>
        <p className="eyebrow">Dataset readiness</p>
        <h3>{upload ? upload.fileName : 'Bring your data when you are ready'}</h3>
        <span>
          {upload
            ? `${numberFormatter.format(upload.rowCount)} rows, ${numberFormatter.format(upload.columnCount)} columns, ${readyMethods} analysis methods ready.`
            : 'M-Data accepts common spreadsheet, delimited, and JSON files.'}
        </span>
      </div>
      <div className="readiness-strip">
        {supportedFiles.map((fileType) => <span key={fileType}>{fileType}</span>)}
      </div>
      <div className="readiness-meter" aria-label="Upload quality score">
        <span style={{ width: `${upload?.qualityScore ?? 18}%` }} />
      </div>
      {upload ? (
        <div className="readiness-score">
          <strong>{upload.qualityScore}/100</strong>
          <span>Quality score</span>
        </div>
      ) : null}
    </aside>
  );
}

