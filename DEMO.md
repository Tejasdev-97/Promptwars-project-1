# StadiumIQ DEMO Guide for Judges

Welcome to the StadiumIQ demo! This document outlines how to test the various AI-powered features built into the application.

### 1. Attendee App (Mobile View)
*Open the app and switch to mobile view (e.g. Chrome DevTools Responsive).*
* **Gate Recommender:** On the Home tab, look at the AI Gate Recommender. It hits the `/api/gemini/gate` endpoint which parses real-time Firebase density to suggest an entry point.
* **Emergency Mode:** Tap the persistent, pulsing "EMERGENCY" button in the top right. It evaluates the floor plan and triggers Gemini's safest route logic via `/api/gemini/emergency`, then generates multilingual Google TTS audio for guidance.
* **Queue Prediction:** Go to the "QUEUES" tab. Tap "Predict wait time in 10 mins" under any service point to trigger the AI predictive engine.
* **Smart Assistant:** Tap the Floating Chat Bubble. It holds the user's location context (e.g., "Block C") and live queue stats. Ask it: "Which is the fastest way to get food right now?"

### 2. Admin Dashboard (Desktop View)
*Navigate to `/admin` to open the Command Center.*
* **Live Crowd Heatmap:** The map visualizes crowd hotspots based on live Firebase Firestore syncs.
* **AI Rerouting Suggestions:** The Rerouting Engine periodically queries Gemini (`/api/gemini/reroute`) summarizing all current crowd datasets. It will evaluate congestion and suggest how staff should redirect traffic to ease bottlenecks.
* **Spike Demo:** Click the "TRIGGER HALFTIME (DEMO)" button on the bottom left of the sidebar. This simulates a mass exodus via a Firestore batch update. Watch the Queue Monitor turn Critical, and evaluate how the AI prediction engine adjusts!
* **Incidents & Analytics:** View real-time graphs rendered by Recharts syncing live metric data. Use this pane to monitor overall system stability.
