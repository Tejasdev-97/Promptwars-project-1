import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const apiKey = process.env.GOOGLE_TTS_KEY;
  if (!apiKey) return console.error("No key");
  
  try {
    const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text: "Hello world" },
        voice: { languageCode: 'en-US' },
        audioConfig: { audioEncoding: 'MP3' }
      })
    });
    const data = await response.json();
    console.log("TTS Response Code:", response.status, response.statusText);
    console.log("TTS Body:", JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.error(err);
  }
}

run();
