import { useEffect, useState, useCallback, useRef } from 'react';
import { GoogleMap, useLoadScript, Marker, InfoWindow, Circle } from '@react-google-maps/api';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../../services/firebaseService';
import { MapPin, RefreshCw, Layers, Eye, EyeOff } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────
interface QueueEntry {
  id: string; location: string; currentWait: number;
  trend: 'rising' | 'falling' | 'steady'; crowdCount?: number; capacity?: number;
}

// ── Static stadium layout (Wankhede Stadium, Mumbai) ──────────────────────
// Approximate real-world coordinates for each zone
const STADIUM_CENTER = { lat: 18.93885, lng: 72.82575 };

const GATES = [
  { id: 'gate_a', label: 'Gate A', lat: 18.9396,  lng: 72.8258,  direction: 'North' },
  { id: 'gate_b', label: 'Gate B', lat: 18.9388,  lng: 72.8267,  direction: 'East'  },
  { id: 'gate_c', label: 'Gate C', lat: 18.9381,  lng: 72.8258,  direction: 'South' },
  { id: 'gate_d', label: 'Gate D', lat: 18.9388,  lng: 72.8248,  direction: 'West'  },
];

const FACILITIES = [
  { id: 'food_a',  label: 'Food Court A', lat: 18.9393, lng: 72.8262, icon: '🍔', type: 'food'    },
  { id: 'food_b',  label: 'Food Court B', lat: 18.9384, lng: 72.8263, icon: '🍕', type: 'food'    },
  { id: 'wash_b',  label: 'Washroom B',   lat: 18.9390, lng: 72.8253, icon: '🚻', type: 'washroom'},
  { id: 'wash_d',  label: 'Washroom D',   lat: 18.9385, lng: 72.8270, icon: '🚻', type: 'washroom'},
  { id: 'med_a',   label: 'First Aid',    lat: 18.9395, lng: 72.8255, icon: '🏥', type: 'medical' },
  { id: 'park_p1', label: 'Parking P1',   lat: 18.9402, lng: 72.8258, icon: '🅿️', type: 'parking' },
  { id: 'park_p2', label: 'Parking P2',   lat: 18.9388, lng: 72.8240, icon: '🅿️', type: 'parking' },
];

// Crowd zones mapped to approximate coordinates + radius
const CROWD_ZONES = [
  { id: 'north',  label: 'North Stand', lat: 18.9395, lng: 72.8258, radius: 60 },
  { id: 'south',  label: 'South Stand', lat: 18.9382, lng: 72.8258, radius: 60 },
  { id: 'east',   label: 'East Gallery',lat: 18.9388, lng: 72.8267, radius: 55 },
  { id: 'west',   label: 'West Block',  lat: 18.9388, lng: 72.8249, radius: 55 },
];

// Mock fallback queue data matching gate IDs
const MOCK_QUEUES: QueueEntry[] = [
  { id: 'gate_a', location: 'Gate A Entry',  currentWait: 6,  trend: 'steady',  crowdCount: 180, capacity: 800 },
  { id: 'gate_b', location: 'Gate B Entry',  currentWait: 18, trend: 'rising',  crowdCount: 650, capacity: 800 },
  { id: 'gate_c', location: 'Gate C Entry',  currentWait: 2,  trend: 'falling', crowdCount: 90,  capacity: 800 },
  { id: 'gate_d', location: 'Gate D Entry',  currentWait: 8,  trend: 'steady',  crowdCount: 220, capacity: 800 },
  { id: 'north',  location: 'North Stand',   currentWait: 0,  trend: 'rising',  crowdCount: 4200, capacity: 5000 },
  { id: 'south',  location: 'South Stand',   currentWait: 0,  trend: 'falling', crowdCount: 1800, capacity: 4000 },
  { id: 'east',   location: 'East Gallery',  currentWait: 0,  trend: 'rising',  crowdCount: 2700, capacity: 3000 },
  { id: 'west',   location: 'West Block',    currentWait: 0,  trend: 'steady',  crowdCount: 1200, capacity: 3500 },
];

// ── Helpers ────────────────────────────────────────────────────────────────
const densityToColor = (pct: number) => {
  if (pct >= 85) return { fill: '#e11d48', stroke: '#9f1239' };  // Critical — red
  if (pct >= 65) return { fill: '#f59e0b', stroke: '#b45309' };  // High — amber
  if (pct >= 40) return { fill: '#3b82f6', stroke: '#1e40af' };  // Moderate — blue
  return             { fill: '#22c55e', stroke: '#15803d' };      // Low — green
};

const waitToColor = (wait: number) =>
  wait === 0 ? '#22c55e' : wait < 8 ? '#22c55e' : wait < 16 ? '#f59e0b' : '#e11d48';

const TREND_ARROW = { rising: '↑', falling: '↓', steady: '→' };

const MAP_STYLES_DARK = [
  { elementType: 'geometry',           stylers: [{ color: '#1a1a2e' }] },
  { elementType: 'labels.text.fill',   stylers: [{ color: '#8e9eb5' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a2e' }] },
  { featureType: 'water',              elementType: 'geometry', stylers: [{ color: '#0d2137' }] },
  { featureType: 'road',               elementType: 'geometry', stylers: [{ color: '#283044' }] },
  { featureType: 'poi',                stylers: [{ visibility: 'off'   }] },
];

const MAP_STYLES_LIGHT = [
  { featureType: 'poi',                stylers: [{ visibility: 'off'   }] },
  { featureType: 'transit',            stylers: [{ visibility: 'off'   }] },
];

const GMAP_LIBRARIES: ('places' | 'geometry' | 'visualization')[] = [];

// ── Custom SVG marker for gates ────────────────────────────────────────────
const gateIcon = (color: string, label: string) => ({
  url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="52" height="60" viewBox="0 0 52 60">
      <filter id="shadow"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.4"/></filter>
      <path d="M26 0 C11.64 0 0 11.64 0 26 C0 40.36 26 60 26 60 C26 60 52 40.36 52 26 C52 11.64 40.36 0 26 0Z"
        fill="${color}" filter="url(#shadow)"/>
      <circle cx="26" cy="24" r="12" fill="white" opacity="0.9"/>
      <text x="26" y="29" font-size="11" font-weight="900" text-anchor="middle" 
        font-family="Arial" fill="${color}">${label}</text>
    </svg>
  `)}`,
  scaledSize: { width: 44, height: 52, equals: () => false } as google.maps.Size,
  anchor: { x: 22, y: 52, equals: () => false }  as google.maps.Point,
});

const facilityIcon = (emoji: string) => ({
  url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
      <circle cx="18" cy="18" r="17" fill="white" stroke="#00d4aa" stroke-width="2"/>
      <text x="18" y="24" font-size="16" text-anchor="middle">${emoji}</text>
    </svg>
  `)}`,
  scaledSize: { width: 32, height: 32, equals: () => false } as google.maps.Size,
  anchor: { x: 16, y: 16, equals: () => false } as google.maps.Point,
});

// ── Main Component ─────────────────────────────────────────────────────────
export const LiveMapPage = () => {
  const [queueData,     setQueueData]     = useState<QueueEntry[]>(MOCK_QUEUES);
  const [selectedId,    setSelectedId]    = useState<string | null>(null);
  const [showFacilities,setShowFacilities]= useState(true);
  const [showHeatmap,   setShowHeatmap]   = useState(true);
  const [isDark,        setIsDark]        = useState(() => document.documentElement.classList.contains('dark'));
  const [lastUpdate,    setLastUpdate]    = useState('');
  const mapRef = useRef<google.maps.Map | null>(null);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY || '',
    libraries: GMAP_LIBRARIES,
  });

  // ── Live Firestore subscription ──────────────────────────────────────────
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'stadiums', 'wankhede_stadium', 'queues')),
      snap => {
        if (!snap.empty) {
          setQueueData(snap.docs.map(d => ({ id: d.id, ...d.data() } as QueueEntry)));
          setLastUpdate(new Date().toLocaleTimeString('en-IN'));
        }
      },
      () => { /* keep mock data */ }
    );
    return () => unsub();
  }, []);

  // Watch dark mode
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains('dark'))
    );
    obs.observe(document.documentElement, { attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  // ── Helpers to look up queue data by zone/gate ID ─────────────────────
  const getQueueById = (id: string) => queueData.find(q => q.id === id);
  const getDensityPct = (id: string) => {
    const q = getQueueById(id);
    if (!q || !q.capacity) return 0;
    return Math.min(100, Math.round((q.crowdCount || 0) / q.capacity * 100));
  };
  const getWaitById = (id: string) => getQueueById(id)?.currentWait ?? 0;

  const getSelectedInfo = () => {
    if (!selectedId) return null;
    const gate = GATES.find(g => g.id === selectedId);
    const zone = CROWD_ZONES.find(z => z.id === selectedId);
    const fac  = FACILITIES.find(f => f.id === selectedId);
    const q    = getQueueById(selectedId);

    if (gate) return {
      title: `${gate.label} (${gate.direction})`,
      items: [
        { label: 'Wait Time',    value: q ? (q.currentWait === 0 ? 'No queue' : `${q.currentWait} min`) : 'N/A' },
        { label: 'Crowd Count',  value: q?.crowdCount ? `${q.crowdCount} people` : 'N/A' },
        { label: 'Trend',        value: q ? `${TREND_ARROW[q.trend]} ${q.trend}` : 'N/A' },
        { label: 'Status',       value: 'Open' },
      ],
      color: waitToColor(q?.currentWait ?? 0),
    };
    if (zone) {
      const pct = getDensityPct(selectedId);
      return {
        title: zone.label,
        items: [
          { label: 'Density',     value: `${pct}%` },
          { label: 'Crowd Count', value: q?.crowdCount ? `${q.crowdCount.toLocaleString()} people` : 'N/A' },
          { label: 'Capacity',    value: q?.capacity ? q.capacity.toLocaleString() : 'N/A' },
          { label: 'Trend',       value: q ? `${TREND_ARROW[q.trend]} ${q.trend}` : 'N/A' },
        ],
        color: densityToColor(pct).fill,
      };
    }
    if (fac) return {
      title: fac.label,
      items: [{ label: 'Type', value: fac.type }, { label: 'Status', value: 'Open' }],
      color: '#00d4aa',
    };
    return null;
  };

  const onMapLoad = useCallback((map: google.maps.Map) => { mapRef.current = map; }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  if (loadError) return (
    <div className="card p-8 text-center">
      <MapPin size={32} style={{ color: 'var(--danger)', margin: '0 auto 12px' }} />
      <p className="font-bold text-app">Map failed to load</p>
      <p className="text-sm text-muted mt-2">Check that VITE_GOOGLE_MAPS_KEY is set in your .env file</p>
    </div>
  );

  if (!isLoaded) return (
    <div className="card" style={{ height: '65vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <RefreshCw size={28} style={{ color: 'var(--accent)', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
        <p className="text-muted text-sm font-bold">Loading Interactive Map...</p>
      </div>
    </div>
  );

  const selectedInfo = getSelectedInfo();

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 100 }}>

      {/* Title row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontWeight: 900, fontSize: 22, color: 'var(--text)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <MapPin size={22} style={{ color: 'var(--accent)' }} /> Live Crowd Map
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
            Real-time crowd density, gate wait times &amp; facilities — tap any marker for details
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
          {lastUpdate && <span>Updated {lastUpdate}</span>}
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', animation: 'pulse-glow 2s infinite' }} />
        </div>
      </div>

      {/* Map Controls */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <button onClick={() => setShowHeatmap(h => !h)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, border: '1.5px solid var(--border)', background: showHeatmap ? 'var(--accent)' : 'var(--bg-card)', color: showHeatmap ? 'white' : 'var(--text-muted)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
          <Layers size={13} /> Crowd Overlay
        </button>
        <button onClick={() => setShowFacilities(f => !f)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, border: '1.5px solid var(--border)', background: showFacilities ? 'var(--accent)' : 'var(--bg-card)', color: showFacilities ? 'white' : 'var(--text-muted)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
          {showFacilities ? <Eye size={13} /> : <EyeOff size={13} />} Facilities
        </button>
        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto', flexWrap: 'wrap' }}>
          {[['#22c55e','Low'],['#3b82f6','Moderate'],['#f59e0b','High'],['#e11d48','Critical']].map(([c,l]) => (
            <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: c, display: 'inline-block' }} />{l}
            </span>
          ))}
        </div>
      </div>

      {/* Map */}
      <div className="card" style={{ height: '62vh', minHeight: 420, overflow: 'hidden' }}>
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          zoom={17}
          center={STADIUM_CENTER}
          onLoad={onMapLoad}
          onClick={() => setSelectedId(null)}
          options={{
            mapTypeId: 'satellite',
            tilt: 0,
            disableDefaultUI: false,
            zoomControl: true,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
            styles: isDark ? MAP_STYLES_DARK : MAP_STYLES_LIGHT,
          }}
        >
          {/* ── Crowd Density Circles (heatmap overlay) ── */}
          {showHeatmap && CROWD_ZONES.map(zone => {
            const pct    = getDensityPct(zone.id);
            const colors = densityToColor(pct);
            return (
              <Circle
                key={zone.id}
                center={{ lat: zone.lat, lng: zone.lng }}
                radius={zone.radius}
                options={{
                  fillColor:    colors.fill,
                  fillOpacity:  0.35,
                  strokeColor:  colors.stroke,
                  strokeOpacity:0.8,
                  strokeWeight: 2,
                  clickable:    true,
                }}
                onClick={() => setSelectedId(zone.id)}
              />
            );
          })}

          {/* ── Gate Markers ── */}
          {GATES.map(gate => {
            const wait  = getWaitById(gate.id);
            const color = waitToColor(wait);
            return (
              <Marker
                key={gate.id}
                position={{ lat: gate.lat, lng: gate.lng }}
                icon={gateIcon(color, gate.label.split(' ')[1])}
                title={`${gate.label} — ${wait === 0 ? 'No wait' : `${wait} min wait`}`}
                onClick={() => setSelectedId(gate.id)}
                zIndex={10}
              />
            );
          })}

          {/* ── Facility Markers ── */}
          {showFacilities && FACILITIES.map(fac => (
            <Marker
              key={fac.id}
              position={{ lat: fac.lat, lng: fac.lng }}
              icon={facilityIcon(fac.icon)}
              title={fac.label}
              onClick={() => setSelectedId(fac.id)}
              zIndex={5}
            />
          ))}

          {/* ── InfoWindow for selected marker ── */}
          {selectedId && selectedInfo && (() => {
            const gate = GATES.find(g => g.id === selectedId);
            const zone = CROWD_ZONES.find(z => z.id === selectedId);
            const fac  = FACILITIES.find(f => f.id === selectedId);
            const pos  = gate
              ? { lat: gate.lat, lng: gate.lng }
              : zone
              ? { lat: zone.lat, lng: zone.lng }
              : fac
              ? { lat: fac.lat, lng: fac.lng }
              : STADIUM_CENTER;

            return (
              <InfoWindow
                position={pos}
                onCloseClick={() => setSelectedId(null)}
              >
                <div style={{ minWidth: 160, fontFamily: 'Inter, sans-serif', padding: 4 }}>
                  <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 8, color: selectedInfo.color }}>
                    {selectedInfo.title}
                  </div>
                  {selectedInfo.items.map(item => (
                    <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 12, marginBottom: 4, color: '#374151' }}>
                      <span style={{ color: '#6b7280' }}>{item.label}</span>
                      <span style={{ fontWeight: 700 }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </InfoWindow>
            );
          })()}
        </GoogleMap>
      </div>

      {/* ── Gate Status Cards below the map (live data) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginTop: 14 }}>
        {GATES.map(gate => {
          const wait   = getWaitById(gate.id);
          const q      = getQueueById(gate.id);
          const color  = waitToColor(wait);
          const trend  = q?.trend || 'steady';
          return (
            <button
              key={gate.id}
              onClick={() => {
                setSelectedId(gate.id);
                mapRef.current?.panTo({ lat: gate.lat, lng: gate.lng });
                mapRef.current?.setZoom(18);
              }}
              style={{
                background: 'var(--bg-card)', border: `1.5px solid ${selectedId === gate.id ? color : 'var(--border)'}`,
                borderRadius: 12, padding: '12px 14px', textAlign: 'left', cursor: 'pointer',
                boxShadow: selectedId === gate.id ? `0 0 0 2px ${color}40` : 'var(--shadow)',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--text)' }}>{gate.label}</span>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block', boxShadow: `0 0 6px ${color}` }} />
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, color }}>{wait === 0 ? '0m' : `${wait}m`}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
                {trend === 'rising' ? '↑ Getting busier' : trend === 'falling' ? '↓ Clearing' : '→ Steady'}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Zone Summary ── */}
      <div style={{ marginTop: 14 }}>
        <h3 style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)', marginBottom: 10 }}>Stadium Zone Density</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
          {CROWD_ZONES.map(zone => {
            const pct    = getDensityPct(zone.id);
            const colors = densityToColor(pct);
            const q      = getQueueById(zone.id);
            return (
              <button key={zone.id}
                onClick={() => {
                  setSelectedId(zone.id);
                  mapRef.current?.panTo({ lat: zone.lat, lng: zone.lng });
                  mapRef.current?.setZoom(18);
                }}
                style={{
                  background: 'var(--bg-card)', border: `1.5px solid ${selectedId === zone.id ? colors.fill : 'var(--border)'}`,
                  borderRadius: 10, padding: '10px 14px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{zone.label}</span>
                  <span style={{ fontWeight: 900, fontSize: 14, color: colors.fill }}>{pct}%</span>
                </div>
                <div style={{ background: 'var(--bg-subtle)', borderRadius: 4, height: 5 }}>
                  <div style={{ width: `${pct}%`, height: 5, background: colors.fill, borderRadius: 4, transition: 'width 0.6s ease' }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  {q?.crowdCount?.toLocaleString() || '—'} people · {q?.trend === 'rising' ? '↑' : q?.trend === 'falling' ? '↓' : '→'} {q?.trend || 'steady'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
};
