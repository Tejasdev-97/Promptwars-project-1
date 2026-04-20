# StadiumIQ

An AI-Powered Smart Stadium Companion designed for large Indian sporting venues like IPL cricket stadiums.

## Overview
StadiumIQ is a Progressive Web App (PWA) with a React 18 + Vite frontend and an Express + Node.js backend. It leverages Google Gemini AI for crowd rerouting, queue prediction, emergency mode routing, and text-to-speech.

## Tech Stack
- Frontend: React 18, Vite, Tailwind CSS v4, Lucide React
- Backend: Node.js, Express, tsup
- AI: Google Gemini 1.5 Flash
- Services: Firestore, Google Maps API, Google Cloud Text-to-Speech

## Getting Started

1. Set up your `.env` file based on `.env.example`. You will need Google Maps, Gemini, and Google Cloud credentials.
2. If you would like to run the demo test schema, provide `serviceAccountKey.json` from your Firebase project.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Seed demo data to Firestore (Optional):
   ```bash
   npx ts-node server/scripts/seed.ts
   ```
5. Run locally:
   ```bash
   npm run build:server
   npm run dev
   npm run dev:server
   ```
*(You can execute `node dist/server/server.js` directly to test the backend API).*

## Deployment

A single multi-staged `Dockerfile` is provided. The frontend is built and served via Express on port `8080`.

```bash
docker build -t stadiumiq .
docker run -p 8080:8080 stadiumiq
```
