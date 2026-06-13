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
- [ ] Add style options to the matchup card (e.g., Classic Dark, Neon Cyberpunk, Gold VIP).
- [ ] Include customizable labels (e.g., user's prediction score) dynamically rendered by html2canvas.
- [ ] Add brand watermark options for podcaster/social media sharing.

### Milestone 8: Viral Social Loop
- [x] Build a "Share to X (Twitter)" button pre-populating game picks and download link.
- [ ] Add a "Refer a Friend" promo widget offering premium feature tryouts.

---

## 🚀 Current Trajectory
We have successfully resolved options storage persistence across tabs using localStorage, added the glassmorphic live-stream/podcast analytics dropdown navigation menu, and verified the application's clean, error-free load in local browser environment tests.

---

## ✏️ Squad Status

| Agent | Task | Status |
| :--- | :--- | :--- |
| **Antigravity** | Verify premium visual dashboards and viral templates in Chrome Extension interface | 🟢 Completed |
