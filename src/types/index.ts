// ─── Shared TypeScript Interfaces for StadiumIQ ───────────────────────────

export interface Zone {
  id: string;
  name: string;
  capacity: number;
  crowdCount: number;
  trend: 'rising' | 'falling' | 'steady';
  lat?: number;
  lng?: number;
}

export interface QueueEntry {
  id: string;
  location: string;
  currentWait: number;
  trend: 'rising' | 'falling' | 'steady';
  capacity?: number;
  crowdCount?: number;
  category?: 'gate' | 'food' | 'washroom' | 'medical' | 'parking';
}

export interface Incident {
  id: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  zone?: string;
  timestamp: string;
  resolved: boolean;
}

export interface GateRecommendation {
  gate: string;
  reasoning: string;
  estimatedWalkMin?: number;
}

export interface RerouteSuggestion {
  targetZone: string;
  suggestion: string;
  estimatedReliefTimeMin: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface EmergencyRoute {
  exit: string;
  route: string;
  instructionText: string;
}

export interface QueuePrediction {
  predictedWait: number;
  confidence: number;
  reason?: string;
}

export interface UserContext {
  seatBlock: string;
  language: string;
  location?: { lat: number; lng: number };
  crowdHotspots?: Zone[];
}

export interface ChatMessage {
  role: 'user' | 'bot';
  text: string;
  time: string;
}

export interface Facility {
  id: string;
  category: 'food' | 'washroom' | 'medical' | 'parking' | 'gate';
  name: string;
  distance: string;
  distanceMeters?: number;
  wait: number;
  open: boolean;
  icon: string;
  detail: string;
}
