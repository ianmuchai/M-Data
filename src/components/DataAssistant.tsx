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

function columnMatch(question: string, analysis: UploadAnalysisResponse) {
  const normalizedQuestion = normalize(question);
  return analysis.columns.find((column) => {
    const normalizedColumn = normalize(column.name);
    return normalizedQuestion.includes(normalizedColumn) || normalizedColumn.split(' ').some((part) => part.length > 3 && normalizedQuestion.includes(part));
  });
}

function tokenScore(question: string, candidate: string) {
  const tokens = normalize(question).split(' ').filter((token) => token.length > 2);
  const normalizedCandidate = normalize(candidate);
  return tokens.reduce((score, token) => score + (normalizedCandidate.includes(token) ? 1 : 0), 0);
}

function findBusinessQuestion(question: string, analysis: UploadAnalysisResponse) {
  return analysis.businessQuestions
    .map((item) => ({ item, score: tokenScore(question, `${item.question} ${item.answer} ${item.fields.join(' ')} ${item.recommendation}`) }))
    .filter(({ score }) => score >= 2)
    .sort((a, b) => b.score - a.score)[0]?.item ?? null;
}

function numericValues(analysis: UploadAnalysisResponse, columnName: string) {
  return analysis.analysisRows.map((row) => parseNumber(row[columnName])).filter((value): value is number => value != null);
}

function describeColumn(question: string, analysis: UploadAnalysisResponse) {
  const column = columnMatch(question, analysis);
  if (!column) return null;
  const profile = analysis.columnAnalyses.find((item) => item.name === column.name);
  const parameters = profile?.parameters.map((parameter) => `${parameter.label}: ${parameter.value}`).join('; ');
  const distribution = profile?.distribution.slice(0, 4).map((item) => `${item.label}: ${formatNumber(item.value)} (${item.share}%)`).join('; ');
  const recommendations = profile?.recommendations.slice(0, 2).join(' ');

  return `Here is how to read ${column.name}: ${profile?.summary ?? `${column.name} is a ${column.type} field.`}\n\nKey parameters: ${parameters || 'No extra parameters available yet.'}${distribution ? `\n\nDistribution: ${distribution}` : ''}${recommendations ? `\n\nBusiness use: ${recommendations}` : ''}`;
}

function answerMetricCalculation(question: string, analysis: UploadAnalysisResponse) {
  const normalizedQuestion = normalize(question);
  const metric = columnMatch(question, analysis);
  if (!metric || metric.type !== 'number') return null;
  const values = numericValues(analysis, metric.name);
  if (!values.length) return null;

  const total = values.reduce((sum, value) => sum + value, 0);
  const average = total / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);

  if (normalizedQuestion.includes('average') || normalizedQuestion.includes('mean')) {
    return `The average ${metric.name} is ${formatNumber(average)} across ${formatNumber(values.length)} records. Use this as the typical value, especially for scores, rates, reorder points, prices, and thresholds.`;
  }

  if (normalizedQuestion.includes('total') || normalizedQuestion.includes('sum')) {
    const nonAdditive = /price|rate|score|reorder|threshold|point|ratio|percent|age/i.test(metric.name);
    return nonAdditive
      ? `${metric.name} averages ${formatNumber(average)}. I would not rely on a total for this field because it behaves like a price, score, rate, threshold, or position field rather than a value that should always be added together. The mathematical sum is ${formatNumber(total)}.`
      : `The total ${metric.name} is ${formatNumber(total)} across ${formatNumber(values.length)} records.`;
  }

  if (normalizedQuestion.includes('highest') || normalizedQuestion.includes('maximum') || normalizedQuestion.includes('top')) {
    return `The highest ${metric.name} is ${formatNumber(max)}. The top range is worth reviewing because unusually high values can point to opportunity, risk, pricing/cost pressure, operational exceptions, or data-entry issues depending on the field.`;
  }

  if (normalizedQuestion.includes('lowest') || normalizedQuestion.includes('minimum') || normalizedQuestion.includes('bottom')) {
    return `The lowest ${metric.name} is ${formatNumber(min)}. Low values can be useful for finding underperformance, missing activity, low stock, weak adoption, or unusually small transactions.`;
  }

  return null;
}

function answerGroupedQuestion(question: string, analysis: UploadAnalysisResponse) {
  const normalizedQuestion = normalize(question);
  const numericColumns = analysis.columns.filter((column) => column.type === 'number');
  const textColumns = analysis.columns.filter((column) => column.type !== 'number');
  const metric = numericColumns.find((column) => normalizedQuestion.includes(normalize(column.name))) ?? numericColumns[0];
  const dimension = textColumns.find((column) => normalizedQuestion.includes(normalize(column.name)));
  if (!metric || !dimension) return null;
  if (!/(by|per|which|highest|lowest|top|group|segment|branch|product|supplier|customer|category|department)/.test(normalizedQuestion)) return null;

  const groups = new Map<string, number[]>();
  for (const row of analysis.analysisRows) {
    const key = row[dimension.name] || 'Blank';
    const value = parseNumber(row[metric.name]);
    if (value == null) continue;
    groups.set(key, [...(groups.get(key) ?? []), value]);
  }

  const rows = Array.from(groups.entries()).map(([label, values]) => {
    const total = values.reduce((sum, value) => sum + value, 0);
    return { average: total / values.length, count: values.length, label, total };
  }).sort((a, b) => b.total - a.total);

  const top = rows[0];
  const bottom = rows[rows.length - 1];
  if (!top) return null;

  return `${top.label} leads ${metric.name} by ${dimension.name}, with a total of ${formatNumber(top.total)} and an average of ${formatNumber(top.average)} across ${formatNumber(top.count)} records.${bottom && bottom.label !== top.label ? ` ${bottom.label} is lowest among the displayed groups.` : ''}\n\nBusiness interpretation: use this to identify the segment, product, branch, supplier, customer, or team that deserves the first management review.`;
}

function answerRelationship(question: string, analysis: UploadAnalysisResponse) {
  const normalizedQuestion = normalize(question);
  if (!/(correlat|relationship|related|regression|driver|affect|impact)/.test(normalizedQuestion)) return null;
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
  return `${best.left} and ${best.right} show the strongest detected relationship, with correlation ${best.value.toFixed(2)} (${strength}).\n\nBusiness interpretation: this suggests the two fields move together in the uploaded data, but it does not prove one causes the other. Use the Analyze page for correlation, regression, filtering, and segment checks before making a decision.`;
}

function answerQuestionList(question: string, analysis: UploadAnalysisResponse) {
  const normalizedQuestion = normalize(question);
  const wantsImportant = /important|business questions|what should|summary|key questions/.test(normalizedQuestion);
  const wantsPriority = /priority|review|urgent|attention|exception/.test(normalizedQuestion);

  if (!wantsImportant && !wantsPriority) return null;

  const questions = analysis.businessQuestions
    .filter((item) => !wantsPriority || /priority|attention|review|reorder|variance|pressure|delay|overstock|settlement/i.test(`${item.question} ${item.recommendation}`))
    .slice(0, 5);

  if (!questions.length) return null;

  return `Here are the most useful questions I found in this workbook:\n\n${questions.map((item, index) => `${index + 1}. ${item.question} ${item.answer}`).join('\n\n')}\n\nBusiness interpretation: start with these because they point to action, risk, opportunity, data quality, or management follow-up.`;
}
function buildAssistantAnswer(question: string, analysis: UploadAnalysisResponse | null) {
  if (!analysis) {
    return 'Upload a workbook first, then I can answer analytical and business questions from your actual data. I can explain columns, business questions, trends, priority records, averages, totals, correlations, and operational/accounting findings.';
  }

  const questionList = answerQuestionList(question, analysis);
  if (questionList) return questionList;

  const businessQuestion = findBusinessQuestion(question, analysis);
  if (businessQuestion) {
    return `${businessQuestion.answer}\n\nWhy this matters: ${businessQuestion.recommendation}\n\nEvidence: ${businessQuestion.evidence.map((item) => `${item.label}: ${item.value}${item.detail ? ` (${item.detail})` : ''}`).join('; ')}\n\nFields used: ${businessQuestion.fields.join(', ')}`;
  }

  return answerGroupedQuestion(question, analysis)
    ?? answerMetricCalculation(question, analysis)
    ?? answerRelationship(question, analysis)
    ?? describeColumn(question, analysis)
    ?? `I can help with that, but I need the question to mention a field, metric, segment, or business issue from this workbook. Try asking things like: "which product has the highest revenue", "explain Unit Price", "what does reorder point mean", "which records need priority review", or "which variables are related?"`;
}

export function DataAssistant({ analysis, enabled, onUploadRequest }: DataAssistantProps) {
  const [open, setOpen] = useState(true);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', text: 'Hi, I am the BizDATA assistant. Ask me analytical or business questions about the uploaded workbook.' },
  ]);

  const quickPrompts = useMemo(() => [
    'What are the most important business questions?',
    'Which records need priority review?',
    'Explain the strongest pattern in this dataset',
    'Which variables appear related?',
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
              <p className="eyebrow">BizDATA Assistant</p>
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
            {quickPrompts.map((prompt) => (
              <button key={prompt} onClick={() => submit(prompt)} type="button">{prompt}</button>
            ))}
          </div>

          <form className="assistant-input" onSubmit={(event) => { event.preventDefault(); submit(); }}>
            <input
              onChange={(event) => setInput(event.target.value)}
              placeholder={analysis ? 'Ask about analytics, business questions, fields, or findings' : 'Upload data first or ask what I can do'}
              value={input}
            />
            <button type="submit">Ask</button>
          </form>

          {!analysis ? <button className="assistant-upload" onClick={onUploadRequest} type="button">Go to upload</button> : null}
        </section>
      ) : (
        <button className="assistant-launcher" onClick={() => setOpen(true)} type="button">Ask BizDATA</button>
      )}
    </div>
  );
}