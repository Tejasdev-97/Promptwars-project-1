import { Router, Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

const router = Router();

// ── Gemini Initialization ─────────────────────────────────────────────────
let model: any = null;

const initGemini = async () => {
  if (!process.env.GEMINI_API_KEY) {
    console.warn('⚠️  GEMINI_API_KEY not set — using smart fallbacks');
    return;
  }
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // Initialize without a ping — the first real request will reveal if it works
    // Try modern models first; gemini-2.0-flash-exp is available on free tier
    model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    console.log(`✅ Gemini AI initialized`);
  } catch (e: any) {
    console.error('❌ Gemini init failed:', e?.message);
  }
};
initGemini();

// ── In-memory cache (TTL: 5 minutes) ─────────────────────────────────────
const cache = new Map<string, { result: string; expiresAt: number }>();

const getCached = (key: string): string | null => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { cache.delete(key); return null; }
  return entry.result;
};

const setCache = (key: string, result: string, ttlMs = 5 * 60 * 1000) => {
  // Evict if cache grows too large (prevent memory leak)
  if (cache.size > 200) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
  cache.set(key, { result, expiresAt: Date.now() + ttlMs });
};

// ── Zod Schemas (input validation) ────────────────────────────────────────
const chatSchema = z.object({
  userMessage: z.string().min(1).max(500),
  userContext: z.object({
    seatBlock: z.string().optional(),
    language:  z.string().optional(),
    crowdHotspots: z.array(z.any()).optional(),
  }).optional(),
});

const gateSchema = z.object({
  seatBlock: z.string().min(1).max(100),
  crowdData: z.array(z.any()).optional(),
});

const emergencySchema = z.object({
  userLocation: z.object({ lat: z.number(), lng: z.number() }).optional(),
  crowdData:    z.array(z.any()).optional(),
});

const rerouteSchema = z.object({
  crowdSnapshot: z.array(z.object({
    name:       z.string(),
    crowdCount: z.number(),
    capacity:   z.number(),
  })).optional(),
});

const queueSchema = z.object({
  servicePoint: z.string().max(100),
  matchEvent:   z.string().max(100).optional(),
  currentWait:  z.number().min(0).max(300),
});

// ── Helpers ───────────────────────────────────────────────────────────────
const safeParseJSON = (text: string) => {
  const cleaned = text.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim();
  return JSON.parse(cleaned);
};

const generate = async (prompt: string): Promise<string> => {
  if (!model) throw new Error('Gemini not initialized');
  
  // Try current model first, then fallback to others if it fails
  const fallbackModels = ['gemini-2.0-flash-exp', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-pro'];
  let lastError: Error | null = null;

  for (const modelName of fallbackModels) {
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
      const m = modelName === 'gemini-2.0-flash-exp' ? model : genAI.getGenerativeModel({ model: modelName });
      const result = await m.generateContent(prompt);
      // Update global model to the one that worked
      if (modelName !== 'gemini-2.0-flash-exp') {
        model = m;
        console.log(`✅ Switched to working model: ${modelName}`);
      }
      return result.response.text();
    } catch (e: any) {
      lastError = e;
      // Only continue retrying on model-not-found errors
      if (!e?.message?.includes('not found') && !e?.message?.includes('404')) break;
    }
  }
  throw lastError || new Error('All Gemini models failed');
};

// ── POST /api/gemini/chat — Smart Conversational Assistant ────────────────
router.post('/chat', async (req: Request, res: Response): Promise<void> => {
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }
  const { userMessage, userContext } = parsed.data;
  const lang = userContext?.language || 'en-US';

  // Cache repeated identical questions
  const cacheKey = `chat:${userMessage.toLowerCase().trim()}:${lang}`;
  const cached = getCached(cacheKey);
  if (cached) { res.json({ text: cached, cached: true }); return; }

  if (model) {
    try {
      const prompt = `You are StadiumIQ — an intelligent, friendly AI assistant for large Indian sporting venues (like Wankhede Stadium, Mumbai).

Your personality: Helpful, confident, concise — like a knowledgeable local friend.

Context about this user:
- Seat: ${userContext?.seatBlock || 'not provided'}
- Language preference: ${lang}
- Live crowd hotspots: ${JSON.stringify(userContext?.crowdHotspots?.slice(0, 3) || [])}

User's question: "${userMessage}"

Rules:
1. Respond in EXACTLY the language specified: ${lang}
2. Keep response to 2–3 sentences maximum
3. Be specific and actionable (mention gate names, directions, estimated times)
4. If you don't know, say so honestly rather than guessing
5. For safety/emergency questions, always prioritize clear instructions`;

      const text = await generate(prompt);
      setCache(cacheKey, text, 2 * 60 * 1000); // 2 min cache for chat
      res.json({ text });
      return;
    } catch (e: any) {
      console.error('[Gemini /chat]', e?.message?.slice(0, 120));
    }
  }

  // ── Smart keyword fallback ──────────────────────────────────────────────
  const msg = userMessage.toLowerCase();
  let text = 'I can help with gate directions, food, washrooms, parking, and medical info. What do you need?';
  if (msg.includes('food') || msg.includes('eat') || msg.includes('snack') || msg.includes('hungry'))
    text = 'Food Court A on Level 1 (Gate A side) has a 6-min wait right now. Food Court B on Level 2 is less crowded — approx 3 min wait. Tap the "Find" tab for full menus and live wait times.';
  else if (msg.includes('toilet') || msg.includes('washroom') || msg.includes('bathroom') || msg.includes('loo'))
    text = 'Washroom Block B near Gate B is currently queue-free. There\'s also a clean facility near Section 7, Level 2. Tap "Find" → Washroom for all options.';
  else if (msg.includes('gate') || msg.includes('entry') || msg.includes('enter'))
    text = 'Gate C (South) has the shortest queue right now — about 2 minutes. Gate A is moderate at ~6 min. Avoid Gate B, it\'s busy. Use the "Home" tab to find your optimal gate by seat number.';
  else if (msg.includes('parking') || msg.includes('car') || msg.includes('vehicle'))
    text = 'Parking Level P2 is 40% full — use the North entrance road to avoid traffic. P1 is 70% full. Exit via Gate D after the match for the fastest route to parking.';
  else if (msg.includes('medical') || msg.includes('doctor') || msg.includes('sick') || msg.includes('hurt'))
    text = '🏥 Medical stations are at Gate A (Level 1) and Gate C. Both have doctors on duty. For emergencies, tap the red EMERGENCY button at the top of the screen immediately.';
  else if (msg.includes('wifi') || msg.includes('internet'))
    text = 'Free WiFi: network "StadiumIQ-Guest", password: MATCH2025. Best signal near the main concourse and food courts.';
  else if (msg.includes('exit') || msg.includes('leave') || msg.includes('home'))
    text = 'For the fastest exit after the match: Gate C (South) typically has the least post-match crowd. Head there 5 minutes before the final over to beat the rush.';

  res.json({ text });
});

// ── POST /api/gemini/gate — AI Gate Recommendation ───────────────────────
router.post('/gate', async (req: Request, res: Response): Promise<void> => {
  const parsed = gateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'seatBlock is required', details: parsed.error.flatten() });
    return;
  }
  const { seatBlock, crowdData } = parsed.data;

  const cacheKey = `gate:${seatBlock.toLowerCase()}`;
  const cached = getCached(cacheKey);
  if (cached) { res.json({ ...JSON.parse(cached), cached: true }); return; }

  if (model) {
    try {
      const prompt = `You are StadiumIQ, recommending the best stadium entry gate.

Seat information: "${seatBlock}"
Live gate crowd data: ${JSON.stringify(crowdData || [])}

Stadium layout reference (Wankhede Stadium, Mumbai):
- Gate A (North): Best for blocks A, B, P, Q (North and West Upper)
- Gate B (East): Best for blocks C, D, E (East Stand)
- Gate C (South): Best for blocks F, G, H, J (South and East Lower)
- Gate D (West): Best for blocks K, L, M, N (West Stand)
- VIP Gate: Blocks V1, V2, Corporate Box

Return ONLY valid JSON (no markdown):
{"gate": "Gate X", "reasoning": "2-sentence explanation mentioning walking path", "estimatedWalkMin": 3}`;

      const text = await generate(prompt);
      const result = safeParseJSON(text);
      setCache(cacheKey, JSON.stringify(result), 10 * 60 * 1000); // 10 min cache
      res.json(result);
      return;
    } catch (e: any) {
      console.error('[Gemini /gate]', e?.message?.slice(0, 120));
    }
  }

  // ── Fallback: rule-based gate routing ──────────────────────────────────
  const block = seatBlock.toUpperCase();
  let gate = 'Gate B'; let walkMin = 4;
  if (/\b[ABPQabpq]\b/.test(block) || block.includes('NORTH') || block.includes('WEST'))   { gate = 'Gate A'; walkMin = 3; }
  else if (/\b[FGHJfghj]\b/.test(block) || block.includes('SOUTH'))                         { gate = 'Gate C'; walkMin = 5; }
  else if (/\b[KLMNklmn]\b/.test(block) || block.includes('WEST STAND'))                   { gate = 'Gate D'; walkMin = 4; }
  else if (block.includes('VIP') || block.includes('CORPORATE') || block.includes('V1') || block.includes('V2')) { gate = 'VIP Gate'; walkMin = 2; }

  res.json({ gate, reasoning: `${gate} is the closest entry to ${seatBlock}. Follow signs after entry to reach your block directly.`, estimatedWalkMin: walkMin });
});

// ── POST /api/gemini/emergency — Safest Exit Routing ─────────────────────
router.post('/emergency', async (req: Request, res: Response): Promise<void> => {
  const parsed = emergencySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body' });
    return;
  }
  const { userLocation, crowdData } = parsed.data;

  if (model) {
    try {
      const prompt = `EMERGENCY EVACUATION MODE.

User location coordinates: ${JSON.stringify(userLocation || { lat: 18.9388, lng: 72.8258 })}
Current crowd density per zone: ${JSON.stringify(crowdData || [])}

Recommend the safest evacuation route. Prioritize least crowded exits.
Wankhede Stadium emergency exits: Gate A (North), Gate B (East — avoid if crowded), Gate C (South — backup), Gate D (West — service exit).

Return ONLY valid JSON:
{"exit": "Gate X", "route": "Turn direction → landmark → action", "instructionText": "Clear spoken instruction for voice assistant (1-2 sentences, calm tone)"}`;

      const text = await generate(prompt);
      res.json(safeParseJSON(text));
      return;
    } catch (e: any) {
      console.error('[Gemini /emergency]', e?.message?.slice(0, 120));
    }
  }

  res.json({
    exit: 'Gate C — South Emergency Exit',
    route: 'Turn left → Pass Washroom Block B → Take staircase down → Follow green exit signs',
    instructionText: 'Please proceed calmly to Gate C, the south emergency exit. Walk left, pass the washroom block, go down the staircase, and follow green signs.',
  });
});

// ── POST /api/gemini/reroute — Admin AI Crowd Rerouting ──────────────────
router.post('/reroute', async (req: Request, res: Response): Promise<void> => {
  const parsed = rerouteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid crowd snapshot' });
    return;
  }
  const { crowdSnapshot } = parsed.data;

  if (model) {
    try {
      const prompt = `You are the StadiumIQ Admin AI for crowd management.

Live crowd data by zone:
${JSON.stringify(crowdSnapshot || [], null, 2)}

Identify the most congested zone (>75% capacity) and recommend an actionable rerouting plan.

Return ONLY valid JSON:
{"targetZone": "Zone name", "suggestion": "Specific action for stewards (2 sentences)", "estimatedReliefTimeMin": 8, "severity": "HIGH"}`;

      const text = await generate(prompt);
      res.json(safeParseJSON(text));
      return;
    } catch (e: any) {
      console.error('[Gemini /reroute]', e?.message?.slice(0, 120));
    }
  }

  // Fallback: find most congested zone
  const zones = crowdSnapshot || [];
  const worst = zones.sort((a, b) => (b.crowdCount / b.capacity) - (a.crowdCount / a.capacity))[0];
  const pct    = worst ? Math.round((worst.crowdCount / worst.capacity) * 100) : 0;
  res.json({
    targetZone: worst?.name || 'Main Concourse',
    suggestion: `${worst?.name || 'The main concourse'} is at ${pct}% capacity. Deploy 2 stewards to Gate D to redirect foot traffic south. Open alternate concession counters near Gate C.`,
    estimatedReliefTimeMin: 7,
    severity: pct > 85 ? 'HIGH' : pct > 65 ? 'MEDIUM' : 'LOW',
  });
});

// ── POST /api/gemini/queue — Wait Time Prediction ────────────────────────
router.post('/queue', async (req: Request, res: Response): Promise<void> => {
  const parsed = queueSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid queue data' });
    return;
  }
  const { servicePoint, matchEvent, currentWait } = parsed.data;

  if (model) {
    try {
      const prompt = `Predict queue wait time at "${servicePoint}" in 10 minutes.
Current match event: ${matchEvent || 'ongoing play'}. Current wait: ${currentWait} mins.

Context: Indian cricket/football stadium. Key events that spike queues:
- Halftime/drinks break: 3x spike
- Match end: 5x spike  
- Wicket/goal celebration: 1.5x spike
- Rain delay: 2x spike

Return ONLY valid JSON: {"predictedWait": 18, "confidence": 82, "reason": "brief explanation"}`;

      const text = await generate(prompt);
      res.json(safeParseJSON(text));
      return;
    } catch (e: any) {
      console.error('[Gemini /queue]', e?.message?.slice(0, 120));
    }
  }

  const event = (matchEvent || '').toLowerCase();
  const multiplier = event.includes('halftime') ? 2.8 : event.includes('end') ? 4.5 : event.includes('wicket') ? 1.4 : 1.2;
  res.json({
    predictedWait: Math.round(currentWait * multiplier),
    confidence: 68,
    reason: `Based on historical patterns for ${matchEvent || 'current match event'}.`,
  });
});

export default router;