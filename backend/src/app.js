import cors from 'cors';
import express from 'express';
import { answerChat } from './chat.js';
import { buildReading, InputError } from './engine.js';
import { summarise } from './summary.js';

export const app = express();
const allowedOrigins = [
  'http://localhost:4200',
  'http://127.0.0.1:4200',
  ...(process.env.FRONTEND_ORIGIN?.trim() ? [process.env.FRONTEND_ORIGIN.trim()] : []),
];

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_request, response) => {
  response.json({ status: 'ok' });
});

app.post('/api/reading', async (request, response) => {
  try {
    const reading = buildReading(request.body);
    const { summary, source } = await summarise(reading.full_name, reading.methods, reading.traits);
    response.json({ ...reading, summary, summary_source: source });
  } catch (error) {
    if (error instanceof InputError) {
      response.status(422).json({ message: error.message, field: error.field });
      return;
    }
    console.error('Unable to build reading:', error);
    response.status(500).json({ message: 'Something went wrong while calculating.', field: null });
  }
});

app.post('/api/chat', async (request, response) => {
  const { message, reading = null, history = [] } = request.body ?? {};
  if (typeof message !== 'string' || !message.trim()) {
    response.status(422).json({ message: 'Please enter a question.', field: 'message' });
    return;
  }
  if ([...message.trim()].length > 800) {
    response.status(422).json({ message: 'That question is a little too long for us.', field: 'message' });
    return;
  }
  if (!Array.isArray(history) || history.some((turn) => (
    !turn
    || typeof turn !== 'object'
    || typeof turn.role !== 'string'
    || typeof turn.content !== 'string'
  ))) {
    response.status(422).json({ message: 'Please check the conversation history.', field: 'history' });
    return;
  }
  if (reading !== null && (
    !reading || typeof reading !== 'object' || Array.isArray(reading)
    || typeof reading.full_name !== 'string'
    || typeof reading.date_of_birth !== 'string'
    || typeof reading.time_of_birth !== 'string'
    || !Array.isArray(reading.methods)
    || !Array.isArray(reading.traits)
    || typeof reading.summary !== 'string'
    || typeof reading.summary_source !== 'string'
    || !Array.isArray(reading.assumptions)
  )) {
    response.status(422).json({ message: 'Please check the reading data.', field: 'reading' });
    return;
  }
  const validReading = reading;
  const { reply, source } = await answerChat({
    message: message.trim(),
    reading: validReading,
    history,
  });
  response.json({ reply, source });
});

app.use((error, _request, response, _next) => {
  if (error instanceof SyntaxError && 'body' in error) {
    response.status(422).json({ message: 'That input could not be read.', field: null });
    return;
  }
  console.error('Unhandled API error:', error);
  response.status(500).json({ message: 'Something went wrong. Please try again.', field: null });
});
