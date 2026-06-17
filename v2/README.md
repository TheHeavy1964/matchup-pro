
# CFB Head-to-Head Matchups (Chrome Extension)

A Manifest V3 Chrome extension that lets you enter a college football team and instantly see their matchup for a selected week, quick team summaries, and a lightweight winner prediction.

## Features
- Search any FBS team by name; auto-fetch that week's opponent
- Select **year**, **season type** (regular/postseason), and **week** (supports Week 0)
- Show ratings (SP+ where available, fallback to SRS)
- Pull select season stats (offense/defense)
- Pull latest market line/total when available and blend into prediction
- Simple, readable UI inside the popup

## Data Source
This extension uses the free **CollegeFootballData** API: https://collegefootballdata.com
You need an API key (free). In **Options**, paste your key. It is stored locally via `chrome.storage.sync`.

API Host: `https://api.collegefootballdata.com` (set in `manifest.json` host_permissions)

## Install (Developer Mode)
1. Download and unzip this project.
2. Open **chrome://extensions** and enable **Developer mode** (top right).
3. Click **Load unpacked** and select the unzipped folder.
4. Click the extension icon to open the popup.
5. Go to **Settings** in the popup to paste your API key and set defaults.

## Notes & Limitations
- Some endpoints (SP+ ratings, betting lines) may not always be available; the UI handles missing data gracefully.
- Prediction is a simple blend of ratings and market spread with a small home-field advantage. Treat as informational only.
- Week auto-detection tries `/weeks` endpoint; you can always override via selectors.
- If you follow an FCS team, results may vary depending on API coverage.

## File Map
- `manifest.json` — Manifest V3 config
- `popup.html`, `popup.js`, `styles.css` — popup UI & logic
- `options.html`, `options.js` — place to set API key and defaults

## Privacy
Your API key is saved using Chrome's `storage.sync` and never leaves your browser except in requests you initiate to the CollegeFootballData API.
