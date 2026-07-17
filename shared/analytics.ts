export type CategoryKey = 'source' | 'channel' | 'region';
export type RangeKey = '7d' | '30d' | '90d';

export type Metric = {
  label: string;
  value: string;
  delta: string;
  sentiment: 'positive' | 'neutral' | 'warning' | 'negative';
};

export type DataPoint = {
  name: string;
  value: number;
  target: number;
};

export type Insight = {
  label: string;
  value: string;
};

export type Category = {
  key: CategoryKey;
  label: string;
};

export type RangeOption = {
  key: RangeKey;
  label: string;
};

export type Alert = {
  title: string;
  detail: string;
  severity: 'info' | 'warning' | 'critical';
};

export type BreakdownRow = {
  name: string;
  users: number;
  conversion: number;
  revenue: number;
  latency: number;
};

export type DetailPoint = {
  title: string;
  value: string;
  caption: string;
  tone: 'teal' | 'gold' | 'coral' | 'blue';
};

export type AnalyticsResponse = {
  generatedAt: string;
  metrics: Metric[];
  categories: Category[];
  ranges: RangeOption[];
  selectedCategory: CategoryKey;
  selectedRange: RangeKey;
  trend: DataPoint[];
  insights: Insight[];
  alerts: Alert[];
  breakdown: BreakdownRow[];
  detailPoints: DetailPoint[];
  summary: {
    score: number;
    change: string;
    recommendation: string;
    target: number;
  };
};

export type ColumnProfile = {
  name: string;
  type: 'number' | 'date' | 'boolean' | 'text';
  missing: number;
  unique: number;
  sample: string;
  min?: number | string;
  max?: number | string;
  average?: number;
};

export type UploadSignal = {
  title: string;
  detail: string;
  severity: 'info' | 'warning' | 'critical';
};

export type UploadFieldStatistic = {
  name: string;
  total: number;
  average: number;
  median: number;
  min: number;
  max: number;
  records: number;
  missing: number;
  zeroCount: number;
  outlierCount: number;
  shareOfOptionTotal: number;
};

export type UploadSegmentBreakdown = {
  segmentField: string;
  segmentValue: string;
  metricField: string;
  total: number;
  average: number;
  records: number;
  share: number;
};

export type UploadBusinessInsight = {
  title: string;
  detail: string;
  severity: 'info' | 'warning' | 'critical';
};

export type UploadFilterView = {
  key: string;
  title: string;
  description: string;
  matchedBy: string;
  rowCount: number;
  columns: string[];
  rows: Record<string, string>[];
  metrics: Metric[];
  recommendations: string[];
};
export type UploadAnalysisOption = {
  key: string;
  title: string;
  description: string;
  columns: string[];
  metrics: Metric[];
  fieldStats: UploadFieldStatistic[];
  segmentBreakdowns: UploadSegmentBreakdown[];
  insights: UploadBusinessInsight[];
  recommendations: string[];
};

export type UploadRoleInsight = {
  column: string;
  role: string;
  confidence: number;
  reason: string;
};

export type UploadMarketSignal = {
  key: string;
  title: string;
  confidence: number;
  matchedFields: string[];
  recommendedParameters: string[];
};

export type UploadLearningSummary = {
  datasetsSeen: number;
  learnedFields: number;
  strongestMarkets: string[];
  topColumnRoles: string[];
  message: string;
};
export type UploadAnalysisResponse = {
  fileName: string;
  generatedAt: string;
  rowCount: number;
  columnCount: number;
  qualityScore: number;
  columns: ColumnProfile[];
  signals: UploadSignal[];
  metrics: Metric[];
  roleInsights: UploadRoleInsight[];
  marketSignals: UploadMarketSignal[];
  learningSummary: UploadLearningSummary;
  analysisOptions: UploadAnalysisOption[];
  filterViews: UploadFilterView[];
  recommendations: string[];
};



