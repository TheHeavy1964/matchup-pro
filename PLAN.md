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
**Phase 3: Multi-Modal Synchronization & Validation**
Successfully created and attached all 3 tools (CFB stats, NFL stats, Player injuries) to the Vapi assistant, resolved voice errors to enable publishing, wired up Google Fonts (Outfit), and implemented a live transcript/stat card display in popup.html.

## ✏️ Squad Status

| Agent | Task | Status |
| :--- | :--- | :--- |
| Antigravity | Build and attach Vapi tools via script | Complete |
| Antigravity | Add live transcripts & Outfit font to popup.html | Complete |
| USER | Publish assistant changes in Vapi dashboard | Pending |
| Antigravity | Verify end-to-end voice query pipeline | In Progress |

