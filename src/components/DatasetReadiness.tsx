import type { UploadAnalysisResponse } from '../../shared/analytics';
import { numberFormatter } from '../lib/format';

const supportedFiles = ['CSV', 'TSV', 'TXT', 'JSON', 'XLS', 'XLSX', 'XLSM', 'XLSB'];

type DatasetReadinessProps = {
  upload: UploadAnalysisResponse | null;
};

export function DatasetReadiness({ upload }: DatasetReadinessProps) {
  const readyMethods = upload?.advancedAnalytics.methods.filter((method) => method.enabled).length ?? 0;

  return (
    <aside className="dataset-readiness" aria-label="Dataset readiness">
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
      {upload ? (
        <div className="readiness-score">
          <strong>{upload.qualityScore}/100</strong>
          <span>Quality score</span>
        </div>
      ) : null}
    </aside>
  );
}

