const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

export const translateText = async (text: string, targetLanguage: string): Promise<string> => {
   const res = await fetch(`${API_URL}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, targetLanguage })
   });
   const data = await res.json();
   return data.translatedText;
};
