// Always use relative /api path.
// Dev:  Vite proxy (vite.config.ts) forwards /api → http://127.0.0.1:8080
// Prod: Express serves both frontend and /api from the same port — no config needed.
const API_BASE = '/api';

const post = async (endpoint: string, body: object) => {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
};

export const chatWithAssistant = (userMessage: string, userContext: any) =>
  post('/gemini/chat', { userMessage, userContext }).then(d => d.text as string);

export const getOptimalGate = (seatBlock: string, crowdData: any[]) =>
  post('/gemini/gate', { seatBlock, crowdData });

export const getEmergencyExit = (userLocation: any, crowdData: any[]) =>
  post('/gemini/emergency', { userLocation, crowdData });

export const predictQueueSpike = (servicePoint: string, matchEvent: string, currentWait: number) =>
  post('/gemini/queue', { servicePoint, matchEvent, currentWait });

export const generateReroutingSuggestion = (crowdSnapshot: any[]) =>
  post('/gemini/reroute', { crowdSnapshot });
