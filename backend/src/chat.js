import {
  DEFAULT_MODEL,
  extractAssistantText,
  openRouterFailureMessage,
  OPENROUTER_URL,
} from './summary.js';

const MAX_HISTORY_TURNS = 6;
const MAX_TOKENS = 800;
const TIMEOUT_MS = 12_000;

const missingKeyReply = 'The backend has not loaded OPENROUTER_API_KEY. For local use, add it to backend/.env (not .env.example) and restart the backend. On Render, set it in the service environment and redeploy.';

function buildSystemPrompt(reading) {
  if (reading) {
    return `You are the reading companion for Mini Convergence Engine. A five-tradition calculation has already been completed. The data below is the only source for scores, results, agreement counts, and confidence figures: do not alter or invent them.

Reply conversationally in plain language, usually in 2-4 short paragraphs. If a detail is missing, say so. Explain what the traditions assign; do not present symbolic readings as facts about the person's character or as predictions. Avoid stock horoscopes, dramatic promises, quotation marks, and invented details.

Current results (JSON):
${JSON.stringify(reading, null, 2)}`;
  }
  return `You are the reading companion for the Mini Convergence Engine.

No personal calculation is attached to this conversation. Do not guess anyone's sign, animal, number, vara, score, agreement count, or confidence.

General questions are welcome: explain the five traditions, the six traits, the score threshold of 7, the displayed formula (1 - 1/2^N), or how to use the form.

If a question depends on a person's results, briefly explain that a calculation has not been run yet and invite them to enter a name, birth date, and time first.

When a question mixes general and personal topics, answer the general part and clarify what additional input is needed for the personal part. Keep replies original, calm, and non-predictive.`;
}

export async function answerChat({ message, reading, history }) {
  if (!process.env.OPENROUTER_API_KEY?.trim()) {
    return { reply: missingKeyReply, source: 'unavailable' };
  }
  const messages = [{ role: 'system', content: buildSystemPrompt(reading) }];
  for (const turn of history.slice(-MAX_HISTORY_TURNS * 2)) {
    const role = turn?.role;
    const content = typeof turn?.content === 'string' ? turn.content.trim() : '';
    if ((role === 'user' || role === 'assistant') && content) messages.push({ role, content });
  }
  messages.push({ role: 'user', content: message });

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL?.trim() || DEFAULT_MODEL,
        max_tokens: MAX_TOKENS,
        messages,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      const error = new Error('OpenRouter chat request failed');
      error.status = response.status;
      throw error;
    }
    const data = await response.json();
    const reply = extractAssistantText(data);
    if (reply) return { reply, source: 'model' };
    const choice = data?.choices?.[0];
    const finishReason = typeof choice?.finish_reason === 'string' ? choice.finish_reason : null;
    const refusal = typeof choice?.message?.refusal === 'string' ? choice.message.refusal.trim() : '';
    console.error('OpenRouter chat response contained no text', {
      finishReason,
      hasRefusal: Boolean(refusal),
      contentType: Array.isArray(choice?.message?.content)
        ? 'array'
        : typeof choice?.message?.content,
    });
    return {
      reply: refusal || (finishReason === 'length'
        ? 'The model ran out of response space before sending an answer. Try asking a shorter question.'
        : 'OpenRouter returned no readable text. Check the configured model and try again.'),
      source: 'unavailable',
    };
  } catch (error) {
    console.error('OpenRouter chat request failed', {
      status: Number.isInteger(error?.status) ? error.status : null,
      errorName: typeof error?.name === 'string' ? error.name : 'Error',
    });
    const reply = error?.name === 'TimeoutError'
      ? 'The OpenRouter request timed out. Try again shortly or check the backend connection.'
      : openRouterFailureMessage(error?.status);
    return { reply, source: 'unavailable' };
  }
}
