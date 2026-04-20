import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageSquare, Send, X, Bot, User, Mic, Volume2, Loader2, Languages, Globe } from 'lucide-react';

interface Message { role: 'user' | 'bot'; text: string; time: string; }

interface Props {
  open: boolean;
  onToggle: () => void;
  userContext: { seatBlock: string; language: string; location: { lat: number; lng: number } };
  lang: string;
}

const API_BASE = '/api';

const timestamp = () => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

// Welcome messages in each supported language
const WELCOME: Record<string, string> = {
  'en-US': "Hi! I'm StadiumIQ, your AI companion 👋 Ask me anything — gate directions, food, washrooms, parking, or emergency exits!",
  'hi-IN': "नमस्ते! मैं StadiumIQ हूँ, आपका AI सहायक 👋 मुझसे कुछ भी पूछें — गेट, खाना, वॉशरूम, पार्किंग या एमर्जेंसी एग्जिट!",
  'mr-IN': "नमस्कार! मी StadiumIQ आहे, तुमचा AI सहाय्यक 👋 मला काहीही विचारा — गेट, जेवण, स्वच्छतागृह, पार्किंग किंवा आपत्कालीन निर्गमन!",
  'ta-IN': "வணக்கம்! நான் StadiumIQ, உங்கள் AI உதவியாளர் 👋 என்னிடம் எதுவும் கேளுங்கள் — வாயில், உணவு, கழிவறை, நிறுத்துமிடம் அல்லது அவசர வெளியேற்றம்!",
  'te-IN': "నమస్కారం! నేను StadiumIQ, మీ AI సహాయకుడు 👋 ఏదైనా అడగండి — గేట్, ఆహారం, వాష్‌రూమ్, పార్కింగ్ లేదా అత్యవసర నిర్గమనం!",
  'kn-IN': "ನಮಸ್ಕಾರ! ನಾನು StadiumIQ, ನಿಮ್ಮ AI ಸಹಾಯಕ 👋 ಏನಾದರೂ ಕೇಳಿ — ಗೇಟ್, ಆಹಾರ, ಶೌಚಾಲಯ, ಪಾರ್ಕಿಂಗ್ ಅಥವಾ ತುರ್ತು ನಿರ್ಗಮನ!",
};

// Quick replies in each language
const QUICK_REPLIES: Record<string, string[]> = {
  'en-US': ['Find my gate', 'Nearest food stall?', 'Queue wait times?', 'Emergency exit?'],
  'hi-IN': ['मेरा गेट खोजें', 'नज़दीकी खाना?', 'कितनी देर की कतार?', 'आपातकालीन निकास?'],
  'mr-IN': ['माझे गेट शोधा', 'जवळचे जेवण?', 'किती वेळ रांग?', 'आपत्कालीन निर्गमन?'],
  'ta-IN': ['என் வாயில் கண்டுபிடி', 'அருகிலுள்ள உணவு?', 'காத்திருப்பு நேரம்?', 'அவசர வெளியேற்றம்?'],
  'te-IN': ['నా గేట్ కనుగొనండి', 'సమీపంలో ఆహారం?', 'వేచి ఉండే సమయం?', 'అత్యవసర నిర్గమనం?'],
  'kn-IN': ['ನನ್ನ ಗೇಟ್ ಹುಡುಕಿ', 'ಹತ್ತಿರದ ಆಹಾರ?', 'ಕಾಯುವ ಸಮಯ?', 'ತುರ್ತು ನಿರ್ಗಮನ?'],
};

export const ChatBot = ({ open, onToggle, userContext, lang }: Props) => {
  const getWelcome = useCallback(() =>
    ({ role: 'bot' as const, text: WELCOME[lang] || WELCOME['en-US'], time: timestamp() }),
    [lang]
  );

  const [messages, setMessages] = useState<Message[]>([getWelcome()]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [translatingId, setTranslatingId] = useState<number | null>(null);
  const [currentLang, setCurrentLang] = useState(lang);

  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ── When language changes, reset the welcome message ──────────────────
  useEffect(() => {
    if (lang !== currentLang) {
      setCurrentLang(lang);
      setMessages([getWelcome()]);
      setInput('');
      setPlayingId(null);
    }
  }, [lang, currentLang, getWelcome]);

  // ── Auto-scroll and focus ─────────────────────────────────────────────
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (open) inputRef.current?.focus();
  }, [messages, open]);

  // ── Stop audio when chat closes ───────────────────────────────────────
  useEffect(() => {
    if (!open) {
      window.speechSynthesis.cancel();
      audioRef.current?.pause();
      setPlayingId(null);
    }
  }, [open]);

  // ── Send message ──────────────────────────────────────────────────────
  const send = async (overrideText?: string) => {
    const text = (overrideText || input).trim();
    if (!text || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text, time: timestamp() }]);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/gemini/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userMessage: text, userContext: { ...userContext, language: lang } })
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) throw new Error('QUOTA_EXCEEDED');
        throw new Error(`HTTP ${res.status}: ${data.error || 'Server error'}`);
      }

      setMessages(prev => [...prev, { role: 'bot', text: data.text || 'No response.', time: timestamp() }]);
    } catch (e: any) {
      let errText = '⚠️ Cannot reach the AI server. Is the backend running? Run: npm start';
      if (e.message === 'QUOTA_EXCEEDED') {
        errText = '⚠️ AI quota reached (15 req/min on free tier). Please wait 30 seconds and try again.';
      } else if (e.message?.includes('fetch')) {
        errText = '⚠️ Network error. Check your internet connection.';
      }
      setMessages(prev => [...prev, { role: 'bot', text: errText, time: timestamp() }]);
    }
    setLoading(false);
  };

  // ── Translate a specific message ──────────────────────────────────────
  const translateMessage = async (text: string, index: number) => {
    const targetLang = lang.substring(0, 2); // hi-IN → hi
    if (targetLang === 'en') return; // already english
    setTranslatingId(index);
    try {
      const res = await fetch(`${API_BASE}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, targetLanguage: targetLang })
      });
      const data = await res.json();
      setMessages(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], text: data.translatedText || text };
        return updated;
      });
    } catch {
      console.warn('Translation failed — keeping original text');
    }
    setTranslatingId(null);
  };

  // ── Voice input via SpeechRecognition API ─────────────────────────────
  const startListening = () => {
    const SR = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert('Voice input requires Google Chrome. Please open in Chrome and try again.');
      return;
    }
    if (isListening) return;

    const recognition = new SR();
    recognition.lang = lang;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let session = input;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (e: any) => {
      setIsListening(false);
      if (e.error === 'not-allowed') alert('Microphone access blocked. Click the 🔒 icon in your browser address bar and allow the mic.');
    };
    recognition.onresult = (event: any) => {
      let interim = '', final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript;
        else interim += event.results[i][0].transcript;
      }
      if (final) session = (session ? session + ' ' : '') + final;
      setInput((session + (interim ? ' ' + interim : '')).trim());
    };
    try { recognition.start(); } catch { /* already started */ }
  };

  // ── TTS: use backend /api/tts/speak (real Google Cloud TTS key) ───────
  //    Falls back to Web Speech API if backend fails
  const playTTS = async (text: string, index: number) => {
    // Toggle off if same message is already playing
    if (playingId === index) {
      window.speechSynthesis.cancel();
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }

    // Stop any existing audio
    window.speechSynthesis.cancel();
    audioRef.current?.pause();
    setPlayingId(index);

    const truncated = text.length > 300 ? text.substring(0, 297) + '...' : text;

    // ── Try 1: Backend Google Cloud TTS (real API key) ──────────────────
    try {
      const res = await fetch(`${API_BASE}/tts/speak`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: truncated, languageCode: lang })
      });
      const data = await res.json();

      if (res.ok && data.audioContent) {
        const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`);
        audioRef.current = audio;
        audio.onended = () => setPlayingId(null);
        audio.onerror = () => fallbackToWebSpeech(truncated, index);
        await audio.play();
        return;
      }
    } catch {
      // Backend TTS failed — fall through to Web Speech API
    }

    // ── Try 2: Browser Web Speech API (works offline, no key needed) ────
    fallbackToWebSpeech(truncated, index);
  };

  const fallbackToWebSpeech = (text: string, index: number) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;

    // Pick the best matching voice for the language
    const voices = window.speechSynthesis.getVoices();
    const prefix = lang.substring(0, 2).toLowerCase();
    const bestVoice = voices.find(v => v.lang === lang)
      || voices.find(v => v.lang.toLowerCase().startsWith(prefix))
      || voices.find(v => v.name.toLowerCase().includes(prefix));
    if (bestVoice) utterance.voice = bestVoice;

    utterance.onend = () => setPlayingId(null);
    utterance.onerror = () => setPlayingId(null);
    window.speechSynthesis.speak(utterance);
  };

  const quickReplies = QUICK_REPLIES[lang] || QUICK_REPLIES['en-US'];
  const langLabel = { 'en-US': 'EN', 'hi-IN': 'HI', 'mr-IN': 'MR', 'ta-IN': 'TA', 'te-IN': 'TE', 'kn-IN': 'KN' }[lang] || 'EN';

  return (
    <>
      {/* ── Floating Toggle Button ─────────────────────────────────── */}
      {!open && (
        <button
          onClick={onToggle}
          aria-label="Open AI chat assistant"
          className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 p-4 rounded-full text-white shadow-app-lg transition-transform hover:scale-105 active:scale-95"
          style={{ background: 'var(--accent)' }}
        >
          <MessageSquare size={22} aria-hidden="true" />
        </button>
      )}

      {/* ── Chat Panel ─────────────────────────────────────────────── */}
      {open && (
        <div
          id="chatbot-inner-panel"
          role="dialog"
          aria-modal="true"
          aria-label="StadiumIQ AI Chat"
          className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 w-[calc(100vw-2rem)] max-w-sm h-[72vh] max-h-[540px] card flex flex-col shadow-app-lg slide-up overflow-hidden"
          style={{ borderRadius: '1.25rem' }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-app flex-shrink-0"
            style={{ background: 'var(--accent)' }}>
            <div className="bg-white/20 rounded-full p-1.5" aria-hidden="true">
              <Bot size={18} className="text-white" />
            </div>
            <div className="flex-1">
              <div className="font-black text-white text-sm">StadiumIQ AI</div>
              <div className="text-white/70 text-xs flex items-center gap-1">
                <Globe size={10} aria-hidden="true" /> Responding in {lang.split('-')[0].toUpperCase()} · Voice Enabled
              </div>
            </div>
            {/* Language indicator */}
            <div className="bg-white/20 text-white text-xs font-black px-2 py-0.5 rounded-full" aria-label={`Current language: ${langLabel}`}>
              {langLabel}
            </div>
            <button
              onClick={onToggle}
              aria-label="Close chat"
              className="text-white/70 hover:text-white transition-colors ml-1"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>

          {/* Messages */}
          <div
            className="flex-1 overflow-y-auto p-4 space-y-3 bg-subtle"
            role="log"
            aria-label="Chat messages"
            aria-live="polite"
          >
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center mt-1"
                  style={{ background: m.role === 'user' ? 'var(--accent)' : 'var(--bg-card)', border: '1px solid var(--border)' }}
                  aria-hidden="true">
                  {m.role === 'user' ? <User size={14} className="text-white" /> : <Bot size={14} style={{ color: 'var(--accent)' }} />}
                </div>
                <div className="max-w-[80%]">
                  <div
                    className={`px-3 py-2 rounded-2xl text-sm leading-relaxed relative ${m.role === 'user' ? 'rounded-tr-sm text-white' : 'bg-card rounded-tl-sm text-app border border-app'}`}
                    style={m.role === 'user' ? { background: 'var(--accent)' } : { paddingRight: '52px' }}
                  >
                    <span className="block break-words">{m.text}</span>

                    {/* Bot action buttons */}
                    {m.role === 'bot' && (
                      <div className="absolute right-1 top-1.5 flex flex-col gap-1">
                        <button
                          onClick={() => playTTS(m.text, i)}
                          aria-label={playingId === i ? 'Stop audio' : 'Read message aloud'}
                          title={playingId === i ? 'Stop' : 'Listen'}
                          className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition bg-card/50"
                        >
                          {playingId === i
                            ? <Loader2 size={13} className="spin" style={{ color: 'var(--accent)' }} />
                            : <Volume2 size={13} className="text-muted" />
                          }
                        </button>
                        <button
                          onClick={() => translateMessage(m.text, i)}
                          aria-label={`Translate to ${lang.split('-')[0]}`}
                          title="Translate message"
                          className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition bg-card/50"
                          disabled={lang.startsWith('en')}
                          style={{ opacity: lang.startsWith('en') ? 0.35 : 1 }}
                        >
                          {translatingId === i
                            ? <Loader2 size={13} className="spin" style={{ color: 'var(--accent)' }} />
                            : <Languages size={13} className="text-muted" />
                          }
                        </button>
                      </div>
                    )}
                  </div>
                  <div className={`text-[10px] text-muted mt-1 ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                    {m.time}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="flex gap-2" aria-label="AI is thinking">
                <div className="w-7 h-7 rounded-full bg-card border border-app flex items-center justify-center" aria-hidden="true">
                  <Bot size={14} style={{ color: 'var(--accent)' }} />
                </div>
                <div className="bg-card border border-app px-4 py-3 rounded-2xl rounded-tl-sm">
                  <div className="flex gap-1" aria-hidden="true">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-2 h-2 rounded-full"
                        style={{ background: 'var(--accent)', animation: `dot-bounce 1.2s ease ${i * 0.2}s infinite` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Quick replies — shown only when fresh chat */}
          {messages.length <= 1 && !loading && (
            <div className="px-4 py-2 border-t border-app bg-card flex flex-wrap gap-1.5 flex-shrink-0">
              {quickReplies.map(q => (
                <button key={q}
                  onClick={() => send(q)}
                  aria-label={`Quick reply: ${q}`}
                  className="text-xs px-3 py-1.5 rounded-full font-semibold border transition-colors hover:opacity-80"
                  style={{ borderColor: 'var(--accent)', color: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 8%, transparent)' }}
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input row */}
          <div className="px-3 py-3 border-t border-app bg-card flex gap-2 items-center flex-shrink-0">
            <button
              onClick={startListening}
              aria-label={isListening ? 'Stop listening' : `Voice input (${lang})`}
              title={isListening ? 'Listening...' : 'Speak your question'}
              className={`p-2.5 rounded-full transition ${isListening ? 'bg-red-500 text-white shadow-lg animate-pulse' : 'bg-subtle text-muted hover:text-app'}`}
            >
              {isListening ? <Loader2 size={18} className="spin" aria-hidden="true" /> : <Mic size={18} aria-hidden="true" />}
            </button>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder={isListening ? '🎤 Listening...' : 'Ask anything...'}
              aria-label="Type your question"
              className="flex-1 px-3 py-2 text-sm rounded-xl text-app focus:outline-none bg-transparent"
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              aria-label="Send message"
              className="btn-accent px-3 py-2.5 rounded-xl"
            >
              <Send size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
