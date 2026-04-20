const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

export const speakText = async (text: string, languageCode: string): Promise<string> => {
   const res = await fetch(`${API_URL}/tts/speak`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, languageCode })
   });
   const data = await res.json();
   return data.audioContent; // Returns base64 encoded audio
};

export const playAudio = (base64Audio: string) => {
   if (!base64Audio) return;
   const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`);
   audio.play();
};
