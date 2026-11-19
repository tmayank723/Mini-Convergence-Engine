import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { app } from '../src/app.js';
import { answerChat } from '../src/chat.js';
import { OPENROUTER_URL } from '../src/summary.js';

let server;
let baseUrl;
let originalApiKey;

before(async () => {
  originalApiKey = process.env.OPENROUTER_API_KEY;
  delete process.env.OPENROUTER_API_KEY;
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  if (originalApiKey === undefined) delete process.env.OPENROUTER_API_KEY;
  else process.env.OPENROUTER_API_KEY = originalApiKey;
});

async function post(path, body) {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const valid = {
  full_name: 'Ayush Mishra',
  date_of_birth: '1995-08-15',
  time_of_birth: '10:30',
};

test('health endpoint returns the liveness response', async () => {
  const response = await fetch(`${baseUrl}/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok' });
});

test('reading endpoint preserves all five known results and response shape', async () => {
  const response = await post('/api/reading', valid);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body.methods.map(({ id }) => id), [
    'sun_sign', 'chinese_zodiac', 'life_path', 'name_number', 'vara',
  ]);
  assert.deepEqual(body.methods.map(({ result }) => result), [
    'Leo', 'Pig', '2', '5', 'Mangalavara (Mars)',
  ]);
  assert.equal(body.time_of_birth, '10:30:00');
  assert.equal(body.traits.length, 6);
  assert.equal(body.summary_source, 'template');
  assert.ok(body.summary.includes('Ayush Mishra'));
  assert.ok(body.assumptions.some((note) => note.includes('IST')));
  for (const method of body.methods) {
    assert.equal(Object.keys(method.scores).length, 6);
    for (const score of Object.values(method.scores)) assert.ok(score >= 0 && score <= 10);
  }
});

test('convergence rows match the method scores and threshold', async () => {
  const body = await (await post('/api/reading', valid)).json();
  const scoresByMethod = Object.fromEntries(body.methods.map(({ id, scores }) => [id, scores]));
  for (const row of body.traits) {
    assert.deepEqual(Object.keys(row.scores).sort(), Object.keys(scoresByMethod).sort());
    assert.deepEqual(row.agreeing, Object.keys(row.scores).filter((id) => row.scores[id] >= 7).sort());
    assert.equal(row.n, row.agreeing.length);
    assert.equal(row.confidence, 1 - 1 / (2 ** row.n));
    for (const [id, score] of Object.entries(row.scores)) assert.equal(score, scoresByMethod[id][row.trait]);
  }
});

test('birth before 06:00 uses the previous vara and reports the assumption', async () => {
  const body = await (await post('/api/reading', { ...valid, time_of_birth: '02:00' })).json();
  assert.equal(body.methods[4].result, 'Somavara (Moon)');
  assert.ok(body.assumptions.some((note) => note.includes('sunrise')));
});

test('06:00 starts the new Vedic day and leap days are accepted', async () => {
  const sunrise = await (await post('/api/reading', { ...valid, time_of_birth: '06:00' })).json();
  assert.equal(sunrise.methods[4].result, 'Mangalavara (Mars)');
  const leapDay = await post('/api/reading', { ...valid, date_of_birth: '2000-02-29' });
  assert.equal(leapDay.status, 200);
});

test('birth before Chinese New Year uses the previous animal year', async () => {
  const body = await (await post('/api/reading', { ...valid, date_of_birth: '2000-01-01' })).json();
  assert.equal(body.methods[1].result, 'Rabbit');
  assert.ok(body.assumptions.some((note) => note.includes('Chinese New Year')));
  const newYear = await (await post('/api/reading', { ...valid, date_of_birth: '2000-02-05' })).json();
  assert.equal(newYear.methods[1].result, 'Dragon');
});

test('birth near a sign boundary is calculated from solar longitude and called out', async () => {
  const body = await (await post('/api/reading', {
    ...valid,
    date_of_birth: '2024-03-20',
    time_of_birth: '08:40',
  })).json();
  assert.equal(body.methods[0].result, 'Aries');
  assert.ok(body.assumptions.some((note) => note.includes('sign boundary')));
});

test('master number and accented name are preserved', async () => {
  const response = await post('/api/reading', {
    ...valid,
    full_name: 'José Álvarez',
    date_of_birth: '1950-01-04',
  });
  const body = await response.json();
  assert.equal(body.methods[2].result, '11');
  assert.equal(response.status, 200);
});

test('invalid input returns a readable field-specific 422 response', async () => {
  const response = await post('/api/reading', { ...valid, full_name: '   ' });
  assert.equal(response.status, 422);
  assert.deepEqual(await response.json(), { message: 'Please enter a name.', field: 'full_name' });
});

test('rejects an impossible date and a future date', async () => {
  const malformed = await post('/api/reading', { ...valid, date_of_birth: '2001-02-29' });
  assert.equal(malformed.status, 422);
  const future = await post('/api/reading', { ...valid, date_of_birth: '2200-01-01' });
  assert.match((await future.json()).message, /future/);
  const unsupported = await post('/api/reading', { ...valid, date_of_birth: '1850-01-01' });
  assert.equal(unsupported.status, 422);
  assert.match((await unsupported.json()).message, /1902/);
});

test('future-date validation uses the assumed IST calendar day', async () => {
  mock.timers.enable({ apis: ['Date'], now: new Date('2025-04-04T20:00:00.000Z') });
  try {
    const response = await post('/api/reading', { ...valid, date_of_birth: '2025-04-05' });
    assert.equal(response.status, 200);
  } finally {
    mock.timers.reset();
  }
});

test('chat endpoint is available without a key and rejects empty messages', async () => {
  const missing = await post('/api/chat', { message: '   ' });
  assert.equal(missing.status, 422);
  const available = await post('/api/chat', { message: 'What does this app do?', history: [] });
  assert.equal(available.status, 200);
  const body = await available.json();
  assert.equal(body.source, 'unavailable');
  assert.match(body.reply, /backend\/\.env/);
  assert.doesNotMatch(body.reply, /missing or the model call failed/i);
});

test('chat reports OpenRouter authentication failures without hiding the cause', async () => {
  process.env.OPENROUTER_API_KEY = 'test-key';
  const fetchMock = mock.method(globalThis, 'fetch', async () => new Response('{}', { status: 401 }));
  try {
    const result = await answerChat({ message: 'Hello', reading: null, history: [] });
    assert.equal(result.source, 'unavailable');
    assert.match(result.reply, /rejected the API key/);
  } finally {
    fetchMock.mock.restore();
    delete process.env.OPENROUTER_API_KEY;
  }
});

test('chat sends a configured key and returns a successful OpenRouter reply', async () => {
  process.env.OPENROUTER_API_KEY = 'test-key';
  const fetchMock = mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, OPENROUTER_URL);
    assert.equal(options.headers.Authorization, 'Bearer test-key');
    return new Response(JSON.stringify({ choices: [{ message: { content: 'A helpful reply.' } }] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  try {
    const result = await answerChat({ message: 'Hello', reading: null, history: [] });
    assert.deepEqual(result, { reply: 'A helpful reply.', source: 'model' });
  } finally {
    fetchMock.mock.restore();
    delete process.env.OPENROUTER_API_KEY;
  }
});

test('chat extracts text from OpenRouter multipart content', async () => {
  process.env.OPENROUTER_API_KEY = 'test-key';
  const fetchMock = mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({
    choices: [{
      message: {
        content: [
          { type: 'text', text: 'The systems ' },
          { type: 'image', image_url: { url: 'https://example.invalid/image' } },
          { type: 'text', text: 'differ because they use different traditions.' },
        ],
      },
    }],
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  }));
  try {
    const result = await answerChat({ message: 'Why?', reading: null, history: [] });
    assert.deepEqual(result, {
      reply: 'The systems differ because they use different traditions.',
      source: 'model',
    });
  } finally {
    fetchMock.mock.restore();
    delete process.env.OPENROUTER_API_KEY;
  }
});

test('chat explains when the model used its response limit without returning text', async () => {
  process.env.OPENROUTER_API_KEY = 'test-key';
  const fetchMock = mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({
    choices: [{ message: { content: null }, finish_reason: 'length' }],
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  }));
  try {
    const result = await answerChat({ message: 'Why?', reading: null, history: [] });
    assert.equal(result.source, 'unavailable');
    assert.match(result.reply, /ran out of response space/);
  } finally {
    fetchMock.mock.restore();
    delete process.env.OPENROUTER_API_KEY;
  }
});
