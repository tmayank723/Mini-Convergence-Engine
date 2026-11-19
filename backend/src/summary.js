export const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
export const DEFAULT_MODEL = 'anthropic/claude-sonnet-5.5';
const TIMEOUT_MS = 12_000;

export function openRouterFailureMessage(status) {
  if (status === 401) {
    return 'OpenRouter rejected the API key. Check that OPENROUTER_API_KEY is an active key, then restart the backend.';
  }
  if (status === 402) {
    return 'OpenRouter could not process this request because the account may need credits or billing attention.';
  }
  if (status === 403 || status === 404) {
    return 'OpenRouter could not access the configured model. Check OPENROUTER_MODEL and your account’s model access.';
  }
  if (status === 429) {
    return 'OpenRouter is rate-limiting requests. Wait a little and try again.';
  }
  if (typeof status === 'number' && status >= 500) {
    return 'OpenRouter is having a temporary service problem. Try again shortly.';
  }
  return 'The backend could not reach OpenRouter. Check the backend connection and try again.';
}

export function extractAssistantText(data) {
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content.trim() || null;
  if (!Array.isArray(content)) return null;
  const text = content
    .map((part) => {
      if (typeof part === 'string') return part;
      return part?.type === 'text' && typeof part.text === 'string' ? part.text : '';
    })
    .filter(Boolean)
    .join('')
    .trim();
  return text || null;
}

function strongest(traits) {
  return [...traits].sort((a, b) => b.n - a.n || (a.trait < b.trait ? -1 : a.trait > b.trait ? 1 : 0));
}

function buildPrompt(fullName, methods, traits) {
  const methodLines = methods.map((method) => `- ${method.label}: ${method.result}`);
  const traitLines = traits.map((row) => (
    `- ${row.trait}: ${row.n} of 5 methods agree it is strong, confidence ${(row.confidence * 100).toFixed(1)}%`
  ));
  return `Write a short, natural-language note for a general audience.

The name on this reading is ${fullName}. Five traditions returned:
${methodLines.join('\n')}

Each result was also scored from 0 to 10 on six traits. Scores of 7 or above count toward the displayed agreement totals:
${traitLines.join('\n')}

In 3 or 4 sentences and under 90 words, point out one area of overlap and one area of contrast. Do not list every result or make up numbers. Do not use a heading, bullet list, quotation marks, or address the person as 'you'. Make clear this is a comparison of symbolic traditions, not a factual personality assessment or prediction. Keep the tone warm, clear, and specific to the figures above.`;
}

export function templateSummary(fullName, methods, traits) {
  const ranked = strongest(traits);
  const strongestTrait = ranked[0];
  const weakest = ranked[ranked.length - 1];
  const results = methods.map((method) => `${method.label}: ${method.result}`).join('; ');
  const agreed = traits.filter((row) => row.n >= 3);
  const agreement = agreed.length
    ? `The clearest overlap is ${strongestTrait.trait.toLowerCase()}: ${strongestTrait.n} of five methods score it at 7 or higher (${(strongestTrait.confidence * 100).toFixed(1)}% on the requested formula).`
    : `There is no majority on any trait. ${strongestTrait.trait} has the most overlap, with ${strongestTrait.n} of five methods at 7 or higher.`;
  return `${fullName}'s results are ${results}. ${agreement} The widest split is on ${weakest.trait.toLowerCase()}, with ${weakest.n} methods at the threshold. This compares how the traditions are mapped; it is not a forecast or a verdict about a person.`;
}

async function requestModel(messages, maxTokens) {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) return null;
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL?.trim() || DEFAULT_MODEL,
      max_tokens: maxTokens,
      messages,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) {
    const error = new Error('OpenRouter summary request failed');
    error.status = response.status;
    throw error;
  }
  const data = await response.json();
  return extractAssistantText(data);
}

export async function summarise(fullName, methods, traits) {
  const fallback = () => ({ summary: templateSummary(fullName, methods, traits), source: 'template' });
  if (!process.env.OPENROUTER_API_KEY?.trim()) return fallback();
  try {
    const text = await requestModel([{ role: 'user', content: buildPrompt(fullName, methods, traits) }], 320);
    return text ? { summary: text, source: 'model' } : fallback();
  } catch (error) {
    console.error('OpenRouter summary request failed', {
      status: Number.isInteger(error?.status) ? error.status : null,
      errorName: typeof error?.name === 'string' ? error.name : 'Error',
    });
    return fallback();
  }
}
