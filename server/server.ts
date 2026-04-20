import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

import healthRouter    from './routes/health.ts';
import geminiRouter    from './routes/gemini.ts';
import ttsRouter       from './routes/tts.ts';
import translateRouter from './routes/translate.ts';
import placesRouter    from './routes/places.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app  = express();
const PORT = process.env.PORT || 8080;

// ── Security headers ──────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow fonts/images in dev
  contentSecurityPolicy: false,                           // Vite handles CSP in dev
}));

// ── CORS ──────────────────────────────────────────────────────────────────
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean)
  : ['http://localhost:5173', 'http://127.0.0.1:5173'];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    if (process.env.NODE_ENV !== 'production')       return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Body parsing ──────────────────────────────────────────────────────────
app.use(express.json({ limit: '50kb' })); // tight limit to block payload attacks

// ── Global API rate limiter ───────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please wait a moment before trying again.' },
});

// Stricter limiter for expensive AI endpoints
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'AI rate limit reached. Free tier allows 20 AI requests per minute.' },
});

// ── Request logging (dev only) ────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.use('/api', (req, _res, next) => {
    console.log(`[API] ${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
  });
}

// ── Routes ────────────────────────────────────────────────────────────────
app.use('/health',          healthRouter);
app.use('/api',             apiLimiter);
app.use('/api/gemini',      aiLimiter, geminiRouter);
app.use('/api/tts',         aiLimiter, ttsRouter);
app.use('/api/translate',   translateRouter);
app.use('/api/places',      placesRouter);

// ── Serve built frontend (production) ────────────────────────────────────
const clientBuildPath = path.join(__dirname, '../dist');
app.use(express.static(clientBuildPath, { maxAge: '1h' }));
app.get(/.*/, (_req, res) => {
  const indexPath = path.join(clientBuildPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(200).send('StadiumIQ API running. Serve frontend via "npm run dev".');
    }
  });
});

// ── Start ─────────────────────────────────────────────────────────────────
const server = app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`\n🚀 StadiumIQ API Server → http://localhost:${PORT}`);
  console.log(`   ENV:              ${process.env.NODE_ENV || 'development'}`);
  console.log(`   GEMINI_API_KEY:   ${process.env.GEMINI_API_KEY       ? '✅' : '❌ missing'}`);
  console.log(`   GOOGLE_TTS_KEY:   ${process.env.GOOGLE_TTS_KEY       ? '✅' : '❌ missing'}`);
  console.log(`   GOOGLE_TRANSLATE: ${process.env.GOOGLE_TRANSLATE_KEY ? '✅' : '❌ missing'}`);
  console.log(`   GOOGLE_MAPS_KEY:  ${process.env.GOOGLE_MAPS_KEY      ? '✅' : '❌ missing'}\n`);
});

// Keep the process alive — needed in ESM/tsx mode where event loop can drain
server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Port ${PORT} is already in use. Kill the other process first:\n   Run: npx kill-port ${PORT}\n`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
  }
});

process.on('SIGINT',  () => { console.log('\n👋 Shutting down...'); server.close(); process.exit(0); });
process.on('SIGTERM', () => { server.close(); process.exit(0); });
