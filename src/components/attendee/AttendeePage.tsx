import { useState, useEffect, Component, ReactNode } from 'react';
import { Home, Map, Users, AlertTriangle, Moon, Sun, MessageSquare, Shield, Search, WifiOff } from 'lucide-react';
import { HomePage }       from './HomePage';
import { LiveMapPage }    from './LiveMapPage';
import { QueuesPage }     from './QueuesPage';
import { CrowdZoneMap }   from './CrowdZoneMap';
import { FacilityFinder } from './FacilityFinder';
import { ChatBot }        from './ChatBot';
import { EmergencyMode }  from './EmergencyMode';

// ── Types ─────────────────────────────────────────────────────────────────
export type Tab = 'home' | 'map' | 'queues' | 'crowd' | 'find';

// ── Dark Mode Hook ────────────────────────────────────────────────────────
const useDarkMode = () => {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('stadiumiq-dark');
    if (stored !== null) return stored === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('stadiumiq-dark', String(dark));
  }, [dark]);
  return [dark, setDark] as const;
};

// ── Error Boundary (catches render crashes) ───────────────────────────────
class ErrorBoundary extends Component<{ children: ReactNode; name: string }, { hasError: boolean; error?: Error }> {
  state = { hasError: false, error: undefined as Error | undefined };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error(`[ErrorBoundary:${this.props.name}]`, error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
          <WifiOff size={36} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
          <p style={{ fontWeight: 700, color: 'var(--text)' }}>Something went wrong loading {this.props.name}.</p>
          <button
            style={{ marginTop: 12, padding: '8px 20px', borderRadius: 20, background: 'var(--accent)', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer' }}
            onClick={() => this.setState({ hasError: false })}
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Navigation Items ──────────────────────────────────────────────────────
const NAV_ITEMS: { id: Tab; icon: typeof Home; label: string; ariaLabel: string }[] = [
  { id: 'home',   icon: Home,           label: 'Home',   ariaLabel: 'Home — Welcome and gate finder' },
  { id: 'crowd',  icon: Users,          label: 'Crowds', ariaLabel: 'Crowds — Live crowd density by zone' },
  { id: 'queues', icon: MessageSquare,  label: 'Queues', ariaLabel: 'Queues — Live wait times' },
  { id: 'find',   icon: Search,         label: 'Find',   ariaLabel: 'Find — Facilities, food, medical' },
  { id: 'map',    icon: Map,            label: 'Map',    ariaLabel: 'Map — Live satellite stadium map' },
];

// ── Main Component ────────────────────────────────────────────────────────
export const AttendeePage = () => {
  const [tab,       setTab]       = useState<Tab>('home');
  const [emergency, setEmergency] = useState(false);
  const [chatOpen,  setChatOpen]  = useState(false);
  const [dark,      setDark]      = useDarkMode();
  const [seatBlock, setSeatBlock] = useState('Block C, Row 12, Seat 45');
  const [lang,      setLang]      = useState('en-US');

  const userContext = { seatBlock, language: lang, location: { lat: 18.9388, lng: 72.8258 } };

  useEffect(() => { if (emergency) setChatOpen(false); }, [emergency]);

  // Keyboard navigation for tabs (Arrow keys)
  const handleNavKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    let next = currentIndex;
    if (e.key === 'ArrowRight') next = (currentIndex + 1) % NAV_ITEMS.length;
    else if (e.key === 'ArrowLeft') next = (currentIndex - 1 + NAV_ITEMS.length) % NAV_ITEMS.length;
    else return;
    e.preventDefault();
    setTab(NAV_ITEMS[next].id);
    (document.getElementById(`nav-tab-${NAV_ITEMS[next].id}`) as HTMLButtonElement)?.focus();
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text)', fontFamily: "'Inter', sans-serif" }}>

      {/* Accessibility: Skip to main content */}
      <a href="#main-content" className="skip-link">Skip to main content</a>

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <header
        role="banner"
        style={{ position: 'sticky', top: 0, zIndex: 30, background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} aria-label="StadiumIQ" role="img">
            <Shield size={20} style={{ color: 'var(--accent)' }} aria-hidden="true" />
            <span style={{ fontWeight: 900, fontSize: 20, letterSpacing: '-0.5px', color: 'var(--text)' }}>
              Stadium<span style={{ color: 'var(--accent)' }}>IQ</span>
            </span>
          </div>

          {/* Right controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} role="toolbar" aria-label="App controls">
            <button
              onClick={() => setDark(!dark)}
              aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              title={dark ? 'Light mode' : 'Dark mode'}
              style={{ padding: 8, borderRadius: 8, border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              {dark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
            </button>

            <button
              onClick={() => setChatOpen(c => !c)}
              aria-label={chatOpen ? 'Close AI assistant' : 'Open AI assistant chat'}
              aria-expanded={chatOpen}
              aria-controls="chatbot-panel"
              style={{ padding: 8, borderRadius: 8, border: 'none', background: 'transparent', color: 'var(--accent)', cursor: 'pointer' }}
            >
              <MessageSquare size={18} aria-hidden="true" />
            </button>

            <button
              onClick={() => { setEmergency(true); setChatOpen(false); }}
              aria-label="Activate emergency mode — find safest exit"
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20,
                background: 'var(--danger)', color: 'white', border: 'none', fontWeight: 800, fontSize: 12, cursor: 'pointer',
                animation: 'pulse-glow 2s infinite',
              }}
            >
              <AlertTriangle size={14} aria-hidden="true" />
              <span>EMERGENCY</span>
            </button>
          </div>
        </div>

        {/* Desktop-only Tab Navigation — hidden on mobile (bottom nav used instead) */}
        <nav
          role="tablist"
          aria-label="Stadium sections"
          className="hide-on-mobile"
          style={{ borderTop: '1px solid var(--border)', overflowX: 'auto' }}
        >
          {NAV_ITEMS.map((n, idx) => (
            <button
              key={n.id}
              id={`nav-tab-${n.id}`}
              role="tab"
              aria-selected={tab === n.id}
              aria-controls={`panel-${n.id}`}
              aria-label={n.ariaLabel}
              tabIndex={tab === n.id ? 0 : -1}
              onClick={() => setTab(n.id)}
              onKeyDown={(e) => handleNavKeyDown(e, idx)}
              style={{
                flex: 1, minWidth: 72, padding: '10px 8px', fontWeight: 700, fontSize: 12, cursor: 'pointer',
                border: 'none', borderBottom: tab === n.id ? '2px solid var(--accent)' : '2px solid transparent',
                background: 'transparent', color: tab === n.id ? 'var(--accent)' : 'var(--text-muted)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, transition: 'color 0.15s',
              }}
            >
              <n.icon size={16} aria-hidden="true" />
              <span>{n.label}</span>
            </button>
          ))}
        </nav>
      </header>

      {/* ── MAIN CONTENT ──────────────────────────────────────────────── */}
      <main
        id="main-content"
        tabIndex={-1}
        style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px', minHeight: 'calc(100vh - 120px)', paddingBottom: 100 }}
      >
        {/* aria-live region so screen readers announce tab changes */}
        <div aria-live="polite" aria-atomic="true" className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
          {NAV_ITEMS.find(n => n.id === tab)?.ariaLabel}
        </div>

        <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`nav-tab-${tab}`}>
          <ErrorBoundary name={tab}>
            {tab === 'home'   && <HomePage   seatBlock={seatBlock} setSeatBlock={setSeatBlock} lang={lang} setLang={setLang} setTab={setTab} />}
            {tab === 'map'    && <LiveMapPage />}
            {tab === 'queues' && <QueuesPage />}
            {tab === 'crowd'  && <CrowdZoneMap />}
            {tab === 'find'   && <FacilityFinder />}
          </ErrorBoundary>
        </div>
      </main>

      {/* ── MOBILE BOTTOM NAV (duplicate for thumbs) ──────────────────── */}
      <nav
        role="navigation"
        aria-label="Primary mobile navigation"
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 30,
          background: 'var(--bg-card)', borderTop: '1px solid var(--border)',
          boxShadow: '0 -2px 8px rgba(0,0,0,0.08)', display: 'flex',
        }}
        className="show-on-mobile"
      >
        {NAV_ITEMS.map(n => (
          <button
            key={n.id}
            onClick={() => setTab(n.id)}
            aria-label={n.ariaLabel}
            aria-current={tab === n.id ? 'page' : undefined}
            style={{
              flex: 1, padding: '8px 4px 14px', border: 'none', background: 'transparent',
              color: tab === n.id ? 'var(--accent)' : 'var(--text-muted)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              fontSize: 9, fontWeight: 800, cursor: 'pointer', transition: 'color 0.15s',
              borderTop: tab === n.id ? '2px solid var(--accent)' : '2px solid transparent',
            }}
          >
            <n.icon size={20} aria-hidden="true" />
            <span>{n.label.toUpperCase()}</span>
          </button>
        ))}
      </nav>

      {/* ── AI CHATBOT ──────────────────────────────────────────────────── */}
      <div id="chatbot-panel">
        <ChatBot
          open={chatOpen}
          onToggle={() => setChatOpen(c => !c)}
          userContext={userContext}
          lang={lang}
        />
      </div>

      {/* ── EMERGENCY MODE ──────────────────────────────────────────────── */}
      {emergency && (
        <ErrorBoundary name="Emergency Mode">
          <EmergencyMode
            userLocation={userContext.location}
            lang={lang}
            onClose={() => setEmergency(false)}
          />
        </ErrorBoundary>
      )}
    </div>
  );
};
