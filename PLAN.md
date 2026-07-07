# Matchup Pro: Live Studio Mode Blueprint

## 🗺️ Master Roadmap

1. **Phase 1: Studio Mode UI & Vapi Prototyping**
   - Implement "Live Studio Mode" UI toggle to minimize menus and maximize focus.
   - Integrate the **Vapi Web SDK** for hands-free, push-to-talk microphone control.
   - Build the frontend event listeners to detect Vapi function calls and render mock "Stat Cards".
2. **Phase 2: Backend Tool Calling & Integration (FastAPI / Next.js)**
   - Set up backend API routes to serve as tools for the Vapi LLM.
   - Integrate **College Football Data (CFBD)** and **SportsDataIO** for advanced metrics (EPA, DVOA, CPOE).
   - Ensure the LLM parses natural language into strict JSON queries for these data sources.
3. **Phase 3: Multi-Modal Synchronization**
   - Sync the visual "Stat Cards" (React/Next.js UI) with the **ElevenLabs TTS** audio playback via Vapi.
   - Optimize the pipeline for sub-second latency.
   - Fine-tune the LLM prompts to ensure broadcast-friendly, concise audio responses.
4. **Phase 4: Advanced Broadcast Features**
   - Implement Custom Voice Profiles.
   - Integrate predictive live-odds features.

## 🚀 Current Trajectory

**Phase 2: Backend Tool Calling & Integration (Vercel API)**
Currently focusing on scaffolding the Vapi webhook endpoints (`api/vapi-tools.js`) to process tool calls (e.g. fetching advanced stats) triggered by the LLM.

## ✏️ Squad Status

| Agent | Task | Status |
| :--- | :--- | :--- |
| Antigravity | Scaffold Vapi tool call webhook endpoints | Complete |
| USER | Configure Vapi dashboard and schemas | Complete |
| Antigravity | Scaffold SportsDataIO (NFL) integration | In Progress |
