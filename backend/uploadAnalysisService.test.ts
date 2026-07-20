import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { analyzeRows } from './uploadAnalysisService';

describe('analyzeRows', () => {
  it('analyzes normalized spreadsheet rows without requiring the original workbook payload', () => {
    const result = analyzeRows('sales-upload.xlsx', [
      { Date: '2026-01-01', Region: 'North', Revenue: 1200, Units: 12 },
      { Date: '2026-01-02', Region: 'South', Revenue: 1800, Units: 18 },
      { Date: '2026-01-03', Region: 'North', Revenue: 2200, Units: 22 },
    ]);

    assert.equal(result.fileName, 'sales-upload.xlsx');
    assert.equal(result.rowCount, 3);
    assert.equal(result.columnCount, 4);
    assert.ok(result.analysisOptions.length > 0);
    assert.ok(result.advancedAnalytics.methods.some((method) => method.key === 'regression'));
  });
});
