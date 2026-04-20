import { useState } from 'react';
import { Search, Clock, Navigation, ChevronRight } from 'lucide-react';
import { chatWithAssistant } from '../../services/geminiService';

type Category = 'food' | 'washroom' | 'medical' | 'parking' | 'gate';

const FACILITIES = [
  { id: 'f1',  category: 'food'     as Category, name: 'Food Court A — Level 1', distance: '2 min walk', wait: 8,  open: true,  icon: '🍔', detail: 'Burgers, wraps, chai. Open till match ends.' },
  { id: 'f2',  category: 'food'     as Category, name: 'Food Court B — Level 2', distance: '4 min walk', wait: 3,  open: true,  icon: '🍕', detail: 'Pizza, biryani, cold drinks.' },
  { id: 'f3',  category: 'food'     as Category, name: 'Snack Bar — East Wing',  distance: '1 min walk', wait: 14, open: true,  icon: '🥤', detail: 'Quick bites and beverages only.' },
  { id: 'w1',  category: 'washroom' as Category, name: 'Washroom Block B',       distance: '1 min walk', wait: 0,  open: true,  icon: '🚻', detail: 'Clean. Currently no queue.' },
  { id: 'w2',  category: 'washroom' as Category, name: 'Washroom Block D',       distance: '3 min walk', wait: 5,  open: true,  icon: '🚻', detail: 'Near Gate D.' },
  { id: 'm1',  category: 'medical'  as Category, name: 'First Aid — Gate A',     distance: '3 min walk', wait: 0,  open: true,  icon: '🏥', detail: 'Full first-aid. Defibrillator available.' },
  { id: 'm2',  category: 'medical'  as Category, name: 'Medical Station — Gate C',distance: '5 min walk', wait: 0, open: true,  icon: '🩺', detail: 'Doctor on duty till 11pm.' },
  { id: 'p1',  category: 'parking'  as Category, name: 'Parking Level P1',       distance: '8 min walk', wait: 0,  open: true,  icon: '🅿️', detail: '70% full. Use North entrance.' },
  { id: 'p2',  category: 'parking'  as Category, name: 'Parking Level P2',       distance: '6 min walk', wait: 0,  open: true,  icon: '🚗', detail: '40% full. Fastest exit route.' },
  { id: 'g1',  category: 'gate'     as Category, name: 'Gate A — Main Entry',    distance: '4 min walk', wait: 6,  open: true,  icon: '🚪', detail: 'Moderate crowd. All lanes open.' },
  { id: 'g2',  category: 'gate'     as Category, name: 'Gate B',                 distance: '2 min walk', wait: 18, open: true,  icon: '🚪', detail: 'High crowd. Use Gate A instead.' },
  { id: 'g3',  category: 'gate'     as Category, name: 'Gate C — South Exit',    distance: '5 min walk', wait: 2,  open: true,  icon: '🚪', detail: 'Least crowded. Recommended.' },
];

const CATS: { id: Category | 'all'; label: string; emoji: string }[] = [
  { id: 'all',      label: 'All',       emoji: '📍' },
  { id: 'food',     label: 'Food',      emoji: '🍔' },
  { id: 'washroom', label: 'Washroom',  emoji: '🚻' },
  { id: 'medical',  label: 'Medical',   emoji: '🏥' },
  { id: 'parking',  label: 'Parking',   emoji: '🅿️' },
  { id: 'gate',     label: 'Gates',     emoji: '🚪' },
];

export const FacilityFinder = () => {
  const [cat,      setCat]      = useState<Category | 'all'>('all');
  const [search,   setSearch]   = useState('');
  const [selected, setSelected] = useState<typeof FACILITIES[0] | null>(null);
  const [aiRoute,  setAiRoute]  = useState('');
  const [routeLoading, setRouteLoading] = useState(false);

  const filtered = FACILITIES.filter(f =>
    (cat === 'all' || f.category === cat) &&
    (!search || f.name.toLowerCase().includes(search.toLowerCase()))
  ).sort((a, b) => a.wait - b.wait);

  const getAiRoute = async (facility: typeof FACILITIES[0]) => {
    setSelected(facility);
    setAiRoute('');
    setRouteLoading(true);
    try {
      const resp = await chatWithAssistant(
        `Give me walking directions to ${facility.name} in the stadium. Be brief, 2-3 sentences max.`,
        { seatBlock: 'Block C', language: 'English' }
      );
      setAiRoute(resp);
    } catch {
      setAiRoute(`Head toward the ${facility.name}. Look for signs near the main concourse. It's ${facility.distance} from the main concourse.`);
    }
    setRouteLoading(false);
  };

  const waitColor = (w: number) =>
    w === 0 ? '#22c55e' : w < 8 ? '#22c55e' : w < 15 ? '#f59e0b' : '#e11d48';

  return (
    <div className="max-w-4xl mx-auto" style={{ paddingBottom: 80 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontWeight: 900, fontSize: 22, color: 'var(--text)', marginBottom: 4 }}>
          Find Facilities Nearby
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Real-time wait times for food, washrooms, medical & parking
        </p>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search facilities..."
          style={{ width: '100%', paddingLeft: 38, paddingRight: 16, paddingTop: 10, paddingBottom: 10, borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
        />
      </div>

      {/* Category Pills */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {CATS.map(c => (
          <button key={c.id} onClick={() => setCat(c.id)}
            style={{ padding: '6px 14px', borderRadius: 20, border: '1.5px solid', cursor: 'pointer', fontWeight: 700, fontSize: 12, transition: 'all 0.15s',
              background: cat === c.id ? 'var(--accent)' : 'var(--bg-card)',
              borderColor: cat === c.id ? 'var(--accent)' : 'var(--border)',
              color: cat === c.id ? 'white' : 'var(--text-muted)' }}>
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      {/* Selected facility route panel */}
      {selected && (
        <div className="card" style={{ marginBottom: 16, padding: '14px 16px', borderLeft: '3px solid var(--accent)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)' }}>{selected.icon} {selected.name}</div>
              {routeLoading
                ? <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 6, fontStyle: 'italic' }}>Getting AI directions...</div>
                : <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>{aiRoute}</div>}
            </div>
            <button onClick={() => { setSelected(null); setAiRoute(''); }}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18, padding: 4 }}>×</button>
          </div>
        </div>
      )}

      {/* Facility list */}
      <div style={{ display: 'grid', gap: 10 }}>
        {filtered.map(f => (
          <div key={f.id} className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', transition: 'box-shadow 0.15s' }}
            onClick={() => getAiRoute(f)}>
            <div style={{ fontSize: 28, flexShrink: 0 }}>{f.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
                  <Navigation size={11} /> {f.distance}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>•</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{f.detail}</span>
              </div>
            </div>
            <div style={{ flexShrink: 0, textAlign: 'right' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                <Clock size={11} style={{ color: waitColor(f.wait) }} />
                <span style={{ fontWeight: 900, fontSize: 13, color: waitColor(f.wait) }}>
                  {f.wait === 0 ? 'No wait' : `${f.wait}m wait`}
                </span>
              </div>
              <ChevronRight size={14} style={{ color: 'var(--accent)', marginTop: 4 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
