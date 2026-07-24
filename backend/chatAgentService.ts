import type { UploadAnalysisResponse } from '../shared/analytics';

type AgentMessage = {
  role: 'assistant' | 'user';
  text: string;
};

export type ChatAgentRequest = {
  question: string;
  messages?: AgentMessage[];
  analysis: UploadAnalysisResponse | null;
};

function compactAnalysis(analysis: UploadAnalysisResponse | null) {
  if (!analysis) return null;

  return {
    fileName: analysis.fileName,
    rows: analysis.rowCount,
    columns: analysis.columnCount,
    qualityScore: analysis.qualityScore,
    metrics: analysis.metrics,
    columnsProfile: analysis.columns.slice(0, 40),
    columnAnalyses: analysis.columnAnalyses.slice(0, 25).map((column) => ({
      name: column.name,
      role: column.role,
      summary: column.summary,
      parameters: column.parameters,
      distribution: column.distribution,
      recommendations: column.recommendations,
    })),
    businessQuestions: analysis.businessQuestions.slice(0, 20),
    analysisOptions: analysis.analysisOptions.slice(0, 12).map((option) => ({
      title: option.title,
      description: option.description,
      metrics: option.metrics,
      fieldStats: option.fieldStats.slice(0, 12),
      segmentBreakdowns: option.segmentBreakdowns.slice(0, 12),
      insights: option.insights,
      recommendations: option.recommendations,
    })),
    advancedAnalytics: {
      methods: analysis.advancedAnalytics.methods,
      results: analysis.advancedAnalytics.results.map((result) => ({
        title: result.title,
        summary: result.summary,
        status: result.status,
        primaryFields: result.primaryFields,
        metrics: result.metrics,
        series: result.series.slice(0, 20),
        rows: result.rows.slice(0, 20),
        recommendations: result.recommendations,
        warnings: result.warnings,
      })),
    },
    signals: analysis.signals,
    marketSignals: analysis.marketSignals,
    recommendations: analysis.recommendations,
    sampleRows: analysis.analysisRows.slice(0, 60),
  };
}

function systemPrompt() {
  return `You are BizDATA Agent, a senior business data analyst embedded inside a web analytics platform.
Answer questions about the uploaded workbook using only the provided analysis context.
Be helpful even when the user is vague. Infer intent and choose the right analytical route.
Always structure answers with: Finding, Evidence, Business meaning, Recommended next action.
If the user asks for a calculation, show the value and explain what it means.
If the user asks for a presentation, provide slide-ready bullets.
If data is missing or confidence is limited, say so clearly and suggest what to check.
Avoid generic BI language. Tie the answer to the actual fields, rows, business questions, methods, risks, and recommendations available in the context.`;
}

export async function answerWithExternalAgent(payload: ChatAgentRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { configured: false, answer: '' };
  }

  const model = process.env.OPENAI_CHAT_MODEL || 'gpt-4.1-mini';
  const body = {
    model,
    input: [
      { role: 'system', content: systemPrompt() },
      {
        role: 'user',
        content: JSON.stringify({
          question: payload.question,
          recentMessages: (payload.messages ?? []).slice(-8),
          workbookContext: compactAnalysis(payload.analysis),
        }),
      },
    ],
    temperature: 0.2,
    max_output_tokens: 1400,
  };

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`OpenAI agent request failed with ${response.status}${text ? `: ${text.slice(0, 240)}` : ''}`);
  }

  const data = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ text?: string; type?: string }> }> };
  const answer = data.output_text
    ?? data.output?.flatMap((item) => item.content ?? []).map((item) => item.text ?? '').filter(Boolean).join('\n')
    ?? '';

  return { configured: true, answer: answer.trim() || 'I reviewed the workbook context, but I could not produce a useful answer. Try asking the question another way.' };
}
