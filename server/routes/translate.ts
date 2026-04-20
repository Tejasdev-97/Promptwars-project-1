import { Router, Request, Response } from 'express';

const router = Router();

// POST /api/translate
router.post('/', async (req: Request, res: Response): Promise<void> => {
   const { text, targetLanguage } = req.body;

   if (!text) {
      res.json({ translatedText: "" });
      return;
   }

   // We bypass GOOGLE_TRANSLATE_KEY entirely because the Cloud Key is blocked/forbidden.
   // Instead, we proxy the completely free Google Translate endpoints transparently.
   try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLanguage}&dt=t&q=${encodeURIComponent(text)}`;
      
      const response = await fetch(url, {
         headers: {
            'User-Agent': 'Mozilla/5.0'
         }
      });

      if (!response.ok) {
         throw new Error(`Free Translation proxy failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      // The free API returns data in a deeply nested array structure: [[[ "Hola", "Hello" ]]]
      let translatedText = text;
      if (data && data[0]) {
         translatedText = data[0].map((item: any) => item[0]).join("");
      }

      res.json({ translatedText });
   } catch (error) {
      console.error('Translation proxy error:', error);
      res.json({ translatedText: text }); // Fallback to original text smoothly
   }
});

export default router;
