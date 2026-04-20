import { useState, useEffect } from 'react';
import { AlertOctagon, MapPin, Loader2, Volume2, X, Phone, Shield, ArrowRight } from 'lucide-react';

const API_BASE = '/api'; // Always relative — Vite proxy in dev, same-origin in prod

interface Props {
  userLocation?: { lat: number; lng: number };
  lang: string;
  onClose: () => void;
}

interface ExitResult {
  exit: string;
  route: string;
  instructionText: string;
}

// Static emergency contacts always visible
const EMERGENCY_CONTACTS = [
  { label: 'Police',      number: '100',  icon: '🚔' },
  { label: 'Ambulance',   number: '108',  icon: '🚑' },
  { label: 'Fire',        number: '101',  icon: '🚒' },
  { label: 'Stadium Control', number: '1800-STADIUM', icon: '📡' },
];

// Offline fallback routes (used if AI or network fails)
const OFFLINE_FALLBACK: ExitResult = {
  exit: 'Gate C — South Emergency Exit',
  route: 'Turn left → Pass Washroom Block B → Take staircase DOWN → Follow GREEN EXIT signs → Gate C',
  instructionText: 'Please remain calm. Proceed to Gate C, the south emergency exit. Turn left, walk past Washroom Block B, go down the staircase, and follow the green signs.',
};

export const EmergencyMode = ({ userLocation, lang, onClose }: Props) => {
  const [result,  setResult]  = useState<ExitResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [spoke,   setSpoke]   = useState(false);

  // Auto-trigger exit finder on mount
  useEffect(() => { findExit(); }, []);

  const findExit = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch(`${API_BASE}/gemini/emergency`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          userLocation: userLocation || { lat: 18.9388, lng: 72.8258 },
          crowdData: [],
        }),
      });

      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data: ExitResult = await res.json();
      setResult(data);
      speakResult(data.instructionText);

    } catch (e: any) {
      console.warn('[Emergency] AI failed, using offline fallback:', e.message);
      setError('AI offline — showing pre-set safe route.');
      setResult(OFFLINE_FALLBACK);
      speakResult(OFFLINE_FALLBACK.instructionText);
    }

    setLoading(false);
  };

  // Speak the exit instruction using TTS backend → fallback to Web Speech
  const speakResult = async (text: string) => {
    setSpoke(false);
    try {
      const res = await fetch(`${API_BASE}/tts/speak`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ text, languageCode: lang }),
      });
      const data = await res.json();
      if (data.audioContent) {
        const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`);
        audio.play().catch(() => fallbackSpeak(text));
        setSpoke(true);
        return;
      }
    } catch { /* fall through */ }
    fallbackSpeak(text);
  };

  const fallbackSpeak = (text: string) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang   = lang;
    u.rate   = 0.9;
    u.volume = 1;
    window.speechSynthesis.speak(u);
    setSpoke(true);
  };

  const replayVoice = () => result && speakResult(result.instructionText);

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label="Emergency Mode — Find Safest Exit"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 overflow-y-auto"
      style={{ background: 'rgba(156, 0, 30, 0.97)', backdropFilter: 'blur(10px)' }}
    >
      {/* Close */}
      <button onClick={() => { window.speechSynthesis.cancel(); onClose(); }}
        aria-label="Close emergency mode"
        style={{ position: 'absolute', top: 16, right: 16, color: 'rgba(255,255,255,0.6)', background: 'none', border: 'none', cursor: 'pointer' }}>
        <X size={28} />
      </button>

      {/* Pulsing icon */}
      <div style={{
        width: 96, height: 96, borderRadius: '50%', background: 'rgba(255,255,255,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
        animation: 'pulse-glow 1.5s infinite', boxShadow: '0 0 0 0 rgba(255,255,255,0.4)',
      }}>
        <AlertOctagon size={50} color="white" />
      </div>

      <h1 style={{ fontSize: 36, fontWeight: 900, color: 'white', margin: '0 0 8px', letterSpacing: '-1px' }}>
        EMERGENCY MODE
      </h1>
      <p style={{ color: 'rgba(255,200,200,0.9)', textAlign: 'center', marginBottom: 24, maxWidth: 300, fontSize: 14 }}>
        Stay calm. AI is finding your safest exit route right now.
      </p>

      {/* ── Loading state ── */}
      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'white', fontSize: 18, fontWeight: 700 }}>
          <Loader2 size={28} style={{ animation: 'spin 0.8s linear infinite' }} />
          ANALYZING SAFEST ROUTE...
        </div>
      )}

      {/* ── Error notice (still shows result) ── */}
      {error && (
        <p style={{ color: 'rgba(255,180,180,0.9)', fontSize: 12, marginBottom: 12, textAlign: 'center' }}>
          ⚠️ {error}
        </p>
      )}

      {/* ── Exit Result Card ── */}
      {result && !loading && (
        <div style={{
          width: '100%', maxWidth: 380, background: 'rgba(255,255,255,0.12)',
          border: '1.5px solid rgba(255,255,255,0.25)', borderRadius: 20,
          padding: 24, textAlign: 'center', marginBottom: 20,
          animation: 'slide-up 0.3s ease',
        }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, color: 'rgba(255,200,200,0.8)', textTransform: 'uppercase', marginBottom: 8 }}>
            Proceed Immediately To
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
            <MapPin size={24} />
            {result.exit}
          </div>

          {/* Step-by-step route */}
          <div style={{ textAlign: 'left', marginBottom: 16 }}>
            {result.route.split('→').map((step, i, arr) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                <div style={{
                  minWidth: 24, height: 24, borderRadius: '50%', background: 'rgba(255,255,255,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 900, color: 'white', flexShrink: 0,
                }}>
                  {i + 1}
                </div>
                <span style={{ color: 'rgba(255,220,220,0.95)', fontSize: 13, lineHeight: 1.5 }}>
                  {step.trim()}
                  {i < arr.length - 1 && <ArrowRight size={12} style={{ display: 'inline', marginLeft: 4, opacity: 0.5 }} />}
                </span>
              </div>
            ))}
          </div>

          {/* Voice replay */}
          <button onClick={replayVoice}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, margin: '0 auto',
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 20, padding: '8px 18px', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            }}>
            <Volume2 size={16} />
            {spoke ? 'Replay Voice Guidance' : 'Play Voice Guidance'}
          </button>
        </div>
      )}

      {/* ── Emergency Contacts ── */}
      <div style={{ width: '100%', maxWidth: 380, marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, color: 'rgba(255,200,200,0.7)', textTransform: 'uppercase', marginBottom: 10, textAlign: 'center' }}>
          Emergency Contacts
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {EMERGENCY_CONTACTS.map(c => (
            <a key={c.label} href={`tel:${c.number}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 12, textDecoration: 'none', color: 'white',
              }}>
              <span style={{ fontSize: 20 }}>{c.icon}</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800 }}>{c.label}</div>
                <div style={{ fontSize: 13, fontWeight: 900, color: 'rgba(255,220,220,0.9)' }}>
                  <Phone size={10} style={{ display: 'inline', marginRight: 3 }} />{c.number}
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Stadium safety note */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,200,200,0.7)', fontSize: 12, marginBottom: 20 }}>
        <Shield size={14} />
        <span>Stadium security has been notified of your emergency</span>
      </div>

      {/* Cancel */}
      <button onClick={() => { window.speechSynthesis.cancel(); onClose(); }}
        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}>
        Cancel Emergency Mode
      </button>
    </div>
  );
};
