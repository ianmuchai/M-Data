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
  it('answers practical accounting questions about spend, receivables, variance, and review priorities', () => {
    const result = analyzeRows('accounting-ledger.xlsx', [
      { Date: '2026-01-05', Account: 'Office Supplies', CostCenter: 'Admin', Supplier: 'PaperCo', Expense: 1200, Budget: 1000, InvoiceAmount: 1200, Receivable: 0 },
      { Date: '2026-02-05', Account: 'Office Supplies', CostCenter: 'Admin', Supplier: 'PaperCo', Expense: 1800, Budget: 1000, InvoiceAmount: 1800, Receivable: 0 },
      { Date: '2026-03-05', Account: 'Fuel', CostCenter: 'Logistics', Supplier: 'FuelMax', Expense: 4200, Budget: 3000, InvoiceAmount: 4200, Receivable: 0 },
      { Date: '2026-03-08', Account: 'Customer Balance', CostCenter: 'Sales', Supplier: 'Client A', Expense: 0, Budget: 0, InvoiceAmount: 0, Receivable: 7600 },
      { Date: '2026-03-09', Account: 'Customer Balance', CostCenter: 'Sales', Supplier: 'Client B', Expense: 0, Budget: 0, InvoiceAmount: 0, Receivable: 2400 },
    ]);

    const questions = result.businessQuestions.map((question) => question.question);

    assert.ok(questions.includes('Which accounting area is creating the biggest pressure?'));
    assert.ok(questions.includes('Where is budget variance highest?'));
    assert.ok(questions.includes('Which receivables or payables need collection or settlement focus?'));
    assert.ok(result.businessQuestions.find((question) => question.key === 'accounting-pressure')?.answer.includes('Logistics'));
  });

  it('answers practical operations questions about stock, suppliers, delays, and bottlenecks', () => {
    const result = analyzeRows('operations.xlsx', [
      { Date: '2026-07-01', Product: 'Widget A', Supplier: 'Alpha', Warehouse: 'Nairobi', StockOnHand: 5, ReorderPoint: 20, UnitsSold: 80, LeadTimeDays: 12, DelayDays: 4 },
      { Date: '2026-07-02', Product: 'Widget B', Supplier: 'Beta', Warehouse: 'Nairobi', StockOnHand: 50, ReorderPoint: 25, UnitsSold: 30, LeadTimeDays: 7, DelayDays: 1 },
      { Date: '2026-07-03', Product: 'Widget C', Supplier: 'Alpha', Warehouse: 'Mombasa', StockOnHand: 8, ReorderPoint: 15, UnitsSold: 60, LeadTimeDays: 15, DelayDays: 6 },
      { Date: '2026-07-04', Product: 'Widget D', Supplier: 'Gamma', Warehouse: 'Kisumu', StockOnHand: 120, ReorderPoint: 30, UnitsSold: 8, LeadTimeDays: 5, DelayDays: 0 },
    ]);

    const questions = result.businessQuestions.map((question) => question.question);

    assert.ok(questions.includes('Which items need reorder attention first?'));
    assert.ok(questions.includes('Which supplier, warehouse, route, or team is creating operational delay?'));
    assert.ok(questions.includes('Which items may be overstocked or slow-moving?'));
    assert.ok(result.businessQuestions.find((question) => question.key === 'operations-delay')?.answer.includes('Alpha'));
  });

  it('answers broad business research questions when the industry is not obvious', () => {
    const result = analyzeRows('business-research.xlsx', [
      { SurveyDate: '2026-04-01', Segment: 'Enterprise', Region: 'North', SatisfactionScore: 86, AdoptionRate: 0.72, ResponseCount: 120 },
      { SurveyDate: '2026-04-02', Segment: 'SMB', Region: 'North', SatisfactionScore: 62, AdoptionRate: 0.38, ResponseCount: 80 },
      { SurveyDate: '2026-05-01', Segment: 'Enterprise', Region: 'South', SatisfactionScore: 91, AdoptionRate: 0.81, ResponseCount: 140 },
      { SurveyDate: '2026-05-02', Segment: 'SMB', Region: 'South', SatisfactionScore: 58, AdoptionRate: 0.35, ResponseCount: 70 },
    ]);

    const questions = result.businessQuestions.map((question) => question.question);

    assert.ok(questions.includes('What is the strongest pattern in this dataset?'));
    assert.ok(questions.includes('Which segment should management investigate first?'));
    assert.ok(questions.includes('Which variables appear related enough for deeper analysis?'));
    assert.ok(result.businessQuestions.length >= 8);
  });
  it('uses pricing-specific business language for unit price priority review questions', () => {
    const rows = Array.from({ length: 50 }, (_, index) => ({
      Product: `Item ${index + 1}`,
      Category: index % 2 ? 'Retail' : 'Wholesale',
      Supplier: index % 3 ? 'Supplier A' : 'Supplier B',
      'Unit Price (KES)': index < 43 ? 120 + index * 10 : 1020 + index * 15,
      Quantity: 5 + (index % 9),
    }));

    const result = analyzeRows('unit-prices.xlsx', rows);
    const question = result.businessQuestions.find((item) => item.key === 'top-decile-unit-price-kes');

    assert.ok(question);
    assert.ok(question.question.includes('Unit Price (KES)'));
    assert.match(question.recommendation, /pricing|margin|supplier|procurement/i);
    assert.doesNotMatch(question.recommendation, /exceptional revenue, risk, discounting, or operational follow-up/i);
  });
});
