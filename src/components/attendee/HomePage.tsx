import { useState } from 'react';
import { Navigation, Loader2, MapPin, Clock, Zap } from 'lucide-react';
import { getOptimalGate } from '../../services/geminiService';

interface Props {
  seatBlock: string;
  setSeatBlock: (v: string) => void;
  lang: string;
  setLang: (v: string) => void;
  setTab: (t: 'home' | 'map' | 'queues' | 'crowd' | 'find') => void;
}

const LANGUAGES = [
  { code: 'en-US', label: 'English' },
  { code: 'hi-IN', label: 'हिंदी' },
  { code: 'mr-IN', label: 'मराठी' },
  { code: 'ta-IN', label: 'தமிழ்' },
  { code: 'te-IN', label: 'తెలుగు' },
  { code: 'kn-IN', label: 'ಕನ್ನಡ' },
];

export const HomePage = ({ seatBlock, setSeatBlock, lang, setLang, setTab }: Props) => {
  const [gate, setGate] = useState<{ gate: string; reasoning: string; estimatedWalkMin?: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [inputSeat, setInputSeat] = useState(seatBlock);

  const findGate = async () => {
    setLoading(true);
    setError('');
    setGate(null);
    try {
      const result = await getOptimalGate(inputSeat, []);
      setSeatBlock(inputSeat);
      setGate(result);
    } catch (e: any) {
      setError('Could not reach AI server. Please make sure the backend is running.');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-24 md:pb-0">
      {/* Welcome banner */}
      <div className="card p-6 slide-up" style={{ borderLeft: '4px solid var(--accent)' }}>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-black text-app mb-1">Welcome to StadiumIQ 👋</h1>
            <p className="text-muted text-sm">Your AI-powered stadium companion</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1.5 text-warning font-bold text-sm">
              <Clock size={14} /> Match in 2h 45m
            </div>
          </div>
        </div>

        {/* Live status pills */}
        <div className="flex flex-wrap gap-2 mt-4">
          {[
            { label: 'Gate A Open', color: '--success' },
            { label: 'Food: 8 min wait', color: '--warning' },
            { label: 'Parking 60% full', color: '--accent' },
          ].map(s => (
            <span key={s.label} className="px-3 py-1 rounded-full text-xs font-bold text-white"
              style={{ background: `var(${s.color})` }}>
              {s.label}
            </span>
          ))}
        </div>
      </div>

      {/* Smart Gate Finder */}
      <div className="card p-6 slide-up">
        <div className="flex items-center gap-2 mb-4">
          <MapPin size={20} style={{ color: 'var(--accent)' }} />
          <h2 className="text-lg font-black text-app">Smart Gate Finder</h2>
        </div>
        <p className="text-muted text-sm mb-4">Enter your seat details and AI will find the fastest route.</p>

        <div className="flex gap-2">
          <input
            type="text"
            value={inputSeat}
            onChange={e => setInputSeat(e.target.value)}
            placeholder="e.g. Block C Row 12 Seat 45"
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-app bg-subtle text-app focus:outline-none"
            style={{ border: '1.5px solid var(--border)' }}
            onKeyDown={e => e.key === 'Enter' && findGate()}
          />
          <button
            onClick={findGate}
            disabled={loading || !inputSeat.trim()}
            className="btn-accent px-5"
          >
            {loading ? <Loader2 size={18} className="spin" /> : <Navigation size={18} />}
            {loading ? 'Finding...' : 'Find Gate'}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl text-sm font-medium text-red-600 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
            ⚠️ {error}
          </div>
        )}

        {gate && (
          <div className="mt-4 p-4 rounded-xl slide-up" style={{ background: 'color-mix(in srgb, var(--accent) 8%, var(--bg-card))', border: '1.5px solid color-mix(in srgb, var(--accent) 30%, transparent)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Zap size={18} style={{ color: 'var(--accent)' }} />
              <span className="font-black text-app">Recommended: {gate.gate}</span>
              {gate.estimatedWalkMin && (
                <span className="ml-auto text-xs font-bold text-muted bg-subtle px-2 py-0.5 rounded-full">
                  ~{gate.estimatedWalkMin} min walk
                </span>
              )}
            </div>
            <p className="text-sm text-muted leading-relaxed">{gate.reasoning}</p>
            <button onClick={findGate} className="mt-3 text-xs font-bold text-accent hover:opacity-70 transition-opacity">
              Re-evaluate →
            </button>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="card p-6 slide-up">
        <h2 className="text-lg font-black text-app mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: '🍔', label: 'Find Food', hint: 'Nearest stalls' },
            { icon: '🚻', label: 'Washrooms', hint: 'No-queue facilities' },
            { icon: '🅿️', label: 'Parking', hint: 'Live availability' },
            { icon: '🏥', label: 'Medical Aid', hint: 'Nearest first-aid' },
          ].map(a => (
            <button
              key={a.label}
              className="p-4 rounded-xl card text-left transition-all hover:shadow-app-lg active:scale-95"
              onClick={() => setTab('find')}
            >
              <div className="text-2xl mb-1">{a.icon}</div>
              <div className="font-bold text-sm text-app">{a.label}</div>
              <div className="text-xs text-muted">{a.hint}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Language & Accessibility */}
      <div className="card p-6 slide-up">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-black text-app">Language & Accessibility</h2>
            <p className="text-xs text-muted mt-1">AI responds, voice plays & chatbot speaks in your chosen language</p>
          </div>
          <span className="text-xs font-bold px-2 py-1 rounded-full"
            style={{ background: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)' }}>
            Active: {LANGUAGES.find(l => l.code === lang)?.label || 'English'}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map(l => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              aria-label={`Switch language to ${l.label}`}
              aria-pressed={lang === l.code}
              className="px-4 py-2 rounded-full text-sm font-semibold border transition-all active:scale-95"
              style={{
                background:   lang === l.code ? 'var(--accent)' : 'var(--bg-subtle)',
                color:        lang === l.code ? 'white' : 'var(--text)',
                borderColor:  lang === l.code ? 'var(--accent)' : 'var(--border)',
                boxShadow:    lang === l.code ? '0 0 0 3px color-mix(in srgb, var(--accent) 25%, transparent)' : 'none',
                fontWeight:   lang === l.code ? 900 : 600,
              }}
            >
              {lang === l.code ? '✓ ' : ''}{l.label}
            </button>
          ))}
        </div>
        <div className="mt-4 p-3 rounded-xl text-xs" style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
          <strong style={{ color: 'var(--text)' }}>What this changes:</strong>
          <ul style={{ marginTop: 4, paddingLeft: 16, lineHeight: 1.8 }}>
            <li>🤖 AI chatbot replies in your language</li>
            <li>🎤 Microphone listens in your language</li>
            <li>🔊 Voice playback uses your language</li>
            <li>🌐 Translate button translates messages to your language</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
