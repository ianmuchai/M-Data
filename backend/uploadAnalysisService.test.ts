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
    assert.ok(result.columnAnalyses.some((column) => column.name === 'Revenue'));
    assert.equal(result.analysisRows.length, 3);
  });

  it('keeps large spreadsheet analysis responses below Vercel function payload limits', () => {
    const rows = Array.from({ length: 2500 }, (_, index) => ({
      Date: '2026-01-' + String((index % 28) + 1).padStart(2, '0'),
      Region: ['North', 'South', 'East', 'West'][index % 4],
      Product: 'Product ' + (index % 100),
      Revenue: index * 17 + 100,
      Units: (index % 50) + 1,
      Risk: index % 10,
    }));

    const result = analyzeRows('large-upload.xlsx', rows);
    const bytes = Buffer.byteLength(JSON.stringify(result), 'utf8');

    assert.ok(bytes < 4000000, 'Expected response below 4MB, got ' + bytes + ' bytes');
    assert.ok(result.filterViews.every((view) => view.rows.length <= 250));
  });

  it('answers common sales business questions from branch, rep, payment, and date fields', () => {
    const result = analyzeRows('sales-questions.xlsx', [
      { Date: '2026-05-03', Branch: 'Nairobi', SalesRep: 'Asha', PaymentMethod: 'Card', Revenue: 1200, OrderSize: 1200 },
      { Date: '2026-05-10', Branch: 'Nairobi', SalesRep: 'Asha', PaymentMethod: 'Cash', Revenue: 1800, OrderSize: 1800 },
      { Date: '2026-06-07', Branch: 'Mombasa', SalesRep: 'Ben', PaymentMethod: 'Card', Revenue: 2800, OrderSize: 2800 },
      { Date: '2026-06-14', Branch: 'Mombasa', SalesRep: 'Ben', PaymentMethod: 'Mobile Money', Revenue: 4000, OrderSize: 4000 },
      { Date: '2026-07-05', Branch: 'Kisumu', SalesRep: 'Chao', PaymentMethod: 'Mobile Money', Revenue: 3200, OrderSize: 3200 },
      { Date: '2026-07-12', Branch: 'Mombasa', SalesRep: 'Ben', PaymentMethod: 'Card', Revenue: 5200, OrderSize: 5200 },
    ]);

    const questions = result.businessQuestions.map((question) => question.question);

    assert.ok(questions.includes('Which branch generates the most revenue?'));
    assert.ok(questions.includes('What is the average order by sales rep, and who has the widest variance?'));
    assert.ok(questions.includes('How does payment method correlate with order size?'));
    assert.ok(questions.includes('Is there a week-over-week or month-over-month sales trend?'));
    assert.equal(result.businessQuestions.find((question) => question.key === 'top-branch-revenue')?.answer.includes('Mombasa'), true);
    assert.equal(result.businessQuestions.find((question) => question.key === 'sales-rep-average-variance')?.answer.includes('Ben'), true);
    assert.ok(result.businessQuestions.length >= 6);
    assert.ok(result.columnAnalyses.find((column) => column.name === 'PaymentMethod')?.distribution.length);
    assert.ok(result.analysisRows[0].Branch);
  });
  it('keeps date columns out of numeric totals and asks practical inventory questions', () => {
    const result = analyzeRows('inventory.xlsx', [
      { Date: '2026-07-01', ProductName: 'Sugar 1kg', Category: 'Food', StockOnHand: 8, ReorderPoint: 15, UnitCost: 120, Supplier: 'Alpha' },
      { Date: '2026-07-02', ProductName: 'Rice 2kg', Category: 'Food', StockOnHand: 40, ReorderPoint: 25, UnitCost: 220, Supplier: 'Beta' },
      { Date: '2026-07-03', ProductName: 'Soap', Category: 'Home', StockOnHand: 5, ReorderPoint: 12, UnitCost: 95, Supplier: 'Alpha' },
      { Date: '2026-07-04', ProductName: 'Tissue', Category: 'Home', StockOnHand: 18, ReorderPoint: 10, UnitCost: 80, Supplier: 'Gamma' },
    ]);

    const dateAnalysis = result.columnAnalyses.find((column) => column.name === 'Date');
    const dateLabels = dateAnalysis?.parameters.map((parameter) => parameter.label) ?? [];
    const questions = result.businessQuestions.map((question) => question.question);

    assert.ok(dateLabels.includes('Earliest'));
    assert.ok(dateLabels.includes('Latest'));
    assert.equal(dateLabels.includes('Total'), false);
    assert.ok(questions.includes('Which items need reorder attention first?'));
    assert.ok(questions.includes('Where is the business most concentrated?'));
    assert.ok(questions.some((question) => question.includes('data quality')));
  });
});
