import { useMemo, useState } from 'react';
import type { UploadAnalysisResponse } from '../../shared/analytics';
import { numberFormatter } from '../lib/format';

type ChatMessage = {
  role: 'assistant' | 'user';
  text: string;
};

type DataAssistantProps = {
  analysis: UploadAnalysisResponse | null;
  enabled: boolean;
  onUploadRequest: () => void;
};

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function parseNumber(value: string | undefined) {
  if (!value) return null;
  const parsed = Number(String(value).replace(/[$,%\s]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function formatNumber(value: number) {
  return numberFormatter.format(Math.round(value * 100) / 100);
}

function questionTokens(question: string) {
  return normalize(question).split(' ').filter((token) => token.length > 2);
}

function columnMatch(question: string, analysis: UploadAnalysisResponse) {
  const tokens = questionTokens(question);
  return analysis.columns
    .map((column) => {
      const normalizedColumn = normalize(column.name);
      const score = tokens.reduce((total, token) => total + (normalizedColumn.includes(token) ? 1 : 0), 0) + (normalize(question).includes(normalizedColumn) ? 4 : 0);
      return { column, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)[0]?.column ?? null;
}

function tokenScore(question: string, candidate: string) {
  const tokens = questionTokens(question);
  const normalizedCandidate = normalize(candidate);
  return tokens.reduce((score, token) => score + (normalizedCandidate.includes(token) ? 1 : 0), 0);
}

function findBusinessQuestion(question: string, analysis: UploadAnalysisResponse) {
  return analysis.businessQuestions
    .map((item) => ({ item, score: tokenScore(question, `${item.question} ${item.answer} ${item.fields.join(' ')} ${item.recommendation}`) }))
    .filter(({ score }) => score >= 1)
    .sort((a, b) => b.score - a.score)[0]?.item ?? null;
}

function numericValues(analysis: UploadAnalysisResponse, columnName: string) {
  return analysis.analysisRows.map((row) => parseNumber(row[columnName])).filter((value): value is number => value != null);
}

function workbookBriefing(analysis: UploadAnalysisResponse) {
  const topQuestions = analysis.businessQuestions.slice(0, 4).map((item, index) => `${index + 1}. ${item.question} ${item.answer}`);
  const readyMethods = analysis.advancedAnalytics.results.slice(0, 5).map((item) => `${item.title}: ${item.summary}`);
  const risks = analysis.signals.slice(0, 3).map((signal) => `${signal.title}: ${signal.detail}`);
  const columns = analysis.columns.slice(0, 6).map((column) => `${column.name} (${column.type}, ${column.missing} missing)`);

  return `Here is the workbook briefing for ${analysis.fileName}:

Dataset: ${formatNumber(analysis.rowCount)} rows, ${formatNumber(analysis.columnCount)} columns, quality score ${analysis.qualityScore}/100.

Most useful business answers:
${topQuestions.join('\n') || 'No business questions generated yet.'}

Analytics already run:
${readyMethods.join('\n') || 'No ready analytical methods yet.'}

Fields to understand first:
${columns.join('; ')}

Risks or checks:
${risks.join('\n') || 'No major warning signals found.'}

Recommended next move: ${analysis.recommendations[0] ?? 'Use the Analyze page to rank, filter, and compare the highest-impact fields.'}`;
}

function describeColumn(question: string, analysis: UploadAnalysisResponse) {
  const column = columnMatch(question, analysis);
  if (!column) return null;
  const profile = analysis.columnAnalyses.find((item) => item.name === column.name);
  const parameters = profile?.parameters.map((parameter) => `${parameter.label}: ${parameter.value}`).join('; ');
  const distribution = profile?.distribution.slice(0, 4).map((item) => `${item.label}: ${formatNumber(item.value)} (${item.share}%)`).join('; ');
  const recommendations = profile?.recommendations.slice(0, 3).join(' ');

  return `${column.name} appears to be a ${column.type} field. ${profile?.summary ?? ''}

What the user can learn: missing values, spread, typical value, high/low concentration, and whether this field should be used as a metric, grouping field, filter, or risk signal.

Key parameters: ${parameters || 'No extra parameters available yet.'}${distribution ? `\n\nDistribution: ${distribution}` : ''}${recommendations ? `\n\nBusiness use: ${recommendations}` : ''}`;
}

function answerMetricCalculation(question: string, analysis: UploadAnalysisResponse) {
  const normalizedQuestion = normalize(question);
  const metric = columnMatch(question, analysis) ?? analysis.columns.find((column) => column.type === 'number') ?? null;
  if (!metric || metric.type !== 'number') return null;
  const values = numericValues(analysis, metric.name);
  if (!values.length) return null;

  const total = values.reduce((sum, value) => sum + value, 0);
  const average = total / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const sorted = [...values].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];

  if (/(average|mean|typical|normal)/.test(normalizedQuestion)) return `The average ${metric.name} is ${formatNumber(average)} and the median is ${formatNumber(median)} across ${formatNumber(values.length)} records. If the average is far from the median, a few large or small records may be pulling the result.`;
  if (/(total|sum|overall|value)/.test(normalizedQuestion)) return `The total ${metric.name} is ${formatNumber(total)} across ${formatNumber(values.length)} records. The average is ${formatNumber(average)}, with values ranging from ${formatNumber(min)} to ${formatNumber(max)}.`;
  if (/(highest|maximum|top|largest|best)/.test(normalizedQuestion)) return `The highest ${metric.name} is ${formatNumber(max)}. Review top records for opportunity, risk, pricing pressure, operational exceptions, or data-entry issues depending on this field.`;
  if (/(lowest|minimum|bottom|smallest|worst)/.test(normalizedQuestion)) return `The lowest ${metric.name} is ${formatNumber(min)}. Low records can point to underperformance, weak activity, stock gaps, small orders, or incomplete data.`;

  return `${metric.name} summary: total ${formatNumber(total)}, average ${formatNumber(average)}, median ${formatNumber(median)}, min ${formatNumber(min)}, max ${formatNumber(max)}, records ${formatNumber(values.length)}.`;
}

function answerGroupedQuestion(question: string, analysis: UploadAnalysisResponse) {
  const normalizedQuestion = normalize(question);
  const numericColumns = analysis.columns.filter((column) => column.type === 'number');
  const textColumns = analysis.columns.filter((column) => column.type !== 'number');
  const metric = columnMatch(question, analysis)?.type === 'number' ? columnMatch(question, analysis) : numericColumns[0];
  const dimension = textColumns.find((column) => normalizedQuestion.includes(normalize(column.name))) ?? textColumns.find((column) => /(branch|product|rep|customer|supplier|category|region|department|method)/.test(normalize(column.name)));
  if (!metric || !dimension) return null;
  if (!/(by|per|which|highest|lowest|top|group|segment|branch|product|supplier|customer|category|department|rep|who|where)/.test(normalizedQuestion)) return null;

  const groups = new Map<string, number[]>();
  for (const row of analysis.analysisRows) {
    const key = row[dimension.name] || 'Blank';
    const value = parseNumber(row[metric.name]);
    if (value == null) continue;
    groups.set(key, [...(groups.get(key) ?? []), value]);
  }

  const rows = Array.from(groups.entries()).map(([label, values]) => {
    const total = values.reduce((sum, value) => sum + value, 0);
    const min = Math.min(...values);
    const max = Math.max(...values);
    return { average: total / values.length, count: values.length, label, max, min, spread: max - min, total };
  }).sort((a, b) => b.total - a.total);

  const top = rows[0];
  const widest = [...rows].sort((a, b) => b.spread - a.spread)[0];
  if (!top) return null;

  return `${top.label} leads ${metric.name} by ${dimension.name}, with total ${formatNumber(top.total)} and average ${formatNumber(top.average)} across ${formatNumber(top.count)} records.

Widest variation: ${widest.label}, with spread ${formatNumber(widest.spread)} between smallest and largest records.

Top groups:
${rows.slice(0, 5).map((row, index) => `${index + 1}. ${row.label}: total ${formatNumber(row.total)}, avg ${formatNumber(row.average)}, spread ${formatNumber(row.spread)}, records ${formatNumber(row.count)}`).join('\n')}

Business interpretation: use this to decide where to reward performance, investigate inconsistency, review pricing/order quality, or coach teams.`;
}

function answerRelationship(question: string, analysis: UploadAnalysisResponse) {
  const normalizedQuestion = normalize(question);
  if (!/(correlat|relationship|related|regression|driver|affect|impact|why|cause|move together)/.test(normalizedQuestion)) return null;
  const numericColumns = analysis.columns.filter((column) => column.type === 'number');
  if (numericColumns.length < 2) return null;

  let best: { left: string; right: string; value: number } | null = null;
  for (let leftIndex = 0; leftIndex < numericColumns.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < numericColumns.length; rightIndex += 1) {
      const left = numericColumns[leftIndex];
      const right = numericColumns[rightIndex];
      const pairs = analysis.analysisRows
        .map((row) => ({ left: parseNumber(row[left.name]), right: parseNumber(row[right.name]) }))
        .filter((pair): pair is { left: number; right: number } => pair.left != null && pair.right != null);
      if (pairs.length < 3) continue;
      const leftMean = pairs.reduce((sum, pair) => sum + pair.left, 0) / pairs.length;
      const rightMean = pairs.reduce((sum, pair) => sum + pair.right, 0) / pairs.length;
      const numerator = pairs.reduce((sum, pair) => sum + (pair.left - leftMean) * (pair.right - rightMean), 0);
      const leftVariance = Math.sqrt(pairs.reduce((sum, pair) => sum + (pair.left - leftMean) ** 2, 0));
      const rightVariance = Math.sqrt(pairs.reduce((sum, pair) => sum + (pair.right - rightMean) ** 2, 0));
      const value = leftVariance && rightVariance ? numerator / (leftVariance * rightVariance) : 0;
      if (!best || Math.abs(value) > Math.abs(best.value)) best = { left: left.name, right: right.name, value };
    }
  }

  if (!best) return null;
  const strength = Math.abs(best.value) >= 0.7 ? 'strong' : Math.abs(best.value) >= 0.4 ? 'moderate' : 'weak';
  return `${best.left} and ${best.right} show the strongest detected relationship, with correlation ${best.value.toFixed(2)} (${strength}).

Business interpretation: the fields move together in this workbook, but correlation does not prove causation. Use this as a signal for deeper regression, segmentation, or exception review.`;
}

function answerQuestionList(question: string, analysis: UploadAnalysisResponse) {
  const normalizedQuestion = normalize(question);
  const wantsOverview = /(important|business questions|what should|summary|key|explain|overview|insight|recommend|what is going on|what do you see|help me understand|tell me)/.test(normalizedQuestion);
  const wantsPriority = /(priority|review|urgent|attention|exception|risk|problem|issue|bad|good)/.test(normalizedQuestion);

  if (!wantsOverview && !wantsPriority) return null;
  if (!wantsPriority && /(average|total|highest|lowest|correlat|relationship|by|per)/.test(normalizedQuestion)) return null;

  const questions = analysis.businessQuestions
    .filter((item) => !wantsPriority || /priority|attention|review|reorder|variance|pressure|delay|overstock|settlement|risk|missing/i.test(`${item.question} ${item.recommendation}`))
    .slice(0, 6);

  return `${workbookBriefing(analysis)}

${questions.length ? `Focused answers:\n${questions.map((item, index) => `${index + 1}. ${item.question} ${item.answer}`).join('\n')}` : ''}`;
}

function buildAssistantAnswer(question: string, analysis: UploadAnalysisResponse | null) {
  if (!analysis) return 'Upload a workbook first, then I can answer analytical and business questions from the actual data. I can summarize the workbook, explain fields, find top groups, calculate averages/totals, compare segments, identify relationships, and suggest next actions.';

  const normalizedQuestion = normalize(question);
  if (!normalizedQuestion || /(start|hello|hi|what can you do)/.test(normalizedQuestion)) return workbookBriefing(analysis);

  const questionList = answerQuestionList(question, analysis);
  if (questionList) return questionList;

  const businessQuestion = findBusinessQuestion(question, analysis);
  if (businessQuestion) return `${businessQuestion.answer}

Why this matters: ${businessQuestion.recommendation}

Evidence: ${businessQuestion.evidence.map((item) => `${item.label}: ${item.value}${item.detail ? ` (${item.detail})` : ''}`).join('; ')}

Fields used: ${businessQuestion.fields.join(', ')}`;

  return answerGroupedQuestion(question, analysis)
    ?? answerMetricCalculation(question, analysis)
    ?? answerRelationship(question, analysis)
    ?? describeColumn(question, analysis)
    ?? workbookBriefing(analysis);
}

export function DataAssistant({ analysis, enabled, onUploadRequest }: DataAssistantProps) {
  const [open, setOpen] = useState(true);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', text: 'Hi, I am the BizDATA assistant. Ask naturally: “what is going on?”, “what should I do?”, “which branch is best?”, or “explain the risks.”' },
  ]);

  const quickPrompts = useMemo(() => [
    'Give me a full briefing',
    'What should I do next?',
    'Which groups are performing best?',
    'What risks or exceptions matter?',
  ], []);

  if (!enabled) return null;

  const submit = (value = input) => {
    const question = value.trim();
    if (!question) return;
    setMessages((current) => [...current, { role: 'user', text: question }, { role: 'assistant', text: buildAssistantAnswer(question, analysis) }]);
    setInput('');
  };

  return (
    <div className={`data-assistant ${open ? 'open' : ''}`}>
      {open ? (
        <section className="assistant-panel" aria-label="BizDATA assistant">
          <div className="assistant-header">
            <div>
              <p className="eyebrow">BizDATA Agent</p>
              <strong>{analysis ? `Ready for ${analysis.fileName}` : 'Upload data to unlock answers'}</strong>
            </div>
            <button aria-label="Hide assistant" onClick={() => setOpen(false)} type="button">Hide</button>
          </div>

          <div className="assistant-messages">
            {messages.map((message, index) => (
              <div className={`assistant-message ${message.role}`} key={`${message.role}-${index}`}>
                {message.text.split('\n').map((line) => <p key={line || index}>{line}</p>)}
              </div>
            ))}
          </div>

          <div className="assistant-prompts">
            {quickPrompts.map((prompt) => <button key={prompt} onClick={() => submit(prompt)} type="button">{prompt}</button>)}
          </div>

          <form className="assistant-input" onSubmit={(event) => { event.preventDefault(); submit(); }}>
            <input onChange={(event) => setInput(event.target.value)} placeholder={analysis ? 'Ask naturally about the workbook, risks, trends, groups, or next actions' : 'Upload data first or ask what I can do'} value={input} />
            <button type="submit">Ask</button>
          </form>

          {!analysis ? <button className="assistant-upload" onClick={onUploadRequest} type="button">Go to upload</button> : null}
        </section>
      ) : (
        <button aria-label="Open BizDATA chat assistant" className="assistant-launcher" data-tooltip="Open BizDATA chat assistant" onClick={() => setOpen(true)} type="button">
          <span className="assistant-launcher-icon" aria-hidden="true"><span /><span /><span /></span>
          <span className="visually-hidden">Open BizDATA chat assistant</span>
        </button>
      )}
    </div>
  );
}
