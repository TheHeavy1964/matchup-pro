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

### Milestone 4: Aesthetic Synchronization & Packaging [IN PROGRESS]
- [ ] Align Options page (`options.html` / `styles.css`) styling with popup's premium glassmorphism theme.
- [ ] Run end-to-end browser mock validation for Option page actions.
- [ ] Package the extension as a clean zip file from the root folder.
- [ ] Confirm Stripe webhook endpoints and complete deployment documentation.

---

## 🚀 Current Trajectory
We have successfully switched the working scope to the root folder. The next step is upgrading the visual layout of the settings page (`options.html` styling in `styles.css`) to match the premium aesthetic of the popup, verify the functionality, and compile the final production ZIP file.

---

## ✏️ Squad Status

| Agent | Task | Status |
| :--- | :--- | :--- |
| **Antigravity** | Synchronize markdown files to root, upgrade `styles.css` UI, run browser tests | 🟡 In Progress |
