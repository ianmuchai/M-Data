import type { UploadAnalysisResponse } from '../../shared/analytics';

type AgentMessage = {
  role: 'assistant' | 'user';
  text: string;
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '';

export async function askExternalChatAgent(question: string, analysis: UploadAnalysisResponse | null, messages: AgentMessage[]) {
  const response = await fetch(apiBaseUrl + '/api/chat-agent', {
    body: JSON.stringify({ analysis, messages, question }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string; configured?: boolean } | null;
    const error = new Error(payload?.error ?? `Chat agent failed with ${response.status}`);
    (error as Error & { configured?: boolean }).configured = payload?.configured;
    throw error;
  }

  return response.json() as Promise<{ answer: string; configured: boolean; model: string }>;
}
