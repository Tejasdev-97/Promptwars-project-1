import { useEffect, useState } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../../services/firebaseService';
import { Users, TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';

interface Zone {
  id: string;
  name: string;
  capacity: number;
  crowdCount: number;
  trend: 'rising' | 'falling' | 'steady';
  lat?: number;
  lng?: number;
}

const MOCK_ZONES: Zone[] = [
  { id: 'north',   name: 'North Stand',       capacity: 5000, crowdCount: 4200, trend: 'rising'  },
  { id: 'south',   name: 'South Pavilion',     capacity: 4000, crowdCount: 1800, trend: 'falling' },
  { id: 'east',    name: 'East Gallery',       capacity: 3000, crowdCount: 2700, trend: 'rising'  },
  { id: 'west',    name: 'West Block',         capacity: 3500, crowdCount: 1200, trend: 'steady'  },
  { id: 'food_a',  name: 'Food Court A (L1)',  capacity: 400,  crowdCount: 340,  trend: 'rising'  },
  { id: 'food_b',  name: 'Food Court B (L2)',  capacity: 400,  crowdCount: 120,  trend: 'steady'  },
  { id: 'gate_a',  name: 'Gate A Entry',       capacity: 800,  crowdCount: 180,  trend: 'falling' },
  { id: 'gate_b',  name: 'Gate B Entry',       capacity: 800,  crowdCount: 650,  trend: 'rising'  },
  { id: 'parking', name: 'Parking Zone',       capacity: 2000, crowdCount: 1400, trend: 'steady'  },
];

const densityLevel = (pct: number) => {
  if (pct >= 90) return { label: 'Critical', color: '#e11d48', bg: 'rgba(225,29,72,0.12)' };
  if (pct >= 75) return { label: 'High',     color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' };
  if (pct >= 50) return { label: 'Moderate', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' };
  return             { label: 'Low',      color: '#22c55e', bg: 'rgba(34,197,94,0.12)'  };
};

const TrendIcon = ({ t }: { t: string }) =>
  t === 'rising'  ? <TrendingUp  size={14} style={{ color: '#f59e0b' }} /> :
  t === 'falling' ? <TrendingDown size={14} style={{ color: '#22c55e' }} /> :
                    <Minus        size={14} style={{ color: '#6b7280' }} />;

interface Props { compact?: boolean; }

export const CrowdZoneMap = ({ compact = false }: Props) => {
  const [zones,    setZones]    = useState<Zone[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [usingMock, setMock]   = useState(false);
  const [lastSeen, setLastSeen] = useState('');

  useEffect(() => {
    let hasData = false;
    const timeoutId = setTimeout(() => {
      if (!hasData) {
        setZones(MOCK_ZONES);
        setMock(true);
        setLoading(false);
      }
    }, 1000);

    const unsub = onSnapshot(
      query(collection(db, 'stadiums', 'wankhede_stadium', 'zones')),
      snap => {
        hasData = true;
        clearTimeout(timeoutId);
        if (snap.empty) { setZones(MOCK_ZONES); setMock(true); }
        else { setZones(snap.docs.map(d => ({ id: d.id, ...d.data() } as Zone))); setMock(false); }
        setLastSeen(new Date().toLocaleTimeString('en-IN'));
        setLoading(false);
      },
      () => { 
        hasData = true;
        clearTimeout(timeoutId);
        setZones(MOCK_ZONES); 
        setMock(true); 
        setLoading(false); 
      }
    );
    return () => {
      clearTimeout(timeoutId);
      unsub();
    };
  }, []);

  const critical = zones.filter(z => (z.crowdCount / z.capacity) >= 0.9).length;
  const high     = zones.filter(z => { const p = z.crowdCount / z.capacity; return p >= 0.75 && p < 0.9; }).length;

  if (loading) return (
    <div className="card p-5" style={{ minHeight: 160 }}>
      <div style={{ background: 'var(--bg-subtle)', borderRadius: 8, height: 120, animation: 'pulse 1.5s infinite' }} />
    </div>
  );

  if (compact) {
    // Compact summary bar for HomePage
    return (
      <div className="card p-4">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={18} style={{ color: 'var(--accent)' }} />
            <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>Live Crowd Density</span>
          </div>
          {(critical > 0 || high > 0) && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 800, color: '#e11d48', background: 'rgba(225,29,72,0.1)', padding: '2px 8px', borderRadius: 20, border: '1px solid rgba(225,29,72,0.3)' }}>
              <AlertTriangle size={11} /> {critical} critical
            </span>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {zones.slice(0, 6).map(z => {
            const pct = Math.round(z.crowdCount / z.capacity * 100);
            const lvl = densityLevel(pct);
            return (
              <div key={z.id} style={{ background: lvl.bg, border: `1px solid ${lvl.color}40`, borderRadius: 8, padding: '6px 8px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{z.name}</div>
                <div style={{ fontSize: 13, fontWeight: 900, color: lvl.color }}>{pct}%</div>
                <div style={{ height: 3, background: 'rgba(0,0,0,0.1)', borderRadius: 2, marginTop: 3 }}>
                  <div style={{ width: `${pct}%`, height: 3, background: lvl.color, borderRadius: 2, transition: 'width 0.6s ease' }} />
                </div>
              </div>
            );
          })}
        </div>
        {usingMock && <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>Estimated data — connect Firebase for live sensor readings</p>}
      </div>
    );
  }

  // Full view for dedicated page
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontWeight: 900, fontSize: 20, color: 'var(--text)', margin: 0 }}>Crowd Movement Map</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Live crowd density by zone — move to less crowded areas for faster service
          </p>
        </div>
        <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--text-muted)' }}>
          {lastSeen && `Updated ${lastSeen}`}
        </div>
      </div>

      {/* Alert banners */}
      {critical > 0 && (
        <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 10, background: 'rgba(225,29,72,0.08)', border: '1px solid rgba(225,29,72,0.3)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={16} style={{ color: '#e11d48' }} />
          <span style={{ fontWeight: 700, fontSize: 13, color: '#e11d48' }}>{critical} zone(s) critically overcrowded — please avoid and move to less crowded areas</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
        {zones.map(z => {
          const pct = Math.round(z.crowdCount / z.capacity * 100);
          const lvl = densityLevel(pct);
          return (
            <div key={z.id} className="card" style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{z.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                    <TrendIcon t={z.trend} />
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                      {z.trend === 'rising' ? 'Getting busier' : z.trend === 'falling' ? 'Clearing up' : 'Steady'}
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: lvl.color }}>{pct}%</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: lvl.color, background: lvl.bg, padding: '1px 6px', borderRadius: 12 }}>{lvl.label}</div>
                </div>
              </div>
              <div style={{ background: 'var(--bg-subtle)', borderRadius: 6, height: 8, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: 8, background: lvl.color, borderRadius: 6, transition: 'width 0.6s ease', boxShadow: `0 0 8px ${lvl.color}60` }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                <span>{z.crowdCount.toLocaleString()} people</span>
                <span>Capacity: {z.capacity.toLocaleString()}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
