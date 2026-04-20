import { useState, useEffect } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../../services/firebaseService';
import { Clock, TrendingUp, TrendingDown, Minus, RefreshCw, Zap, Loader2 } from 'lucide-react';
import { predictQueueSpike } from '../../services/geminiService';

interface QueueData {
  id: string;
  location: string;
  currentWait: number;
  trend: 'rising' | 'falling' | 'steady';
  capacity?: number;
  crowdCount?: number;
}

const MOCK_QUEUES: QueueData[] = [
  { id: '1', location: 'Gate A — Main Entry', currentWait: 6,  trend: 'steady', capacity: 500, crowdCount: 180 },
  { id: '2', location: 'Level 1 Food Court',  currentWait: 18, trend: 'rising',  capacity: 200, crowdCount: 165 },
  { id: '3', location: 'Washroom Block B',    currentWait: 3,  trend: 'falling', capacity: 80,  crowdCount: 12  },
  { id: '4', location: 'Merchandise Store',   currentWait: 12, trend: 'rising',  capacity: 150, crowdCount: 110 },
  { id: '5', location: 'Medical Station',     currentWait: 0,  trend: 'steady',  capacity: 30,  crowdCount: 2   },
];

const TrendIcon = ({ trend }: { trend: string }) => {
  if (trend === 'rising')  return <TrendingUp   size={16} className="flex-shrink-0" style={{ color: 'var(--danger)'  }} />;
  if (trend === 'falling') return <TrendingDown  size={16} className="flex-shrink-0" style={{ color: 'var(--success)' }} />;
  return                          <Minus         size={16} className="flex-shrink-0" style={{ color: 'var(--warning)' }} />;
};

const WaitBadge = ({ mins }: { mins: number }) => {
  const color = mins === 0 ? '--success' : mins < 8 ? '--success' : mins < 16 ? '--warning' : '--danger';
  return (
    <span className="px-2.5 py-1 rounded-full text-xs font-black text-white flex items-center gap-1"
          style={{ background: `var(${color})` }}>
      <Clock size={11} />
      {mins === 0 ? 'No wait' : `${mins} min`}
    </span>
  );
};

export const QueuesPage = () => {
  const [queues, setQueues] = useState<QueueData[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingMock, setUsingMock] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');
  const [predictions, setPredictions] = useState<Record<string, any>>({});
  const [predicting, setPredicting] = useState<Record<string, boolean>>({});

  const handlePredict = async (q: QueueData) => {
    setPredicting(p => ({ ...p, [q.id]: true }));
    try {
      const res = await predictQueueSpike(q.location, 'current match status', q.currentWait);
      setPredictions(p => ({ ...p, [q.id]: res }));
    } catch (e) {
      console.error(e);
      setPredictions(p => ({ ...p, [q.id]: { predictedWait: 'N/A', reason: 'Error connecting to AI' } }));
    }
    setPredicting(p => ({ ...p, [q.id]: false }));
  };

  useEffect(() => {
    let hasData = false;
    const timeoutId = setTimeout(() => {
      if (!hasData) {
        setQueues(MOCK_QUEUES);
        setUsingMock(true);
        setLoading(false);
      }
    }, 1000);

    const q = query(collection(db, 'stadiums', 'wankhede_stadium', 'queues'));
    const unsub = onSnapshot(q, (snap) => {
      hasData = true;
      clearTimeout(timeoutId);
      if (snap.empty) {
        setQueues(MOCK_QUEUES);
        setUsingMock(true);
      } else {
        setQueues(snap.docs.map(d => ({ id: d.id, ...d.data() } as QueueData)));
        setUsingMock(false);
      }
      setLastUpdated(new Date().toLocaleTimeString('en-IN'));
      setLoading(false);
    }, (err) => {
      hasData = true;
      clearTimeout(timeoutId);
      console.error('Firestore error:', err);
      setQueues(MOCK_QUEUES);
      setUsingMock(true);
      setLoading(false);
    });
    return () => {
      clearTimeout(timeoutId);
      unsub();
    };
  }, []);

  if (loading) return (
    <div className="max-w-2xl mx-auto space-y-4 pb-24 md:pb-0">
      {[1,2,3].map(i => (
        <div key={i} className="card p-5 h-24 animate-pulse" style={{ background: 'var(--bg-subtle)' }} />
      ))}
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto pb-24 md:pb-0">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-app">Live Queue Times</h1>
          <p className="text-muted text-sm mt-1">Real-time wait estimates across the venue</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted">
          <RefreshCw size={12} className="spin" style={{ animationDuration: '3s' }} />
          {lastUpdated && `Updated ${lastUpdated}`}
        </div>
      </div>

      {usingMock && (
        <div className="mb-4 p-3 rounded-xl text-sm text-yellow-700 dark:text-yellow-300 border"
             style={{ background: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.3)' }}>
          📊 Showing estimated live data. Connect Firebase for real-time venue updates.
        </div>
      )}

      <div className="space-y-3">
        {queues.map(q => {
          const fillPct = q.capacity ? Math.min(100, Math.round((q.crowdCount || 0) / q.capacity * 100)) : 0;
          const fillColor = fillPct > 80 ? 'var(--danger)' : fillPct > 60 ? 'var(--warning)' : 'var(--success)';
          return (
            <div key={q.id} className="card p-4 slide-up">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-app truncate">{q.location}</h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <TrendIcon trend={q.trend} />
                    <span className="text-xs text-muted capitalize">{q.trend === 'rising' ? 'Getting busier' : q.trend === 'falling' ? 'Clearing up' : 'Steady'}</span>
                  </div>
                </div>
                <WaitBadge mins={q.currentWait} />
              </div>

              {q.capacity && (
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-muted mb-1">
                    <span>Crowd density</span>
                    <span>{fillPct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full w-full" style={{ background: 'var(--bg-subtle)' }}>
                    <div className="h-1.5 rounded-full transition-all duration-700"
                         style={{ width: `${fillPct}%`, background: fillColor }} />
                  </div>
                </div>
              )}

              {/* AI Prediction Section */}
              <div className="pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                {!predictions[q.id] ? (
                  <button
                    onClick={() => handlePredict(q)}
                    disabled={predicting[q.id]}
                    className="w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-opacity hover:opacity-80"
                    style={{ background: 'color-mix(in srgb, var(--accent) 10%, transparent)', color: 'var(--accent)' }}
                  >
                    {predicting[q.id] ? <Loader2 size={14} className="spin" /> : <Zap size={14} />}
                    {predicting[q.id] ? 'Analyzing queue data...' : 'Predict wait time in 10 mins'}
                  </button>
                ) : (
                  <div className="bg-subtle p-3 rounded-lg border" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-center gap-2 mb-1">
                      <Zap size={14} style={{ color: 'var(--accent)' }} />
                      <span className="font-bold text-sm text-app">
                        Predicted: {predictions[q.id].predictedWait} mins
                      </span>
                    </div>
                    <p className="text-xs text-muted leading-relaxed">
                      {predictions[q.id].reason}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
