# Matchup Pro — Version 2.0 Roadmap
*Strategic feature pipeline for implementation post-revenue or upon securing grant funding.*

---

## 1. Background Push Notifications (The Engagement Engine)
Capitalizing on the browser extension format to keep users connected without needing an active tab.

*   **🚨 Red Zone Alerts:** A background worker script polls the ESPN API every 60 seconds on game days. When a user's favorited team crosses the opponent's 20-yard line, it triggers a native Chrome desktop notification (e.g., *"RED ZONE ALERT: Ohio State is 1st & Goal at the 8!"*).
*   **🔥 Upset Alerts:** Algorithmic tracking of Top 10 teams. If an unranked team is leading a Top 10 team with under 5 minutes left in the 4th quarter, push an alert to the user.
*   **Value Proposition:** Massive retention driver. Users will keep the extension installed simply for the automated weekend alerts while they work or browse.

## 2. The Weekly AI Analyst Briefing (Avatar Presenter)
A 3-minute, dynamically generated broadcast script summarizing the week's biggest upsets, highest-scoring games, and nail-biters.

*   **Phase A (Baseline):** 2D CSS-animated avatar (using our custom analyst portrait) synced to the free Web Speech API.
*   **Phase B (Premium Audio):** Integration with **ElevenLabs API** ($5+/mo) to clone a hyper-realistic, young African American male broadcast voice.
*   **Phase C (Ultimate Vision):** Integration with **Synthesia API** ($30+/mo) to generate actual photorealistic MP4 videos of the avatar reading the script on demand.

## 3. "My Teams" Personalized Dashboard
Reducing friction and time-to-value when a user clicks the extension icon.

*   **Feature:** A settings portal where users can "star" their 2-3 favorite CFB and NFL teams.
*   **Execution:** Instead of opening to a blank search bar, the extension opens directly to a "My Dashboard" view displaying live scores, upcoming spreads, and instant injury updates specifically for their selected teams.

## 4. Live Odds & Sharp Line Movement Tracking
A critical feature for sports bettors and fantasy players.

*   **Feature:** The extension caches the opening Vegas spread early in the week. 
*   **Execution:** It compares the opening spread to the live spread. If the line moves by more than 1.5 points (indicating sharp money, weather, or a major injury), the Matchup Card displays a flashing "Significant Line Movement" badge to alert the user.

## 5. The "Highlight Reel" Play-by-Play
Navigating around the strict NFL/NCAA video copyright restrictions.

*   **Feature:** Instead of illegal video scraping, the app algorithmically reads the API's play-by-play log and extracts the 5 most explosive plays (e.g., longest yards gained, scoring plays).
*   **Execution:** Presents a clean, chronological "Drive Summary" text reel, accompanied by a one-click button that safely redirects the user to an official YouTube search for the game's highlights.

## 6. Active Starters & Season Stat Progression Tracker
Moving beyond static rosters to track the actual starting 22 (Offense & Defense) and their compounding impact throughout the season.

*   **Feature:** A dedicated "Starters & Stats" sub-panel that isolates the starting lineup for any selected team.
*   **Execution:** For CFB, we leverage the CFBD `/player/usage` and `/ppa/players/season` endpoints. For NFL, we use the ESPN `/roster` and `/statistics` endpoints. The panel will display the starting offensive skill positions (QB, RB, WR, TE) and defensive leaders, updating their cumulative stats (Yards, Touchdowns, Sacks, Interceptions) week-by-week as the 2026 season progresses.
*   **Value Proposition:** Fantasy football players and die-hard fans get an instant, single-screen view of exactly who the playmakers are and how their production is trending without digging through full 53-man rosters.
