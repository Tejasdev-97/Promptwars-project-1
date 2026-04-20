import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

const ttsSchema = z.object({
  text:         z.string().min(1).max(500),
  languageCode: z.string().default('en-US'),
});

// POST /api/tts/speak
router.post('/speak', async (req: Request, res: Response): Promise<void> => {
  const parsed = ttsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }

  const { text, languageCode } = parsed.data;

  // ── Try Google Cloud Text-to-Speech API (uses GOOGLE_TTS_KEY) ──────────
  if (process.env.GOOGLE_TTS_KEY) {
    try {
      const response = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${process.env.GOOGLE_TTS_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input: { text },
            voice: {
              languageCode,
              // Use standard voice — works for all supported Indian languages
              ssmlGender: 'FEMALE',
            },
            audioConfig: {
              audioEncoding: 'MP3',
              speakingRate: 1.0,
              pitch: 0,
            },
          }),
          signal: AbortSignal.timeout(8000),
        }
      );

      const data = await response.json() as { audioContent?: string; error?: { message: string } };

      if (!response.ok) {
        // Log the actual API error for debugging
        console.error('[TTS API Error]', data?.error?.message || response.status);
        throw new Error(data?.error?.message || `TTS HTTP ${response.status}`);
      }

      if (!data.audioContent) throw new Error('No audio content returned from Google TTS');

      res.json({ audioContent: data.audioContent });
      return;
    } catch (error: any) {
      console.error('[TTS] Google Cloud TTS failed:', error?.message?.slice(0, 100));
      // Fall through to empty response — frontend will use Web Speech API fallback
    }
  } else {
    console.warn('[TTS] GOOGLE_TTS_KEY not set — frontend will use browser speech synthesis');
  }

  // ── Graceful fallback: return empty audioContent ──────────────────────
  // The ChatBot frontend will automatically use the browser's Web Speech API
  res.json({ audioContent: '' });
});

export default router;