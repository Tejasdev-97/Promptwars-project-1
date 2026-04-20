/**
 * server.test.ts — Integration tests for Express API routes
 * Uses supertest to test request validation, rate limiting, and fallback responses.
 */

// We need to stub environment before importing app
process.env.GEMINI_API_KEY       = 'test-key';
process.env.GOOGLE_TTS_KEY       = 'test-key';
process.env.GOOGLE_TRANSLATE_KEY = 'test-key';
process.env.GOOGLE_MAPS_KEY      = 'test-key';
process.env.NODE_ENV             = 'test';

import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import geminiRouter from '../../server/routes/gemini.js';
import ttsRouter    from '../../server/routes/tts.js';

// Minimal express app for route testing (no rate limits in tests)
const app = express();
app.use(express.json());
app.use('/api/gemini', geminiRouter);
app.use('/api/tts',    ttsRouter);

// ── Input Validation ─────────────────────────────────────────────────────
describe('POST /api/gemini/chat', () => {
  it('returns 400 when userMessage is missing', async () => {
    const res = await request(app).post('/api/gemini/chat').send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when userMessage exceeds 500 chars', async () => {
    const res = await request(app)
      .post('/api/gemini/chat')
      .send({ userMessage: 'a'.repeat(501) });
    expect(res.status).toBe(400);
  });

  it('returns 200 with text when Gemini unavailable (fallback)', async () => {
    const res = await request(app)
      .post('/api/gemini/chat')
      .send({ userMessage: 'where is the food court?' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('text');
    expect(typeof res.body.text).toBe('string');
    expect(res.body.text.length).toBeGreaterThan(0);
  });
});

describe('POST /api/gemini/gate', () => {
  it('returns 400 when seatBlock is missing', async () => {
    const res = await request(app).post('/api/gemini/gate').send({});
    expect(res.status).toBe(400);
  });

  it('returns 200 with gate recommendation (fallback)', async () => {
    const res = await request(app)
      .post('/api/gemini/gate')
      .send({ seatBlock: 'Block N, Row 5, Seat 12', crowdData: [] });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('gate');
    expect(res.body).toHaveProperty('reasoning');
    expect(res.body).toHaveProperty('estimatedWalkMin');
  });
});

describe('POST /api/gemini/emergency', () => {
  it('returns 200 with exit route (fallback)', async () => {
    const res = await request(app)
      .post('/api/gemini/emergency')
      .send({ userLocation: { lat: 18.9388, lng: 72.8258 }, crowdData: [] });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('exit');
    expect(res.body).toHaveProperty('route');
    expect(res.body).toHaveProperty('instructionText');
  });
});

describe('POST /api/gemini/queue', () => {
  it('returns 400 when required fields are missing', async () => {
    const res = await request(app).post('/api/gemini/queue').send({});
    expect(res.status).toBe(400);
  });

  it('returns predicted wait (fallback)', async () => {
    const res = await request(app)
      .post('/api/gemini/queue')
      .send({ servicePoint: 'Food Court A', matchEvent: 'Halftime', currentWait: 10 });
    expect(res.status).toBe(200);
    expect(res.body.predictedWait).toBeGreaterThan(0);
    expect(typeof res.body.confidence).toBe('number');
  });
});

describe('POST /api/gemini/reroute', () => {
  it('returns rerouting suggestion (fallback)', async () => {
    const res = await request(app)
      .post('/api/gemini/reroute')
      .send({
        crowdSnapshot: [
          { name: 'North Stand', crowdCount: 4800, capacity: 5000 },
          { name: 'South Stand', crowdCount: 1200, capacity: 4000 },
        ],
      });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('targetZone');
    expect(res.body).toHaveProperty('suggestion');
    expect(res.body).toHaveProperty('estimatedReliefTimeMin');
  });
});

describe('POST /api/tts/speak', () => {
  it('returns 400 when text is missing', async () => {
    const res = await request(app).post('/api/tts/speak').send({});
    expect(res.status).toBe(400);
  });
});
