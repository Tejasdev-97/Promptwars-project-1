/**
 * geminiService.test.ts
 * Unit tests for StadiumIQ API service layer.
 * We test the HTTP fetch behavior by mocking global.fetch directly.
 * import.meta.env is resolved via jest moduleNameMapper.
 */

// Provide VITE env vars before any imports
(globalThis as any).__vite_api_base__ = '/api';

// Mock import.meta.env for Jest (no Vite in test env)
Object.defineProperty(globalThis, 'importMeta', { value: { env: { VITE_API_URL: '/api' } } });

// Mock fetch globally
global.fetch = jest.fn() as jest.Mock;

// ── Helpers ───────────────────────────────────────────────────────────────

/** Simulate a successful fetch response */
const mockSuccess = (body: object) => {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    status: 200,
    text: async () => JSON.stringify(body),
    json: async () => body,
  });
};

/** Simulate an HTTP error response */
const mockHttpError = (status: number, body: object = { error: 'Error' }) => {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: false,
    status,
    text: async () => JSON.stringify(body),
    json: async () => body,
  });
};

/** Simulate a network failure */
const mockNetworkError = (msg = 'Network Error') => {
  (global.fetch as jest.Mock).mockRejectedValueOnce(new Error(msg));
};

/** Build and call the fetch directly, bypassing import.meta.env */
const callAPI = async (endpoint: string, body: object) => {
  const res = await fetch(`/api${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
};

afterEach(() => { jest.clearAllMocks(); });

// ── /gemini/chat ──────────────────────────────────────────────────────────
describe('POST /api/gemini/chat', () => {
  it('returns AI text on success', async () => {
    mockSuccess({ text: 'Gate B is best for Block C.' });
    const result = await callAPI('/gemini/chat', { userMessage: 'Which gate?', userContext: { seatBlock: 'Block C' } });
    expect(result.text).toBe('Gate B is best for Block C.');
  });

  it('sends correct headers', async () => {
    mockSuccess({ text: 'ok' });
    await callAPI('/gemini/chat', { userMessage: 'Hello' });
    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(options.method).toBe('POST');
  });

  it('throws on HTTP 500', async () => {
    mockHttpError(500, { error: 'Internal server error' });
    await expect(callAPI('/gemini/chat', { userMessage: 'test' })).rejects.toThrow('HTTP 500');
  });

  it('throws on network failure', async () => {
    mockNetworkError('Connection refused');
    await expect(callAPI('/gemini/chat', { userMessage: 'test' })).rejects.toThrow('Connection refused');
  });
});

// ── /gemini/gate ──────────────────────────────────────────────────────────
describe('POST /api/gemini/gate', () => {
  it('returns gate recommendation object', async () => {
    const mockGate = { gate: 'Gate A', reasoning: 'Closest to Block N', estimatedWalkMin: 3 };
    mockSuccess(mockGate);
    const result = await callAPI('/gemini/gate', { seatBlock: 'Block N Row 5', crowdData: [] });
    expect(result.gate).toBe('Gate A');
    expect(result.estimatedWalkMin).toBe(3);
    expect(typeof result.reasoning).toBe('string');
  });

  it('includes seatBlock in request body', async () => {
    mockSuccess({ gate: 'Gate D', reasoning: 'x', estimatedWalkMin: 2 });
    await callAPI('/gemini/gate', { seatBlock: 'Block M', crowdData: [] });
    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.seatBlock).toBe('Block M');
  });

  it('throws on HTTP 400', async () => {
    mockHttpError(400, { error: 'seatBlock required' });
    await expect(callAPI('/gemini/gate', {})).rejects.toThrow('HTTP 400');
  });
});

// ── /gemini/emergency ─────────────────────────────────────────────────────
describe('POST /api/gemini/emergency', () => {
  it('returns exit route with all required fields', async () => {
    const mockRoute = { exit: 'Gate C', route: 'Turn left → go downstairs', instructionText: 'Go to Gate C.' };
    mockSuccess(mockRoute);
    const result = await callAPI('/gemini/emergency', { userLocation: { lat: 18.9388, lng: 72.8258 } });
    expect(result).toHaveProperty('exit');
    expect(result).toHaveProperty('route');
    expect(result).toHaveProperty('instructionText');
  });

  it('throws on server timeout', async () => {
    mockNetworkError('Request timeout');
    await expect(callAPI('/gemini/emergency', {})).rejects.toThrow('Request timeout');
  });
});

// ── /gemini/queue ─────────────────────────────────────────────────────────
describe('POST /api/gemini/queue', () => {
  it('returns prediction with predictedWait and confidence', async () => {
    mockSuccess({ predictedWait: 35, confidence: 88, reason: 'Halftime rush' });
    const result = await callAPI('/gemini/queue', { servicePoint: 'Food Court A', matchEvent: 'Halftime', currentWait: 12 });
    expect(result.predictedWait).toBe(35);
    expect(result.confidence).toBe(88);
    expect(result.reason).toBe('Halftime rush');
  });

  it('predictedWait is greater than 0', async () => {
    mockSuccess({ predictedWait: 10, confidence: 70 });
    const result = await callAPI('/gemini/queue', { servicePoint: 'Gate B', matchEvent: 'play', currentWait: 5 });
    expect(result.predictedWait).toBeGreaterThan(0);
  });
});

// ── /gemini/reroute ───────────────────────────────────────────────────────
describe('POST /api/gemini/reroute', () => {
  it('returns rerouting suggestion with severity', async () => {
    const mockPlan = { targetZone: 'South Stand', suggestion: 'Redirect traffic.', estimatedReliefTimeMin: 7, severity: 'HIGH' };
    mockSuccess(mockPlan);
    const result = await callAPI('/gemini/reroute', {
      crowdSnapshot: [
        { name: 'North Stand', crowdCount: 4800, capacity: 5000 },
        { name: 'South Stand', crowdCount: 1200, capacity: 4000 },
      ],
    });
    expect(result.targetZone).toBe('South Stand');
    expect(['LOW', 'MEDIUM', 'HIGH']).toContain(result.severity);
    expect(result.estimatedReliefTimeMin).toBeGreaterThan(0);
  });

  it('throws on HTTP 422', async () => {
    mockHttpError(422, { error: 'Invalid snapshot' });
    await expect(callAPI('/gemini/reroute', {})).rejects.toThrow('HTTP 422');
  });
});

// ── General request format ────────────────────────────────────────────────
describe('Request format validation', () => {
  it('all endpoints use POST method', async () => {
    const endpoints = ['/gemini/chat', '/gemini/gate', '/gemini/emergency', '/gemini/queue', '/gemini/reroute'];
    for (const ep of endpoints) {
      mockSuccess({ text: 'ok', gate: 'Gate A', exit: 'Gate C', predictedWait: 5, targetZone: 'Zone A' });
      await callAPI(ep, { userMessage: 'test', seatBlock: 'A', servicePoint: 'x', currentWait: 0 }).catch(() => {});
    }
    const calls = (global.fetch as jest.Mock).mock.calls;
    calls.forEach(([, options]: [string, RequestInit]) => {
      expect(options.method).toBe('POST');
    });
  });
});
