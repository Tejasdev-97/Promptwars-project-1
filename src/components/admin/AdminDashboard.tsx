import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, doc, updateDoc, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../../services/firebaseService';
import { LayoutDashboard, Users, Activity, BarChart2, Zap, Shield, RefreshCw, AlertTriangle, TrendingUp, Clock } from 'lucide-react';
import { generateReroutingSuggestion } from '../../services/geminiService';
import { AnalyticsPanel } from './AnalyticsPanel';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Queue { id: string; location: string; currentWait: number; trend: string; capacity?: number; crowdCount?: number; }
interface Incident { id: string; type: string; severity: string; timestamp: string; resolved: boolean; }
interface Reroute { targetZone: string; suggestion: string; estimatedReliefTimeMin: number; severity: string; }

// ─── Mock data used if Firestore is empty ──────────────────────────────────
const MOCK_QUEUES: Queue[] = [
  { id: '1', location: 'Gate A — Main Entry',  currentWait: 6,  trend: 'steady', capacity: 500, crowdCount: 180 },
  { id: '2', location: 'Level 1 Food Court',   currentWait: 18, trend: 'rising',  capacity: 200, crowdCount: 165 },
  { id: '3', location: 'Washroom Block B',      currentWait: 3,  trend: 'falling', capacity: 80,  crowdCount: 12  },
  { id: '4', location: 'Merchandise Store',    currentWait: 12, trend: 'rising',  capacity: 150, crowdCount: 110 },
  { id: '5', location: 'Medical Station',       currentWait: 0,  trend: 'steady',  capacity: 30,  crowdCount: 2   },
];

const waitColor = (w: number) =>
  w === 0 ? '#22c55e' : w < 8 ? '#22c55e' : w < 16 ? '#f59e0b' : '#e11d48';

// ─── Sub-components ────────────────────────────────────────────────────────
const StatCard = ({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) => (
  <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 12, padding: '1rem 1.25rem' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <p style={{ color: '#6b7280', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</p>
        <p style={{ color: '#f9fafb', fontSize: 28, fontWeight: 900, marginTop: 4 }}>{value}</p>
      </div>
      <div style={{ background: `${color}20`, borderRadius: 10, padding: 10 }}>
        <Icon size={22} style={{ color }} />
      </div>
    </div>
  </div>
);

// ─── Main Dashboard ────────────────────────────────────────────────────────
export const AdminDashboard = () => {
  const [queues, setQueues]       = useState<Queue[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [reroute, setReroute]     = useState<Reroute | null>(null);
  const [reroutingLoading, setReroutingLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<'overview' | 'queues' | 'incidents' | 'analytics'>('overview');
  const [usingMock, setUsingMock] = useState(false);
  const [lastPing, setLastPing]   = useState('');

  // Live Firestore subscriptions
  useEffect(() => {
    let hasData = false;
    const timeoutId = setTimeout(() => {
      if (!hasData) {
        setQueues(MOCK_QUEUES);
        setUsingMock(true);
      }
    }, 1000);

    const qRef = query(collection(db, 'stadiums', 'wankhede_stadium', 'queues'));
    const unsub1 = onSnapshot(qRef, snap => {
      hasData = true;
      clearTimeout(timeoutId);
      if (snap.empty) { setQueues(MOCK_QUEUES); setUsingMock(true); }
      else { setQueues(snap.docs.map(d => ({ id: d.id, ...d.data() } as Queue))); setUsingMock(false); }
      setLastPing(new Date().toLocaleTimeString('en-IN'));
    }, () => { 
      hasData = true;
      clearTimeout(timeoutId);
      setQueues(MOCK_QUEUES); 
      setUsingMock(true); 
    });

    const iRef = query(collection(db, 'stadiums', 'wankhede_stadium', 'incidents'));
    const unsub2 = onSnapshot(iRef, snap => {
      setIncidents(snap.docs.map(d => ({ id: d.id, ...d.data() } as Incident)));
    }, () => {});

    return () => { 
      clearTimeout(timeoutId);
      unsub1(); 
      unsub2(); 
    };
  }, []);

  // Trigger halftime spike on Firestore queues
  const triggerHalftime = async () => {
    if (usingMock) {
      setQueues(prev => prev.map(q => ({ ...q, currentWait: Math.floor(Math.random() * 30) + 20, trend: 'rising' })));
      alert('⚡ Halftime simulated! Queue times spiked. (Using local data — connect Firebase for persistent updates)');
      return;
    }
    const qs = await getDocs(collection(db, 'stadiums', 'wankhede_stadium', 'queues'));
    qs.forEach(async d => {
      await updateDoc(doc(db, 'stadiums', 'wankhede_stadium', 'queues', d.id), {
        currentWait: Math.floor(Math.random() * 30) + 20, trend: 'rising'
      });
    });
    alert('⚡ Halftime triggered! Queue times updated in Firestore.');
  };

  // AI Rerouting
  const runAiReroute = async () => {
    setReroutingLoading(true);
    setReroute(null);
    try {
      const snapshot = queues.map(q => ({
        name: q.location,
        crowdCount: q.crowdCount || q.currentWait * 8,
        capacity: q.capacity || 200
      }));
      const result = await generateReroutingSuggestion(snapshot);
      setReroute(result);
      // Log to Firestore
      if (!usingMock) {
        await addDoc(collection(db, 'stadiums', 'wankhede_stadium', 'rerouteLog'), {
          ...result, timestamp: new Date().toISOString()
        });
      }
    } catch (e) {
      console.error('Rerouting failed:', e);
      setReroute({ targetZone: 'Food Court', suggestion: 'Redirect 30% of attendees to Gate D concourse to ease North Stand congestion.', estimatedReliefTimeMin: 8, severity: 'MEDIUM' });
    }
    setReroutingLoading(false);
  };

  const totalCrowd  = queues.reduce((a, q) => a + (q.crowdCount || 0), 0);
  const avgWait     = queues.length ? Math.round(queues.reduce((a, q) => a + q.currentWait, 0) / queues.length) : 0;
  const openIncidents = incidents.filter(i => !i.resolved).length;

  const navItems = [
    { id: 'overview',   label: 'Overview',   icon: LayoutDashboard },
    { id: 'queues',     label: 'Queues',     icon: Users },
    { id: 'incidents',  label: 'Incidents',  icon: Activity },
    { id: 'analytics',  label: 'Analytics',  icon: BarChart2 },
  ] as const;

  const S = { // Styles reused
    sidebar:   { width: 220, background: '#0a0f1e', borderRight: '1px solid #1f2937', display: 'flex', flexDirection: 'column' as const, flexShrink: 0 },
    navItem:   (active: boolean): React.CSSProperties => ({
      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 8, marginBottom: 4,
      cursor: 'pointer', fontWeight: 700, fontSize: 13, transition: 'all 0.15s',
      background: active ? 'rgba(0,212,170,0.12)' : 'transparent',
      color: active ? '#00d4aa' : '#6b7280',
    }),
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0a0f1e', color: '#f9fafb', fontFamily: "'Inter', sans-serif", overflow: 'hidden' }}>

      {/* ── Sidebar ── */}
      <div style={S.sidebar}>
        <div style={{ padding: '20px 16px 12px', borderBottom: '1px solid #1f2937' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={20} style={{ color: '#00d4aa' }} />
            <span style={{ fontWeight: 900, fontSize: 18, color: '#f9fafb', letterSpacing: '-0.5px' }}>
              Stadium<span style={{ color: '#00d4aa' }}>IQ</span>
            </span>
          </div>
          <div style={{ fontSize: 11, color: '#4b5563', marginTop: 2, fontWeight: 600 }}>Admin Command Center</div>
        </div>

        <nav style={{ flex: 1, padding: '12px 8px' }}>
          {navItems.map(n => (
            <div key={n.id} style={S.navItem(activeSection === n.id)} onClick={() => setActiveSection(n.id)}>
              <n.icon size={16} /> {n.label}
            </div>
          ))}
        </nav>

        <div style={{ padding: 12, borderTop: '1px solid #1f2937', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={runAiReroute} disabled={reroutingLoading}
            style={{ background: 'rgba(0,212,170,0.12)', border: '1px solid rgba(0,212,170,0.3)', color: '#00d4aa', padding: '8px 12px', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
            {reroutingLoading ? <><RefreshCw size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> Analyzing...</> : <><Zap size={14} /> AI Reroute</>}
          </button>
          <button onClick={triggerHalftime}
            style={{ background: 'rgba(225,29,72,0.1)', border: '1px solid rgba(225,29,72,0.3)', color: '#f87171', padding: '8px 12px', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
            ⚡ HALFTIME DEMO
          </button>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '0 24px', height: 56, borderBottom: '1px solid #1f2937', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0a0f1e', flexShrink: 0 }}>
          <h1 style={{ fontWeight: 900, fontSize: 18, color: '#f9fafb', textTransform: 'capitalize' }}>
            {activeSection === 'overview' ? 'Live Operations' : activeSection.charAt(0).toUpperCase() + activeSection.slice(1)}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {lastPing && <span style={{ fontSize: 11, color: '#4b5563' }}>Updated {lastPing}</span>}
            {usingMock && <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 700 }}>⚠ Demo data</span>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', padding: '4px 12px', borderRadius: 20 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', animation: 'pulse-glow 2s infinite' }} />
              <span style={{ fontSize: 11, fontWeight: 800, color: '#22c55e' }}>LIVE</span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>

          {/* AI Reroute Result Banner */}
          {reroute && (
            <div style={{ marginBottom: 20, padding: '12px 16px', borderRadius: 12, border: '1px solid rgba(0,212,170,0.4)', background: 'rgba(0,212,170,0.08)', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <Zap size={18} style={{ color: '#00d4aa', flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontWeight: 800, color: '#00d4aa', fontSize: 13 }}>AI Rerouting — {reroute.targetZone}</div>
                <div style={{ color: '#9ca3af', fontSize: 13, marginTop: 2 }}>{reroute.suggestion}</div>
                <div style={{ color: '#6b7280', fontSize: 11, marginTop: 4 }}>⏱ Estimated relief: {reroute.estimatedReliefTimeMin} min &nbsp;|&nbsp; Severity: {reroute.severity}</div>
              </div>
              <button onClick={() => setReroute(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>
          )}

          {/* OVERVIEW */}
          {activeSection === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                <StatCard label="Total Crowd" value={totalCrowd.toLocaleString()} icon={Users}        color="#00d4aa" />
                <StatCard label="Avg Wait"    value={`${avgWait}m`}             icon={Clock}        color="#f59e0b" />
                <StatCard label="Incidents"   value={openIncidents}             icon={AlertTriangle} color="#e11d48" />
                <StatCard label="Queues Live" value={queues.length}             icon={TrendingUp}   color="#8b5cf6" />
              </div>

              <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #1f2937', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 800, fontSize: 14, color: '#f9fafb' }}>Queue Status</span>
                  <span style={{ fontSize: 11, color: '#4b5563' }}>{queues.length} locations</span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #1f2937' }}>
                      {['Location', 'Wait', 'Trend', 'Density'].map(h => (
                        <th key={h} style={{ padding: '8px 16px', textAlign: 'left', color: '#4b5563', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {queues.map((q, i) => {
                      const fill = q.capacity ? Math.round((q.crowdCount || 0) / q.capacity * 100) : 0;
                      return (
                        <tr key={q.id} style={{ borderBottom: i < queues.length - 1 ? '1px solid #1f2937' : 'none' }}>
                          <td style={{ padding: '10px 16px', color: '#e5e7eb', fontWeight: 600 }}>{q.location}</td>
                          <td style={{ padding: '10px 16px' }}>
                            <span style={{ background: `${waitColor(q.currentWait)}20`, color: waitColor(q.currentWait), padding: '3px 10px', borderRadius: 20, fontWeight: 800, fontSize: 12 }}>
                              {q.currentWait === 0 ? 'No wait' : `${q.currentWait}m`}
                            </span>
                          </td>
                          <td style={{ padding: '10px 16px', color: q.trend === 'rising' ? '#f87171' : q.trend === 'falling' ? '#4ade80' : '#f59e0b', fontWeight: 700, fontSize: 12, textTransform: 'capitalize' }}>
                            {q.trend === 'rising' ? '↑' : q.trend === 'falling' ? '↓' : '→'} {q.trend}
                          </td>
                          <td style={{ padding: '10px 16px', width: 140 }}>
                            <div style={{ background: '#1f2937', borderRadius: 4, height: 6 }}>
                              <div style={{ width: `${fill}%`, height: 6, borderRadius: 4, background: fill > 80 ? '#e11d48' : fill > 60 ? '#f59e0b' : '#22c55e', transition: 'width 0.5s ease' }} />
                            </div>
                            <div style={{ color: '#4b5563', fontSize: 11, marginTop: 2 }}>{fill}%</div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* INCIDENTS */}
          {activeSection === 'incidents' && (
            <div>
              <h2 style={{ fontWeight: 900, fontSize: 18, color: '#f9fafb', marginBottom: 16 }}>Incident Log</h2>
              {incidents.length === 0 ? (
                <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 12, padding: '48px 16px', textAlign: 'center', color: '#4b5563' }}>
                  <Activity size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                  <p style={{ fontWeight: 700 }}>No active incidents</p>
                  <p style={{ fontSize: 13, marginTop: 4 }}>Emergency trigger events from attendees appear here.</p>
                </div>
              ) : incidents.map(inc => (
                <div key={inc.id} style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 12, padding: '14px 16px', marginBottom: 10, display: 'flex', gap: 12, alignItems: 'center' }}>
                  <AlertTriangle size={18} style={{ color: inc.severity === 'CRITICAL' ? '#e11d48' : '#f59e0b', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: '#f9fafb', fontSize: 14 }}>{inc.type}</div>
                    <div style={{ fontSize: 12, color: '#4b5563', marginTop: 2 }}>{inc.timestamp}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 20, background: inc.resolved ? 'rgba(34,197,94,0.1)' : 'rgba(225,29,72,0.1)', color: inc.resolved ? '#22c55e' : '#e11d48' }}>
                    {inc.resolved ? 'Resolved' : inc.severity}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* QUEUES detailed */}
          {activeSection === 'queues' && (
            <div>
              <h2 style={{ fontWeight: 900, fontSize: 18, color: '#f9fafb', marginBottom: 16 }}>Live Queue Monitor</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
                {queues.map(q => {
                  const fill = q.capacity ? Math.round((q.crowdCount || 0) / q.capacity * 100) : Math.round(q.currentWait / 0.3);
                  return (
                    <div key={q.id} style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 12, padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div style={{ fontWeight: 700, color: '#e5e7eb' }}>{q.location}</div>
                        <span style={{ color: waitColor(q.currentWait), fontWeight: 900, fontSize: 18 }}>
                          {q.currentWait === 0 ? '0m' : `${q.currentWait}m`}
                        </span>
                      </div>
                      <div style={{ background: '#1f2937', borderRadius: 6, height: 8 }}>
                        <div style={{ width: `${fill}%`, height: 8, borderRadius: 6, background: waitColor(q.currentWait), transition: 'width 0.5s' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: '#4b5563' }}>
                        <span>{q.crowdCount || '—'} people</span>
                        <span style={{ color: q.trend === 'rising' ? '#f87171' : q.trend === 'falling' ? '#4ade80' : '#f59e0b', fontWeight: 700 }}>
                          {q.trend === 'rising' ? '▲ Rising' : q.trend === 'falling' ? '▼ Clearing' : '● Steady'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ANALYTICS */}
          {activeSection === 'analytics' && (
            <div>
              <h2 style={{ fontWeight: 900, fontSize: 18, color: '#f9fafb', marginBottom: 16 }}>Analytics & Trends</h2>
              <AnalyticsPanel />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
