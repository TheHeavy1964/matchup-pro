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
- [x] Embed detailed advanced box scores (Success Rates, Explosiveness, Havoc) from `/game/box/advanced` for CFB, and team statistics from `/summary?event={id}` for NFL.
- [x] Render play-by-play win probability charts as responsive SVG curves from `/metrics/wp` for CFB, and `/summary?event={id}` for NFL.
- [x] Display multi-year SP+ team rating history trends from `/ratings/sp?team={team}`.
- [x] Sort and present player efficiency/performance leaderboards from `/ppa/players/season` (CFB) and game leaders (NFL).
- [x] Implement a CSV Data Exporter downloading seasonal SP+ team rankings.
- [x] Build an interactive normal distribution-based Situation Win Probability Calculator.
- [x] Integrate "Team Metrics Explorer" in-app (using `/stats/season/advanced` stats side-by-side comparison).
- [x] Integrate "Passing Trends" in-app (comparing QB passing PPA stats side-by-side using `/ppa/players/season`).
- [x] Integrate "Predicted Points" (Predicted Scoring) in-app (building an interactive expected points situation calculator on a virtual football field).
- [x] Add Help hover buttons with detailed terminology guides to all in-app analytics views.

---

### Milestone 10: Players & Injuries Explorer
- [x] Integrate "Players" navigation tab in Matchup Pro popup.
- [x] Develop internal "Roster & Injuries" Explorer panel with premium glassmorphic styling.
- [x] Map full NFL team names to ESPN API team IDs for live roster and injury feeds.
- [x] Implement robust API mapping fallback to handle CFB injuries gracefully with roster-based simulation (bypassing missing API endpoints).
- [x] Handle API key invalidity or Cloudflare challenge HTML responses safely to prevent JSON parsing crashes.
- [x] Add search filters to query roster list by player name or position group.

---

### Milestone 11: Production Sync & Data Consistency
- [x] Resolve PPG metric mapping bug (supporting both `points` and `scoring` keys).
- [x] Implement robust prior-season fallback (`year - 1`) for college football and NFL stats retrieval.
- [x] Generate and deploy premium 1200x630 Open Graph Image (OGI) at `/og-image.png`.
- [x] Add descriptive SEO meta tags, Open Graph, and Twitter card preview elements to all page headers.
- [x] Synchronize chrome extension build and Vercel SaaS deployment via origin repository sync.

---

## 🚀 Current Trajectory
We are performing the final Git push to origin/main to trigger automatic Vercel redeployment. This will synchronize the local Chrome Extension changes (in-app analytics panels) with the live Vercel SaaS app, correcting the tab-opening behavior on Vercel and updating all data display and Open Graph preview configurations.

---

## ✏️ Squad Status

| Agent | Task | Status |
| :--- | :--- | :--- |
| **Antigravity** | Implement PPG mapping fix, NFL/CFB season fallback, SEO/OGI meta tags, rebuild zip, and push to Vercel | 🟢 Completed |

