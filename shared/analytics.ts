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

export type UploadColumnAnalysis = {
  name: string;
  type: ColumnProfile['type'];
  role: string;
  completeness: number;
  unique: number;
  records: number;
  summary: string;
  parameters: Array<{ label: string; value: string }>;
  distribution: Array<{ label: string; value: number; share: number }>;
  recommendations: string[];
};
export type UploadBusinessQuestion = {
  key: string;
  question: string;
  answer: string;
  confidence: number;
  fields: string[];
  evidence: Array<{ label: string; value: string; detail?: string }>;
  recommendation: string;
};
export type UploadLearningSummary = {
  datasetsSeen: number;
  learnedFields: number;
  strongestMarkets: string[];
  topColumnRoles: string[];
  message: string;
};
export type AdvancedAnalysisMethodKey =
  | 'regression'
  | 'correlation'
  | 'forecasting'
  | 'anomaly-detection'
  | 'segmentation'
  | 'distribution'
  | 'trend'
  | 'ranking'
  | 'what-if';

export type AdvancedAnalysisMethod = {
  key: AdvancedAnalysisMethodKey;
  title: string;
  description: string;
  enabled: boolean;
  requiredFields: string[];
  suggestedFields: string[];
  disabledReason?: string;
};

export type AdvancedAnalysisMetric = {
  label: string;
  value: string;
  rawValue?: number;
  sentiment: 'positive' | 'neutral' | 'warning' | 'negative';
};

export type AdvancedAnalysisSeriesPoint = {
  name: string;
  value: number;
  comparison?: number;
  kind?: 'actual' | 'forecast' | 'prediction' | 'bucket';
};

export type AdvancedAnalysisRow = {
  label: string;
  cells: Record<string, string | number>;
};

export type AdvancedAnalysisResult = {
  method: AdvancedAnalysisMethodKey;
  title: string;
  status: 'ready' | 'unavailable';
  summary: string;
  primaryFields: Record<string, string>;
  metrics: AdvancedAnalysisMetric[];
  series: AdvancedAnalysisSeriesPoint[];
  rows: AdvancedAnalysisRow[];
  warnings: string[];
  recommendations: string[];
};

export type AdvancedAnalyticsSummary = {
  methods: AdvancedAnalysisMethod[];
  results: AdvancedAnalysisResult[];
  recommendedMethodKeys: AdvancedAnalysisMethodKey[];
};

export type ReportBuilderConfig = {
  source: 'dashboard' | 'upload';
  chartType: 'bar' | 'line' | 'area' | 'table' | 'scorecards';
  metric: string;
  dimension: string;
  filter: string;
  layout: 'executive' | 'analyst' | 'operations';
};

export type ReportBuilderPreview = {
  title: string;
  subtitle: string;
  metrics: Metric[];
  series: AdvancedAnalysisSeriesPoint[];
  rows: AdvancedAnalysisRow[];
  recommendations: string[];
};
export type VisualStorySource = 'dashboard' | 'upload';

export type VisualStoryType = 'bar' | 'line' | 'area' | 'scorecards' | 'table' | 'comparison' | 'ranking' | 'insights';

export type PresentationPreset = 'executive' | 'analyst' | 'operations' | 'board';

export type VisualStoryConfig = {
  source: VisualStorySource;
  visualType: VisualStoryType;
  metric: string;
  dimension: string;
  preset: PresentationPreset;
  theme: 'vibrant' | 'calm' | 'boardroom';
  narrativeStyle: 'concise' | 'guided' | 'detailed';
};

export type PresentationSlide = {
  id: string;
  title: string;
  subtitle: string;
  section: string;
  narrative: string;
  metrics: Metric[];
  bullets: string[];
  visualPoints: AdvancedAnalysisSeriesPoint[];
  recommendations: string[];
};

export type PresentationDeck = {
  title: string;
  subtitle: string;
  preset: PresentationPreset;
  source: VisualStorySource;
  generatedAt: string;
  slides: PresentationSlide[];
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
  businessQuestions: UploadBusinessQuestion[];
  columnAnalyses: UploadColumnAnalysis[];
  analysisRows: Record<string, string>[];
  advancedAnalytics: AdvancedAnalyticsSummary;
  analysisOptions: UploadAnalysisOption[];
  filterViews: UploadFilterView[];
  recommendations: string[];
};







