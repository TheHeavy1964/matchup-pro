# PLAN.md – Master Ledger

## 🗺️ Master Roadmap

### Milestone 1: Foundation & Dynamic Matching
- [x] Create Manifest V3 chrome extension core config.
- [x] Build team search and matchup lookup via CollegeFootballData API.
- [x] Integrate dynamic CFB and NFL tabs.
- [x] Add dynamic ESPN scoreboard fetching for featured matchups.

### Milestone 2: Monetization & Verification Backend
- [x] Create serverless Stripe verification handler (`api/verify-stripe.js`).
- [x] Route requests via `vercel.json` rewrites.
- [x] Secure Stripe secret key verification.
- [x] Gate Pro features ("Copy Script" & "Share Matchup Card") behind active status.

### Milestone 3: Access Control & Testing Overrides
- [x] Implement developer whitelisting (`derrick@innov8edge.sbs`, `test@test.com`) in options verification.
- [x] Add fallback checks for one-time/lifetime sessions.
- [x] Handle missing API endpoints/data gracefully with fallbacks.

### Milestone 4: Aesthetic Synchronization & Packaging
- [x] Align Options page (`options.html` / `styles.css`) styling with popup's premium glassmorphism theme.
- [x] Run end-to-end browser mock validation for Option page actions.
- [x] Package the extension as a clean zip file from the root folder.
- [x] Confirm Stripe webhook endpoints and complete deployment documentation.

### Milestone 5: Visual Matchup Comparison Gauges
- [x] Implement side-by-side stats comparison grids (Offense vs Defense) for CFB and NFL.
- [x] Build interactive progress bars/gauges to visually compare team rankings and statistics.
- [x] Add an AI Confidence meter or Win Probability dial.

### Milestone 6: Script Generator Upgrades & Script Tones
- [x] Implement a tone selector dropdown (e.g., "Broadcast Script", "Trash Talk", "Hot Take", "Hype").
- [x] Build dynamic copy templates matching the chosen tone using game stats.
- [x] Support copying or direct sharing of the generated text.

### Milestone 7: Visual Hype Card Export Themes (Pro)
- [x] Add style options to the matchup card (e.g., Classic Dark, Neon Cyberpunk, Gold VIP).
- [x] Include customizable labels (e.g., user's prediction score) dynamically rendered by html2canvas.
- [x] Add brand watermark options for podcaster/social media sharing.

### Milestone 8: Viral Social Loop
- [x] Build a "Share to X (Twitter)" button pre-populating game picks and download link.
- [x] Add a "Refer a Friend" promo widget offering premium feature tryouts.

### Milestone 9: Advanced Local Analytics & Sub-panels
- [x] Intercept dropdown clicks on the "Analytics" dropdown.
- [x] Embed detailed advanced box scores (Success Rates, Explosiveness, Havoc) from `/game/box/advanced`.
- [x] Render play-by-play win probability charts as responsive SVG curves from `/metrics/wp`.
- [x] Display multi-year SP+ team rating history trends from `/ratings/sp?team={team}`.
- [x] Sort and present player efficiency leaderboards (Average PPA) from `/ppa/players/season`.
- [x] Implement a CSV Data Exporter downloading seasonal SP+ team rankings.
- [x] Build an interactive normal distribution-based Situation Win Probability Calculator.

---

## 🚀 Current Trajectory
We have successfully implemented a fully contextual, premium advanced analytics dashboard directly inside the extension popup. Clicks on the top "Analytics" dropdown are intercepted and query live CFB APIs to render beautiful glassmorphic analytics sub-panels: Advanced Box Scores, SVG Win Probability flows, SP+ Team Trends, Player PPA Efficiency leaderboards, a downloadable CSV Data Exporter for SP+ rankings, and a situation-based live Win Probability Calculator using a CDF normal distribution approximation model.

---

## ✏️ Squad Status

| Agent | Task | Status |
| :--- | :--- | :--- |
| **Antigravity** | Implement contextual advanced analytics sub-panels, charts, and situation calculator in popup.js | 🟢 Completed |
