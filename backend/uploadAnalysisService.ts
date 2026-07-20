import * as XLSX from 'xlsx';
import type {
  ColumnProfile,
  Metric,
  UploadAnalysisOption,
  UploadAnalysisResponse,
  UploadBusinessInsight,
  UploadFieldStatistic,
  UploadFilterView,
  UploadSegmentBreakdown,
  UploadSignal,
  UploadMarketSignal,
  UploadRoleInsight,
} from '../shared/analytics';
import { getLearnedRole, recordLearning, summarizeLearning } from './learningStore';
import { buildAdvancedAnalytics } from './advancedAnalysisService';

type DataRow = Record<string, string>;
type UploadedRow = Record<string, unknown>;

const numericHints = ['amount', 'balance', 'revenue', 'premium', 'claim', 'loss', 'price', 'cost', 'income', 'score', 'risk', 'unit', 'quantity', 'qty', 'volume', 'sales'];
const riskHints = ['risk', 'fraud', 'claim', 'default', 'loss', 'delinquent', 'overdue', 'chargeback'];
const identityHints = ['customer', 'client', 'account', 'policy', 'loan', 'transaction', 'email', 'phone'];
const segmentHints = ['region', 'branch', 'channel', 'product', 'segment', 'country', 'city', 'department', 'category', 'market', 'team'];
const unitHints = ['unit', 'units', 'quantity', 'qty', 'volume', 'sold'];
const stockHints = ['stock', 'inventory', 'on hand', 'on_hand', 'available', 'qty', 'quantity'];
const categoryHints = ['category', 'department', 'segment', 'class', 'type', 'collection', 'division', 'family'];
const nonCategoryHints = ['id', 'sku', 'code', 'number', 'email', 'phone', 'address', 'name', 'description', 'comment', 'note', 'reference', 'transaction'];

function stringifyCell(value: unknown) {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

function parseDelimitedLine(line: string, delimiter: string) {
  const cells: string[] = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      cells.push(cell.trim());
      cell = '';
    } else {
      cell += char;
    }
  }

  cells.push(cell.trim());
  return cells;
}

function detectDelimiter(line: string) {
  const candidates = [',', '\t', ';', '|'];
  return candidates
    .map((delimiter) => ({ delimiter, count: parseDelimitedLine(line, delimiter).length }))
    .sort((a, b) => b.count - a.count)[0].delimiter;
}

function parseDelimited(content: string): DataRow[] {
  const lines = content
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const delimiter = detectDelimiter(lines[0]);
  const headers = parseDelimitedLine(lines[0], delimiter).map((header, index) => header || `column_${index + 1}`);

  return lines.slice(1).map((line) => {
    const cells = parseDelimitedLine(line, delimiter);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? '']));
  });
}

function normalizeSheetRows(rows: unknown[][]): DataRow[] {
  const [headerRow, ...bodyRows] = rows;
  if (!headerRow || bodyRows.length === 0) return [];

  const headers = headerRow.map((header, index) => stringifyCell(header) || `column_${index + 1}`);

  return bodyRows
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, stringifyCell(row[index])])) )
    .filter((row) => Object.values(row).some((value) => value.trim() !== ''));
}

function parseExcel(content: string): DataRow[] {
  const workbook = XLSX.read(Buffer.from(content, 'base64'), {
    cellDates: true,
    dense: false,
    type: 'buffer',
  });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
    blankrows: false,
    defval: '',
    header: 1,
    raw: false,
  });

  return normalizeSheetRows(rows);
}

function parseJson(content: string): DataRow[] {
  const parsed = JSON.parse(content) as unknown;
  const rows = Array.isArray(parsed) ? parsed : typeof parsed === 'object' && parsed ? Object.values(parsed) : [];

  return rows
    .filter((row): row is Record<string, unknown> => typeof row === 'object' && row !== null && !Array.isArray(row))
    .map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, stringifyCell(value)])));
}

function parseRows(fileName: string, content: string, encoding = 'text'): DataRow[] {
  if (encoding === 'base64' || /\.(xlsx|xls|xlsm|xlsb)$/i.test(fileName)) return parseExcel(content);
  if (fileName.toLowerCase().endsWith('.json') || content.trim().startsWith('[') || content.trim().startsWith('{')) return parseJson(content);
  return parseDelimited(content);
}

function isNumber(value: string) {
  return value.trim() !== '' && Number.isFinite(Number(value.replace(/[$,%\s]/g, '')));
}

function toNumber(value: string) {
  return Number(value.replace(/[$,%\s]/g, ''));
}

function isDate(value: string) {
  return value.trim() !== '' && !Number.isNaN(Date.parse(value)) && /[-/T:]/.test(value);
}

function inferType(values: string[]): ColumnProfile['type'] {
  const filled = values.filter(Boolean);
  if (filled.length === 0) return 'text';

  const numericRatio = filled.filter(isNumber).length / filled.length;
  const dateRatio = filled.filter(isDate).length / filled.length;
  const booleanRatio = filled.filter((value) => /^(true|false|yes|no|0|1)$/i.test(value)).length / filled.length;

  if (numericRatio >= 0.85) return 'number';
  if (dateRatio >= 0.75) return 'date';
  if (booleanRatio >= 0.9) return 'boolean';
  return 'text';
}

function profileColumns(rows: DataRow[]): ColumnProfile[] {
  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));

  return headers.map((name) => {
    const values = rows.map((row) => row[name] ?? '');
    const filled = values.filter((value) => value.trim() !== '');
    const type = inferType(values);
    const profile: ColumnProfile = {
      missing: values.length - filled.length,
      name,
      sample: filled[0] ?? '',
      type,
      unique: new Set(filled).size,
    };

    if (type === 'number') {
      const numbers = filled.map(toNumber).filter(Number.isFinite);
      const total = numbers.reduce((sum, value) => sum + value, 0);
      profile.average = numbers.length ? round(total / numbers.length) : undefined;
      profile.min = numbers.length ? Math.min(...numbers) : undefined;
      profile.max = numbers.length ? Math.max(...numbers) : undefined;
    }

    if (type === 'date') {
      const timestamps = filled.map((value) => Date.parse(value)).filter(Number.isFinite);
      profile.min = timestamps.length ? new Date(Math.min(...timestamps)).toISOString().slice(0, 10) : undefined;
      profile.max = timestamps.length ? new Date(Math.max(...timestamps)).toISOString().slice(0, 10) : undefined;
    }

    return profile;
  });
}

function includesAny(value: string, hints: string[]) {
  const normalized = value.toLowerCase();
  return hints.some((hint) => normalized.includes(hint));
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function formatNumber(value: number) {
  return Math.round(value).toLocaleString('en-US');
}

function median(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function percentile(values: number[], ratio: number) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * ratio)));
  return sorted[index];
}

function getNumericValues(rows: DataRow[], columnName: string) {
  return rows.map((row) => row[columnName] ?? '').filter(isNumber).map(toNumber);
}

const marketTemplates = [
  {
    key: 'retail-commerce',
    title: 'Retail, shops, and e-commerce',
    hints: ['sku', 'product', 'category', 'stock', 'inventory', 'price', 'units', 'sold', 'cart', 'basket', 'revenue', 'discount', 'margin', 'supplier', 'store'],
    parameters: ['best-selling products', 'low-stock items', 'slow-moving stock', 'sales by category', 'profit margin', 'discount performance', 'supplier performance'],
  },
  {
    key: 'banking-credit',
    title: 'Banking, lending, and credit',
    hints: ['account', 'loan', 'balance', 'exposure', 'limit', 'deposit', 'principal', 'interest', 'default', 'delinquent', 'branch', 'customer', 'repayment'],
    parameters: ['loan exposure', 'default risk', 'deposit concentration', 'branch performance', 'customer value', 'late repayment risk', 'portfolio aging'],
  },
  {
    key: 'insurance-risk',
    title: 'Insurance and claims',
    hints: ['policy', 'premium', 'claim', 'loss', 'reserve', 'payout', 'settlement', 'broker', 'renewal', 'coverage', 'risk', 'underwriting'],
    parameters: ['claims cost', 'loss ratio', 'premium adequacy', 'reserve pressure', 'renewal risk', 'broker performance', 'high-claim segments'],
  },
  {
    key: 'finance-planning',
    title: 'Finance, accounting, and planning',
    hints: ['revenue', 'cost', 'expense', 'profit', 'margin', 'budget', 'forecast', 'ledger', 'cash', 'invoice', 'variance', 'payable', 'receivable'],
    parameters: ['profitability', 'cost variance', 'cash movement', 'budget gaps', 'forecast accuracy', 'margin leakage', 'invoice risk'],
  },
  {
    key: 'operations-supply-chain',
    title: 'Operations, logistics, and supply chain',
    hints: ['order', 'supplier', 'warehouse', 'delivery', 'lead', 'cycle', 'stock', 'inventory', 'capacity', 'fulfillment', 'shipment', 'route', 'fleet'],
    parameters: ['delivery delays', 'supplier concentration', 'stock availability', 'warehouse performance', 'route efficiency', 'fulfillment bottlenecks'],
  },
  {
    key: 'telecom-subscription',
    title: 'Telecom, SaaS, and subscriptions',
    hints: ['subscriber', 'plan', 'usage', 'churn', 'arpu', 'renewal', 'activation', 'network', 'bundle', 'subscription', 'license', 'seat'],
    parameters: ['churn risk', 'revenue per user', 'usage levels', 'plan performance', 'renewals', 'inactive users', 'network or service demand'],
  },
  {
    key: 'healthcare-clinics',
    title: 'Healthcare, clinics, and hospitals',
    hints: ['patient', 'diagnosis', 'treatment', 'appointment', 'admission', 'discharge', 'doctor', 'clinic', 'hospital', 'claim', 'procedure', 'medicine', 'pharmacy'],
    parameters: ['patient volume', 'treatment cost', 'appointment attendance', 'diagnosis patterns', 'medicine usage', 'claims cost', 'clinic performance'],
  },
  {
    key: 'education-training',
    title: 'Education and training',
    hints: ['student', 'course', 'class', 'grade', 'score', 'attendance', 'enrollment', 'teacher', 'school', 'tuition', 'exam', 'completion'],
    parameters: ['student performance', 'attendance risk', 'course demand', 'completion rates', 'tuition collection', 'teacher/class performance'],
  },
  {
    key: 'real-estate-property',
    title: 'Real estate and property',
    hints: ['property', 'tenant', 'rent', 'lease', 'unit', 'occupancy', 'vacancy', 'maintenance', 'landlord', 'building', 'apartment', 'sqm'],
    parameters: ['occupancy', 'rent collection', 'vacancy risk', 'maintenance cost', 'tenant value', 'property performance'],
  },
  {
    key: 'manufacturing-production',
    title: 'Manufacturing and production',
    hints: ['batch', 'machine', 'production', 'defect', 'scrap', 'yield', 'downtime', 'line', 'plant', 'material', 'workorder', 'quality'],
    parameters: ['production volume', 'defect rate', 'machine downtime', 'yield loss', 'material usage', 'plant performance', 'quality issues'],
  },
  {
    key: 'hospitality-travel',
    title: 'Hospitality, hotels, and travel',
    hints: ['booking', 'guest', 'room', 'hotel', 'stay', 'reservation', 'occupancy', 'night', 'fare', 'ticket', 'flight', 'tour'],
    parameters: ['occupancy', 'booking value', 'guest segments', 'cancellation risk', 'room revenue', 'travel demand', 'seasonality'],
  },
  {
    key: 'energy-utilities',
    title: 'Energy, water, and utilities',
    hints: ['meter', 'usage', 'consumption', 'kwh', 'water', 'utility', 'billing', 'outage', 'tariff', 'connection', 'load', 'generation'],
    parameters: ['usage levels', 'billing gaps', 'outage impact', 'tariff performance', 'meter exceptions', 'customer consumption'],
  },
  {
    key: 'agriculture-food',
    title: 'Agriculture and food supply',
    hints: ['farm', 'crop', 'yield', 'harvest', 'livestock', 'farmer', 'acre', 'hectare', 'fertilizer', 'produce', 'commodity', 'season'],
    parameters: ['crop yield', 'harvest volume', 'input cost', 'seasonal performance', 'farmer productivity', 'commodity value'],
  },
  {
    key: 'marketing-sales-crm',
    title: 'Marketing, sales, and CRM',
    hints: ['lead', 'campaign', 'conversion', 'funnel', 'opportunity', 'deal', 'salesperson', 'pipeline', 'customer', 'retention', 'acquisition'],
    parameters: ['lead conversion', 'campaign ROI', 'pipeline value', 'customer retention', 'sales team performance', 'deal velocity'],
  },
  {
    key: 'hr-workforce',
    title: 'HR, payroll, and workforce',
    hints: ['employee', 'salary', 'payroll', 'attendance', 'leave', 'department', 'performance', 'hire', 'attrition', 'shift', 'overtime'],
    parameters: ['payroll cost', 'attendance', 'overtime', 'employee turnover', 'department performance', 'leave patterns'],
  },
  {
    key: 'public-sector-ngo',
    title: 'Government, NGO, and public programs',
    hints: ['beneficiary', 'program', 'grant', 'donor', 'county', 'district', 'ward', 'project', 'service', 'case', 'household', 'funding'],
    parameters: ['beneficiary reach', 'program cost', 'service delivery', 'funding utilization', 'regional coverage', 'case outcomes'],
  },
  {
    key: 'transport-mobility',
    title: 'Transport and mobility',
    hints: ['vehicle', 'driver', 'trip', 'route', 'fare', 'fuel', 'mileage', 'fleet', 'delivery', 'passenger', 'ride', 'ticket'],
    parameters: ['trip volume', 'route revenue', 'fuel cost', 'driver performance', 'fleet utilization', 'delivery delays'],
  },
  {
    key: 'media-entertainment',
    title: 'Media, events, and entertainment',
    hints: ['viewer', 'stream', 'content', 'event', 'ticket', 'artist', 'campaign', 'impression', 'engagement', 'subscriber', 'show'],
    parameters: ['audience growth', 'ticket sales', 'content performance', 'engagement', 'subscriber value', 'event profitability'],
  },
  {
    key: 'legal-compliance',
    title: 'Legal, compliance, and risk control',
    hints: ['case', 'contract', 'compliance', 'audit', 'incident', 'violation', 'regulation', 'risk', 'review', 'control', 'finding'],
    parameters: ['case backlog', 'compliance gaps', 'audit findings', 'incident frequency', 'contract risk', 'control performance'],
  },
];

function inferColumnRole(rows: DataRow[], column: ColumnProfile): UploadRoleInsight {
  const name = column.name.toLowerCase();
  const learned = getLearnedRole(column.name);
  let role = 'descriptive_attribute';
  let confidence = 58;
  let reason = 'Column behaves like a descriptive field.';

  if (column.type === 'date') {
    role = 'time_period';
    confidence = 92;
    reason = 'Values parse as dates and can support trend or aging analysis.';
  } else if (includesAny(name, stockHints)) {
    role = 'inventory_position';
    confidence = 92;
    reason = 'Column name and numeric behavior indicate stock or inventory position.';
  } else if (includesAny(name, unitHints)) {
    role = 'volume_measure';
    confidence = 90;
    reason = 'Column indicates units, quantity, volume, or activity count.';
  } else if (column.type === 'number' && includesAny(name, ['balance', 'exposure', 'loan', 'limit', 'principal', 'asset'])) {
    role = 'exposure_measure';
    confidence = 90;
    reason = 'Column is numeric and maps to balances, loans, limits, assets, or financial exposure.';
  } else if (column.type === 'number' && includesAny(name, ['revenue', 'sales', 'income', 'profit', 'margin', 'premium'])) {
    role = 'value_measure';
    confidence = 91;
    reason = 'Column is numeric and maps to monetary value or income performance.';
  } else if (column.type === 'number' && includesAny(name, ['cost', 'expense', 'loss', 'claim', 'payout', 'reserve'])) {
    role = 'cost_or_loss_measure';
    confidence = 89;
    reason = 'Column is numeric and maps to cost, claims, loss, or reserve pressure.';
  } else if (column.type === 'number' && includesAny(name, ['risk', 'score', 'default', 'fraud', 'overdue'])) {
    role = 'risk_indicator';
    confidence = 88;
    reason = 'Column indicates risk scoring, default, fraud, or overdue exposure.';
  } else if (column.type === 'number') {
    role = 'numeric_measure';
    confidence = 72;
    reason = 'Column is numeric and can support KPI, distribution, or outlier analysis.';
  } else if (isLikelyCategoryColumn(rows, column)) {
    role = 'segment_dimension';
    confidence = 86;
    reason = 'Column has repeated categorical values suitable for segment comparison.';
  } else if (looksIdentifierLike(column, columnValues(rows, column))) {
    role = 'identifier';
    confidence = 84;
    reason = 'Column appears to identify an entity, product, account, policy, or transaction.';
  }

  if (learned && learned.role === role) {
    confidence = Math.min(99, confidence + Math.round(learned.confidence / 8));
    reason = `${reason} Prior uploads also learned this role.`;
  } else if (learned && confidence < 78) {
    role = learned.role;
    confidence = Math.max(confidence, Math.min(86, learned.confidence));
    reason = 'Role was improved from adaptive schema memory built from prior uploads.';
  }

  return { column: column.name, confidence, reason, role };
}

function detectMarketSignals(columns: ColumnProfile[]): UploadMarketSignal[] {
  const names = columns.map((column) => column.name.toLowerCase());
  return marketTemplates
    .map((template) => {
      const matchedFields = columns
        .filter((column) => template.hints.some((hint) => column.name.toLowerCase().includes(hint)))
        .map((column) => column.name);
      const uniqueMatches = new Set(matchedFields.map((field) => field.toLowerCase())).size;
      const confidence = Math.min(99, Math.round((uniqueMatches / Math.max(template.hints.length, 1)) * 140));
      const hasDirectMarketHint = names.some((name) => name.includes(template.key.split('-')[0]));
      return {
        confidence: hasDirectMarketHint ? Math.max(confidence, 76) : confidence,
        key: template.key,
        matchedFields,
        recommendedParameters: template.parameters,
        title: template.title,
      };
    })
    .filter((signal) => signal.confidence >= 18 || signal.matchedFields.length >= 2)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 6);
}

function buildMarketSignals(columns: ColumnProfile[], roleInsights: UploadRoleInsight[]) {
  const signals = detectMarketSignals(columns);
  const roleParameters = roleInsights
    .filter((insight) => ['segment_dimension', 'value_measure', 'volume_measure', 'risk_indicator', 'inventory_position', 'exposure_measure', 'cost_or_loss_measure'].includes(insight.role))
    .slice(0, 8)
    .map((insight) => `${insight.column} as ${insight.role.replace(/_/g, ' ')}`);

  return signals.map((signal) => ({
    ...signal,
    recommendedParameters: Array.from(new Set([...signal.recommendedParameters, ...roleParameters])).slice(0, 10),
  }));
}
function buildSignals(columns: ColumnProfile[], rows: DataRow[]): UploadSignal[] {
  const signals: UploadSignal[] = [];
  const missingCells = columns.reduce((total, column) => total + column.missing, 0);
  const totalCells = Math.max(columns.length * rows.length, 1);
  const missingRate = missingCells / totalCells;
  const riskColumns = columns.filter((column) => includesAny(column.name, riskHints));
  const moneyColumns = columns.filter((column) => column.type === 'number' && includesAny(column.name, numericHints));
  const identityColumns = columns.filter((column) => includesAny(column.name, identityHints));
  const segmentColumns = detectSegmentColumns(rows, columns);

  signals.push({ detail: `${rows.length.toLocaleString('en-US')} records and ${columns.length} fields are ready for profiling.`, severity: 'info', title: 'Dataset ingested' });

  if (missingRate > 0.08) {
    signals.push({ detail: `${Math.round(missingRate * 100)}% of cells are blank. Resolve missing values before regulated reporting.`, severity: missingRate > 0.2 ? 'critical' : 'warning', title: 'Data completeness risk' });
  }

  if (riskColumns.length > 0) signals.push({ detail: `${riskColumns.map((column) => column.name).join(', ')} can support risk scoring, fraud monitoring, or claims analysis.`, severity: 'info', title: 'Risk indicators detected' });
  if (moneyColumns.length > 0) signals.push({ detail: `${moneyColumns.map((column) => column.name).join(', ')} look suitable for exposure, revenue, balance, units sold, or claims analysis.`, severity: 'info', title: 'Business measures detected' });
  if (identityColumns.length > 0) signals.push({ detail: 'Customer or account identifiers are present. Apply access controls and masking before sharing exports.', severity: 'warning', title: 'Sensitive identifier watch' });
  if (segmentColumns.length > 0) signals.push({ detail: `${segmentColumns.map((column) => column.name).join(', ')} can be used for segment, branch, geography, or product comparisons.`, severity: 'info', title: 'Segmentation fields found' });

  return signals;
}

function buildFieldStatistics(rows: DataRow[], columns: ColumnProfile[]): UploadFieldStatistic[] {
  const numericColumns = columns.filter((column) => column.type === 'number');
  const totals = numericColumns.map((column) => getNumericValues(rows, column.name).reduce((sum, value) => sum + value, 0));
  const optionTotal = totals.reduce((sum, value) => sum + Math.abs(value), 0) || 1;

  return numericColumns.map((column, index) => {
    const values = getNumericValues(rows, column.name);
    const total = values.reduce((sum, value) => sum + value, 0);
    const q1 = percentile(values, 0.25);
    const q3 = percentile(values, 0.75);
    const iqr = q3 - q1;
    const lowerFence = q1 - iqr * 1.5;
    const upperFence = q3 + iqr * 1.5;

    return {
      average: values.length ? round(total / values.length) : 0,
      max: values.length ? Math.max(...values) : 0,
      median: round(median(values)),
      min: values.length ? Math.min(...values) : 0,
      missing: column.missing,
      name: column.name,
      outlierCount: iqr > 0 ? values.filter((value) => value < lowerFence || value > upperFence).length : 0,
      records: values.length,
      shareOfOptionTotal: round((Math.abs(totals[index]) / optionTotal) * 100),
      total: round(total),
      zeroCount: values.filter((value) => value === 0).length,
    };
  }).sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
}

function segmentValue(row: DataRow, column: ColumnProfile) {
  const rawValue = row[column.name] || 'Blank';
  if (column.type === 'date') {
    const timestamp = Date.parse(rawValue);
    return Number.isFinite(timestamp) ? new Date(timestamp).toISOString().slice(0, 7) : 'Invalid date';
  }
  return rawValue || 'Blank';
}

function columnValues(rows: DataRow[], column: ColumnProfile) {
  return rows.map((row) => row[column.name] ?? '').filter((value) => value.trim() !== '');
}

function averageTextLength(values: string[]) {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value.length, 0) / values.length;
}

function looksIdentifierLike(column: ColumnProfile, values: string[]) {
  const normalized = column.name.toLowerCase();
  if (includesAny(normalized, identityHints) || includesAny(normalized, nonCategoryHints)) return true;

  const mostlyUnique = values.length >= 20 && column.unique / Math.max(values.length, 1) > 0.72;
  const codeLikeRatio = values.filter((value) => /^[a-z]{0,5}[-_ ]?\d{2,}$/i.test(value) || /^[a-z0-9]{8,}$/i.test(value)).length / Math.max(values.length, 1);
  return mostlyUnique || codeLikeRatio > 0.55;
}

function looksFreeTextLike(column: ColumnProfile, values: string[]) {
  const normalized = column.name.toLowerCase();
  if (includesAny(normalized, ['description', 'comment', 'note', 'address'])) return true;
  return averageTextLength(values) > 38;
}

function isLikelyCategoryColumn(rows: DataRow[], column: ColumnProfile) {
  if (column.type === 'number' || column.type === 'date') return false;

  const values = columnValues(rows, column);
  if (values.length === 0 || column.unique < 2) return false;
  if (looksIdentifierLike(column, values) || looksFreeTextLike(column, values)) return false;

  const uniqueRatio = column.unique / Math.max(values.length, 1);
  const hasCategoryName = includesAny(column.name, categoryHints) || includesAny(column.name, ['region', 'branch', 'channel', 'market', 'team', 'country', 'city']);
  const repeatedEnough = uniqueRatio <= 0.45 || column.unique <= Math.max(12, Math.sqrt(values.length) * 2);

  return hasCategoryName ? uniqueRatio <= 0.75 && column.unique <= 80 : repeatedEnough && column.unique <= 40;
}

function detectSegmentColumns(rows: DataRow[], columns: ColumnProfile[]) {
  const seen = new Set<string>();
  return columns
    .filter((column) => {
      if (seen.has(column.name)) return false;
      seen.add(column.name);
      return isLikelyCategoryColumn(rows, column);
    })
    .sort((a, b) => {
      const aNamed = includesAny(a.name, segmentHints) || includesAny(a.name, categoryHints);
      const bNamed = includesAny(b.name, segmentHints) || includesAny(b.name, categoryHints);
      if (aNamed !== bNamed) return Number(bNamed) - Number(aNamed);
      return a.unique - b.unique;
    });
}
function buildSegmentBreakdowns(rows: DataRow[], metricColumns: ColumnProfile[], allColumns: ColumnProfile[]): UploadSegmentBreakdown[] {
  const usableMetricColumns = metricColumns.filter((column) => column.type === 'number').slice(0, 4);
  if (usableMetricColumns.length === 0) return [];

  const segmentColumns = detectSegmentColumns(rows, allColumns).slice(0, 4);

  const breakdowns: UploadSegmentBreakdown[] = [];

  for (const segmentColumn of segmentColumns) {
    for (const metricColumn of usableMetricColumns) {
      const totalForMetric = Math.abs(getNumericValues(rows, metricColumn.name).reduce((sum, value) => sum + value, 0)) || 1;
      const groups = new Map<string, { total: number; records: number }>();

      for (const row of rows) {
        const rawMetric = row[metricColumn.name] ?? '';
        if (!isNumber(rawMetric)) continue;
        const key = segmentValue(row, segmentColumn);
        const current = groups.get(key) ?? { records: 0, total: 0 };
        current.records += 1;
        current.total += toNumber(rawMetric);
        groups.set(key, current);
      }

      Array.from(groups.entries())
        .map(([value, group]) => ({
          average: round(group.total / Math.max(group.records, 1)),
          metricField: metricColumn.name,
          records: group.records,
          segmentField: segmentColumn.name,
          segmentValue: value,
          share: round((Math.abs(group.total) / totalForMetric) * 100),
          total: round(group.total),
        }))
        .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))
        .slice(0, 3)
        .forEach((breakdown) => breakdowns.push(breakdown));
    }
  }

  return breakdowns.sort((a, b) => Math.abs(b.total) - Math.abs(a.total)).slice(0, 12);
}

function buildOptionInsights(fieldStats: UploadFieldStatistic[], segmentBreakdowns: UploadSegmentBreakdown[]): UploadBusinessInsight[] {
  const insights: UploadBusinessInsight[] = [];
  const leader = fieldStats[0];
  const highestAverage = [...fieldStats].sort((a, b) => b.average - a.average)[0];
  const outlierLeader = [...fieldStats].sort((a, b) => b.outlierCount - a.outlierCount)[0];
  const topSegment = segmentBreakdowns[0];

  if (leader) {
    insights.push({
      detail: `${leader.name} contributes ${leader.shareOfOptionTotal}% of the measured value with a total of ${formatNumber(leader.total)}.`,
      severity: 'info',
      title: 'Primary value driver',
    });
  }

  if (highestAverage && highestAverage.average !== leader?.average) {
    insights.push({
      detail: `${highestAverage.name} has the highest average per record at ${formatNumber(highestAverage.average)}. This is a strong candidate for pricing, utilization, or portfolio mix review.`,
      severity: 'info',
      title: 'Highest per-record intensity',
    });
  }

  if (outlierLeader && outlierLeader.outlierCount > 0) {
    insights.push({
      detail: `${outlierLeader.outlierCount} outlier records were detected in ${outlierLeader.name}. These records should be reviewed before decisions, forecasts, or regulatory reporting.`,
      severity: outlierLeader.outlierCount > Math.max(outlierLeader.records * 0.08, 3) ? 'warning' : 'info',
      title: 'Outliers require review',
    });
  }

  if (topSegment) {
    insights.push({
      detail: `${topSegment.segmentValue} leads ${topSegment.metricField} by ${topSegment.segmentField}, representing ${topSegment.share}% of that measured value.`,
      severity: topSegment.share > 55 ? 'warning' : 'info',
      title: topSegment.share > 55 ? 'Concentration risk or opportunity' : 'Top performing segment',
    });
  }

  return insights;
}

function buildOptionMetrics(fieldStats: UploadFieldStatistic[], segmentBreakdowns: UploadSegmentBreakdown[]): Metric[] {
  const total = fieldStats.reduce((sum, field) => sum + field.total, 0);
  const records = fieldStats.reduce((max, field) => Math.max(max, field.records), 0);
  const outliers = fieldStats.reduce((sum, field) => sum + field.outlierCount, 0);
  const leader = fieldStats[0];
  const topSegment = segmentBreakdowns[0];

  return [
    { label: 'Total measured value', value: formatNumber(total), delta: `${fieldStats.length} fields`, sentiment: fieldStats.length ? 'positive' : 'warning' },
    { label: 'Average per record', value: formatNumber(records ? total / records : 0), delta: `${records.toLocaleString('en-US')} rows`, sentiment: records ? 'positive' : 'neutral' },
    { label: 'Top driver', value: leader ? leader.name : 'None', delta: leader ? `${leader.shareOfOptionTotal}% share` : 'not found', sentiment: leader ? 'positive' : 'warning' },
    { label: 'Outlier records', value: outliers.toLocaleString('en-US'), delta: topSegment ? `top: ${topSegment.segmentValue}` : 'review', sentiment: outliers ? 'warning' : 'positive' },
  ];
}

function buildOptionRecommendations(title: string, fieldStats: UploadFieldStatistic[], segmentBreakdowns: UploadSegmentBreakdown[], baseRecommendations: string[]) {
  const recommendations = [...baseRecommendations];
  const topField = fieldStats[0];
  const topSegment = segmentBreakdowns[0];
  const weakFields = fieldStats.filter((field) => field.missing > 0 || field.zeroCount > Math.max(field.records * 0.2, 2)).slice(0, 2);

  if (topField) {
    recommendations.push(`Prioritize ${topField.name}: it carries ${topField.shareOfOptionTotal}% of this analysis value and should have owner-level monitoring.`);
  }

  if (topSegment) {
    recommendations.push(`Use ${topSegment.segmentField} = ${topSegment.segmentValue} as the first management drill-down for ${topSegment.metricField}; it contributes ${topSegment.share}% of measured value.`);
  }

  if (weakFields.length > 0) {
    recommendations.push(`Improve data capture for ${weakFields.map((field) => field.name).join(', ')} because missing or zero-heavy values reduce decision confidence.`);
  }

  if (/revenue|unit|sales/i.test(title) && topField) {
    recommendations.push(`Model uplift scenarios on ${topField.name}: even a 5% improvement would represent about ${formatNumber(topField.total * 0.05)} in additional measured value.`);
  }

  if (/claim|risk|exposure|balance/i.test(title) && topField) {
    recommendations.push(`Create exception thresholds around the top 10% of ${topField.name} records to focus reviews where financial impact is highest.`);
  }

  return Array.from(new Set(recommendations)).slice(0, 6);
}

function createAnalysisOption(
  key: string,
  title: string,
  description: string,
  columns: ColumnProfile[],
  allColumns: ColumnProfile[],
  rows: DataRow[],
  recommendations: string[],
): UploadAnalysisOption | null {
  if (columns.length === 0) return null;

  const fallbackMetricColumns = allColumns.filter((column) => column.type === 'number');
  const metricColumns = columns.some((column) => column.type === 'number') ? columns.filter((column) => column.type === 'number') : fallbackMetricColumns;
  const fieldStats = buildFieldStatistics(rows, metricColumns);
  const segmentBreakdowns = buildSegmentBreakdowns(rows, metricColumns, [...columns, ...allColumns]);
  const insights = buildOptionInsights(fieldStats, segmentBreakdowns);

  return {
    columns: columns.map((column) => column.name),
    description,
    fieldStats,
    insights,
    key,
    metrics: buildOptionMetrics(fieldStats, segmentBreakdowns),
    recommendations: buildOptionRecommendations(title, fieldStats, segmentBreakdowns, recommendations),
    segmentBreakdowns,
    title,
  };
}

function buildAnalysisOptions(columns: ColumnProfile[], rows: DataRow[]): UploadAnalysisOption[] {
  const numericColumns = columns.filter((column) => column.type === 'number');
  const dateColumns = columns.filter((column) => column.type === 'date');
  const financialColumns = numericColumns.filter((column) => includesAny(column.name, numericHints));
  const unitColumns = numericColumns.filter((column) => includesAny(column.name, unitHints));
  const exposureColumns = numericColumns.filter((column) => includesAny(column.name, ['exposure', 'loan', 'limit', 'balance', 'principal', 'asset']));
  const revenueColumns = numericColumns.filter((column) => includesAny(column.name, ['revenue', 'income', 'sales', 'premium', 'fee', 'profit']));
  const claimColumns = numericColumns.filter((column) => includesAny(column.name, ['claim', 'loss', 'payout', 'settlement', 'reserve']));
  const balanceColumns = numericColumns.filter((column) => includesAny(column.name, ['balance', 'deposit', 'account', 'cash', 'ledger']));
  const riskColumns = columns.filter((column) => includesAny(column.name, riskHints));
  const segmentColumns = detectSegmentColumns(rows, columns);
  const identityColumns = columns.filter((column) => includesAny(column.name, identityHints));

  return [
    createAnalysisOption('financial-measures', 'Financial measures', 'Quantify monetary and numeric business measures, value concentration, outliers, and optimization priorities.', financialColumns, columns, rows, [
      'Rank high-value records and monitor outliers before management reporting.',
      'Compare financial measures by segment, product, region, or customer group.',
    ]),
    createAnalysisOption('unit-analysis', 'Units and volume analysis', 'Analyse sold units, quantities, volume, and activity counts to understand operational throughput.', unitColumns, columns, rows, [
      'Identify the product, region, or channel driving most sold units or activity volume.',
      'Compare high-volume segments against revenue or claims to detect margin and service pressure.',
    ]),
    createAnalysisOption('exposure-analysis', 'Exposure analysis', 'Quantify balances, limits, loans, assets, and principal amounts that drive financial exposure.', exposureColumns, columns, rows, [
      'Create exposure bands and identify concentration risk across customers or regions.',
      'Compare exposure values against risk scores, claims, or overdue indicators.',
    ]),
    createAnalysisOption('revenue-analysis', 'Revenue analysis', 'Analyse revenue, income, sales, premium, fee, and profit columns with segment-level contribution.', revenueColumns, columns, rows, [
      'Track top revenue drivers and underperforming segments.',
      'Create period-over-period revenue movements when date fields exist.',
    ]),
    createAnalysisOption('balance-analysis', 'Balance analysis', 'Quantify deposit, cash, account, and ledger balance fields with concentration checks.', balanceColumns, columns, rows, [
      'Flag unusually high or low balances for review.',
      'Combine balances with customer identifiers to monitor portfolio concentration.',
    ]),
    createAnalysisOption('claim-analysis', 'Claim analysis', 'Analyse claims, losses, payouts, settlements, and reserves for insurance workflows.', claimColumns, columns, rows, [
      'Identify high claim amounts and potential reserve pressure.',
      'Segment claims by branch, region, product, or risk band.',
    ]),
    createAnalysisOption('risk-analysis', 'Risk and exception analysis', 'Review risk, fraud, default, loss, overdue, and chargeback indicators against financial impact.', riskColumns, columns, rows, [
      'Build exception queues for high-risk accounts, policies, or claims.',
      'Cross-check risk indicators against exposure and claim values.',
    ]),
    createAnalysisOption('segmentation-analysis', 'Segmentation analysis', 'Compare performance and risk by region, branch, channel, product, country, city, or department.', segmentColumns, columns, rows, [
      'Compare performance and risk by geography, branch, channel, or product.',
      'Use segment fields as dashboard filters for business users.',
    ]),
    createAnalysisOption('time-analysis', 'Time trend analysis', 'Use detected date fields to build monthly trend, aging, and period comparisons.', dateColumns, columns, rows, [
      'Create daily, weekly, monthly, or quarterly trend views.',
      'Use dates to monitor aging, delinquency, renewal, claims, and transaction movement.',
    ]),
    createAnalysisOption('identity-governance', 'Identity and privacy review', 'Review identifiers while using numeric measures to detect customer, policy, or account-level concentration.', identityColumns, columns, rows, [
      'Mask identifiers before sharing extracts outside approved teams.',
      'Use identifiers for joins, deduplication, and entity-level dashboards.',
    ]),
    createAnalysisOption('numeric-overview', 'Numeric field overview', 'Analyse all numeric fields when no specific business lens is obvious.', numericColumns, columns, rows, [
      'Check numeric ranges, averages, and missing values before modelling.',
      'Use numeric fields for KPI cards, trends, and distribution analysis.',
    ]),
  ].filter((option): option is UploadAnalysisOption => Boolean(option));
}

function buildMetrics(rows: DataRow[], columns: ColumnProfile[], qualityScore: number): Metric[] {
  const numericCount = columns.filter((column) => column.type === 'number').length;
  const dateCount = columns.filter((column) => column.type === 'date').length;

  return [
    { label: 'Rows analysed', value: rows.length.toLocaleString('en-US'), delta: 'uploaded', sentiment: 'neutral' },
    { label: 'Columns', value: columns.length.toLocaleString('en-US'), delta: `${numericCount} numeric`, sentiment: 'positive' },
    { label: 'Date fields', value: dateCount.toLocaleString('en-US'), delta: 'time signals', sentiment: dateCount ? 'positive' : 'warning' },
    { label: 'Quality score', value: `${qualityScore}/100`, delta: qualityScore >= 80 ? 'ready' : 'review', sentiment: qualityScore >= 80 ? 'positive' : 'warning' },
  ];
}

function sanitizeRowsForExport(rows: DataRow[], limit = 5000) {
  return rows.slice(0, limit).map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, stringifyCell(value)])));
}

function buildFilterMetrics(rows: DataRow[], columns: ColumnProfile[]): Metric[] {
  const numericColumns = columns.filter((column) => column.type === 'number');
  const valueColumns = numericColumns.filter((column) => includesAny(column.name, ['revenue', 'sales', 'amount', 'price', 'value', 'premium', 'balance', 'stock', 'quantity', 'qty', 'unit']));
  const totalValue = valueColumns.reduce((sum, column) => sum + getNumericValues(rows, column.name).reduce((total, value) => total + value, 0), 0);
  const stockColumn = numericColumns.find((column) => includesAny(column.name, stockHints));
  const averageStock = stockColumn ? getNumericValues(rows, stockColumn.name).reduce((sum, value, _index, values) => sum + value / Math.max(values.length, 1), 0) : 0;

  return [
    { label: 'Filtered rows', value: rows.length.toLocaleString('en-US'), delta: 'records', sentiment: rows.length ? 'positive' : 'warning' },
    { label: 'Numeric fields', value: numericColumns.length.toLocaleString('en-US'), delta: 'measures', sentiment: numericColumns.length ? 'positive' : 'neutral' },
    { label: 'Measured value', value: formatNumber(totalValue), delta: valueColumns.length ? 'detected' : 'not found', sentiment: valueColumns.length ? 'positive' : 'neutral' },
    { label: 'Avg stock', value: formatNumber(averageStock), delta: stockColumn?.name ?? 'no stock field', sentiment: stockColumn ? 'warning' : 'neutral' },
  ];
}


function slugPart(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'value';
}

function createFilterView(
  key: string,
  title: string,
  description: string,
  matchedBy: string,
  rows: DataRow[],
  columns: ColumnProfile[],
  recommendations: string[],
): UploadFilterView | null {
  if (rows.length === 0) return null;

  return {
    columns: columns.map((column) => column.name),
    description,
    key,
    matchedBy,
    metrics: buildFilterMetrics(rows, columns),
    recommendations,
    rowCount: rows.length,
    rows: sanitizeRowsForExport(rows),
    title,
  };
}

function buildLowStockRows(rows: DataRow[], columns: ColumnProfile[]) {
  const stockColumn = columns.find((column) => column.type === 'number' && includesAny(column.name, stockHints));
  if (!stockColumn) return null;

  const values = getNumericValues(rows, stockColumn.name).filter((value) => value >= 0);
  if (values.length === 0) return null;

  const threshold = Math.max(5, percentile(values, 0.25));
  return {
    column: stockColumn.name,
    matchedBy: `${stockColumn.name} <= ${round(threshold)}`,
    rows: rows.filter((row) => isNumber(row[stockColumn.name] ?? '') && toNumber(row[stockColumn.name]) <= threshold),
    threshold,
  };
}

function buildTopValueRows(rows: DataRow[], columns: ColumnProfile[]) {
  const valueColumn = columns.find((column) => column.type === 'number' && includesAny(column.name, ['revenue', 'sales', 'income', 'profit', 'premium', 'amount', 'value', 'balance', 'exposure']));
  if (!valueColumn) return null;

  const values = getNumericValues(rows, valueColumn.name);
  if (values.length === 0) return null;

  const threshold = percentile(values, 0.75);
  return {
    column: valueColumn.name,
    matchedBy: `${valueColumn.name} >= ${round(threshold)}`,
    rows: rows.filter((row) => isNumber(row[valueColumn.name] ?? '') && toNumber(row[valueColumn.name]) >= threshold),
    threshold,
  };
}

function buildHighRiskRows(rows: DataRow[], columns: ColumnProfile[]) {
  const riskColumn = columns.find((column) => column.type === 'number' && includesAny(column.name, riskHints));
  if (!riskColumn) return null;

  const values = getNumericValues(rows, riskColumn.name);
  if (values.length === 0) return null;

  const threshold = percentile(values, 0.75);
  return {
    column: riskColumn.name,
    matchedBy: `${riskColumn.name} >= ${round(threshold)}`,
    rows: rows.filter((row) => isNumber(row[riskColumn.name] ?? '') && toNumber(row[riskColumn.name]) >= threshold),
    threshold,
  };
}

function buildCategoryValueFilters(rows: DataRow[], columns: ColumnProfile[]) {
  const segmentColumns = detectSegmentColumns(rows, columns).slice(0, 4);
  const views: Array<{ key: string; title: string; description: string; matchedBy: string; rows: DataRow[]; recommendations: string[] }> = [];

  for (const column of segmentColumns) {
    const counts = new Map<string, number>();
    for (const row of rows) {
      const value = segmentValue(row, column);
      if (!value || value === 'Blank') continue;
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }

    Array.from(counts.entries())
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .forEach(([value, count]) => {
        const matchedRows = rows.filter((row) => segmentValue(row, column) === value);
        views.push({
          description: `Records where ${column.name} is ${value}. This export is generated from values found in the uploaded file.`,
          key: `group-${slugPart(column.name)}-${slugPart(value)}`,
          matchedBy: `${column.name} = ${value}`,
          recommendations: [
            `Use this filtered view to compare ${value} against other ${column.name} groups.`,
            `Review totals, risk, missing data, and outliers for this group before making decisions.`,
          ],
          rows: matchedRows,
          title: `${column.name}: ${value}`,
        });
      });
  }

  return views.sort((a, b) => b.rows.length - a.rows.length).slice(0, 10);
}

function buildFilterViews(rows: DataRow[], columns: ColumnProfile[]): UploadFilterView[] {
  const filterConfigs: Array<{ key: string; title: string; description: string; matchedBy: string; rows: DataRow[]; recommendations: string[] }> = [];
  const lowStock = buildLowStockRows(rows, columns);
  const topValue = buildTopValueRows(rows, columns);
  const highRisk = buildHighRiskRows(rows, columns);

  if (lowStock) {
    filterConfigs.push({
      description: 'Records at or below the detected low-stock threshold. This appears only when the uploaded file has a stock or inventory field.',
      key: 'rule-low-stock',
      matchedBy: lowStock.matchedBy,
      recommendations: [
        'Prioritize replenishment, transfers, or follow-up for these records before availability affects business performance.',
        'Compare these rows against sales, value, region, or supplier fields to decide what should be handled first.',
      ],
      rows: lowStock.rows,
      title: `Low ${lowStock.column}`,
    });
  }

  if (topValue) {
    filterConfigs.push({
      description: 'Records in the top value range for the strongest value or balance field detected in the file.',
      key: 'rule-top-value',
      matchedBy: topValue.matchedBy,
      recommendations: [
        'Use this view to focus management attention on records with the highest financial impact.',
        'Check whether these high-value rows are concentrated in specific groups, regions, products, customers, or teams.',
      ],
      rows: topValue.rows,
      title: `Top ${topValue.column}`,
    });
  }

  if (highRisk) {
    filterConfigs.push({
      description: 'Records in the highest detected risk range. This appears only when the uploaded file has a risk-related numeric field.',
      key: 'rule-high-risk',
      matchedBy: highRisk.matchedBy,
      recommendations: [
        'Review these records first for exception handling, approvals, claims, credit, compliance, or operational follow-up.',
        'Compare high-risk records against value, exposure, segment, and date fields to prioritize action.',
      ],
      rows: highRisk.rows,
      title: `High ${highRisk.column}`,
    });
  }

  filterConfigs.push(...buildCategoryValueFilters(rows, columns));

  return filterConfigs
    .map((config) => createFilterView(config.key, config.title, config.description, config.matchedBy, config.rows, columns, config.recommendations))
    .filter((view): view is UploadFilterView => Boolean(view));
}
function buildRecommendations(columns: ColumnProfile[], signals: UploadSignal[]) {
  const recommendations = [
    'Validate source ownership, update frequency, and regulatory handling before production use.',
    'Use numeric business fields for exposure, units sold, revenue, loss, premium, balance, or claim trend analysis.',
  ];

  if (columns.some((column) => column.type === 'date')) recommendations.push('Create period-over-period views using detected date fields.');
  if (signals.some((signal) => signal.title.includes('Sensitive'))) recommendations.push('Mask identifiers before sharing dashboards with broader teams.');
  if (columns.some((column) => includesAny(column.name, riskHints))) recommendations.push('Build risk bands and exception queues for high-risk accounts, policies, or claims.');

  return recommendations;
}

function normalizeUploadedRows(rows: UploadedRow[]): DataRow[] {
  return rows
    .map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, stringifyCell(value)])))
    .filter((row) => Object.values(row).some((value) => value.trim() !== ''));
}

export function analyzeRows(fileName: string, uploadedRows: UploadedRow[]): UploadAnalysisResponse {
  const rows = normalizeUploadedRows(uploadedRows).slice(0, 10000);

  if (rows.length === 0) {
    throw new Error('No rows could be parsed. Ensure the first sheet has a header row and at least one data row.');
  }

  const columns = profileColumns(rows);
  const totalCells = Math.max(columns.length * rows.length, 1);
  const missingCells = columns.reduce((total, column) => total + column.missing, 0);
  const typedColumns = columns.filter((column) => column.type !== 'text').length;
  const completeness = 1 - missingCells / totalCells;
  const structure = columns.length ? typedColumns / columns.length : 0;
  const qualityScore = Math.max(0, Math.min(100, Math.round(completeness * 72 + structure * 28)));
  const roleInsights = columns.map((column) => inferColumnRole(rows, column));
  const marketSignals = buildMarketSignals(columns, roleInsights);
  const learningSummary = recordLearning({
    columnRoles: roleInsights,
    markets: marketSignals.map((market) => ({ confidence: market.confidence, key: market.key })),
  });
  const signals = buildSignals(columns, rows);
  const analysisOptions = buildAnalysisOptions(columns, rows);
  const filterViews = buildFilterViews(rows, columns);
  const advancedAnalytics = buildAdvancedAnalytics(rows, columns);

  return {
    advancedAnalytics,
    analysisOptions,
    filterViews,
    columnCount: columns.length,
    columns,
    fileName,
    generatedAt: new Date().toISOString(),
    metrics: buildMetrics(rows, columns, qualityScore),
    roleInsights,
    marketSignals,
    learningSummary,
    qualityScore,
    recommendations: buildRecommendations(columns, signals),
    rowCount: rows.length,
    signals,
  };
}
export function analyzeUpload(fileName: string, content: string, encoding = 'text'): UploadAnalysisResponse {
  return analyzeRows(fileName, parseRows(fileName, content, encoding));
}

