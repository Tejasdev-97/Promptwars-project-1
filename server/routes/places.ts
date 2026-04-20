import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

const placesSchema = z.object({
  lat:      z.number().min(-90).max(90),
  lng:      z.number().min(-180).max(180),
  category: z.enum(['food', 'medical', 'parking', 'atm', 'restroom']),
  radius:   z.number().min(50).max(2000).default(500),
});

// Maps category to Google Places type
const PLACE_TYPE_MAP: Record<string, string> = {
  food:     'food',
  medical:  'hospital',
  parking:  'parking',
  atm:      'atm',
  restroom: 'point_of_interest',
};

/**
 * POST /api/places
 * Uses Google Maps Places API (Nearby Search) to find real nearby facilities.
 * Falls back to mock data if the API key is missing or the request fails.
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const parsed = placesSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }

  const { lat, lng, category, radius } = parsed.data;
  const apiKey = process.env.GOOGLE_MAPS_KEY || process.env.VITE_GOOGLE_MAPS_KEY;

  if (apiKey) {
    try {
      const type     = PLACE_TYPE_MAP[category] || 'point_of_interest';
      const url      = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${type}&key=${apiKey}`;
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });

      if (!response.ok) throw new Error(`Places API HTTP ${response.status}`);

      const data = await response.json() as { status: string; results: any[] };

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        throw new Error(`Places API error: ${data.status}`);
      }

      const places = (data.results || []).slice(0, 8).map((p: any) => ({
        id:        p.place_id,
        name:      p.name,
        address:   p.vicinity,
        open:      p.opening_hours?.open_now ?? true,
        rating:    p.rating,
        lat:       p.geometry?.location?.lat,
        lng:       p.geometry?.location?.lng,
        category,
      }));

      res.json({ places, source: 'google_places', total: places.length });
      return;
    } catch (e: any) {
      console.warn('[Places API] Falling back to mock:', e?.message?.slice(0, 80));
    }
  }

  // ── Fallback: mock nearby facilities ─────────────────────────────────
  const mockFallback: Record<string, any[]> = {
    food: [
      { id: 'f1', name: 'Stadium Food Court A', address: 'Level 1, Gate A Side', open: true, rating: 4.2, category },
      { id: 'f2', name: 'Quick Bites — East Wing', address: 'Level 1, East Concourse', open: true, rating: 3.8, category },
    ],
    medical: [
      { id: 'm1', name: 'First Aid Station — Gate A', address: 'Gate A, Ground Floor', open: true, rating: null, category },
      { id: 'm2', name: 'Wankhede Medical Post', address: 'Gate C, Level 1', open: true, rating: null, category },
    ],
    parking: [
      { id: 'p1', name: 'Parking Level P1', address: 'North Entrance', open: true, rating: null, category },
      { id: 'p2', name: 'Parking Level P2', address: 'West Entrance', open: true, rating: null, category },
    ],
    atm: [
      { id: 'a1', name: 'SBI ATM — Gate B', address: 'Gate B Lobby', open: true, rating: null, category },
    ],
    restroom: [
      { id: 'r1', name: 'Washroom Block B', address: 'Level 1, Near Gate B', open: true, rating: null, category },
      { id: 'r2', name: 'Washroom Block D', address: 'Level 2, East Wing', open: true, rating: null, category },
    ],
  };

  res.json({
    places: mockFallback[category] || [],
    source: 'mock',
    note: 'Live data requires GOOGLE_MAPS_KEY in .env',
  });
});

export default router;
