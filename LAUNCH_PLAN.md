# Matchup Pro — Chrome Web Store & Launch Plan

This document outlines the exact steps required to successfully launch Matchup Pro on the Chrome Web Store and execute the initial Go-To-Market (GTM) strategy before we begin building Version 2.0.

---

## Phase 1: Chrome Web Store Submission

### 1. Developer Account Registration
*   Go to the [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole).
*   Sign in with your primary Google account and pay the one-time $5 developer registration fee.

### 2. Prepare Store Assets
The Web Store requires highly specific asset dimensions. Ensure these are generated and polished:
*   **Store Icon:** 128x128 pixels (use your existing `icons/icon128.png`).
*   **Promotional Marquee:** 440x280 pixels (A clean graphic showing the Matchup Pro logo and the "Smart Football Analytics" tagline).
*   **Screenshots (Min 1, Max 5):** 1280x800 pixels. Take high-resolution screenshots of the Vercel app demonstrating:
    *   The Main Matchup Card (Offense vs Defense bars).
    *   The "Copy Script" and Podcast tone generator.
    *   The "Team Leaders & Playmakers" tab inside the Roster panel.
    *   The Hype Card Customizer with the Neon/Cyberpunk theme.

### 3. Package and Upload
*   You already have the clean `cfb-head-to-head-extension.zip` file in your root directory.
*   Upload this ZIP file to the Developer Dashboard.

### 4. Listing Details & Justification
*   **Title:** Matchup Pro – Smart Football Analytics
*   **Summary:** Live NFL & College Football stats, win probabilities, and AI script generation for sports fans and creators.
*   **Permissions Justification:** Chrome will ask why you need `activeTab` and `storage` permissions (defined in `manifest.json`).
    *   *storage:* "Required to securely save the user's Stripe verification state and application settings."
    *   *activeTab:* "Required to allow the extension to read the URL to verify if the user is on an authorized domain, and to run the referral/affiliate program scripts."

### 5. Publish
*   Submit for review. First-time submissions typically take 24 to 72 hours for Google to approve.

---

## Phase 2: The Go-To-Market Strategy ("The Creator Loop")

Once the extension is live and your Vercel URL is active, execute this marketing playbook:

### 1. Target Audience: Small/Medium Sports Creators
Do not market this as a "sports score app." Market it as an **"AI Production Assistant for Podcasters."**
*   Identify college football and NFL YouTubers, podcasters, and Twitter spaces hosts with 1,000 - 10,000 followers.
*   **The Pitch:** "Stop spending 3 hours researching stats. Matchup Pro runs the analytics, generates your broadcast script, and creates your thumbnail graphics in 5 seconds."

### 2. The Hype Card Viral Loop
*   Offer Creators free access in exchange for them using the Matchup Pro generated "Hype Cards" on their social media.
*   Ensure the watermark is visible. When their followers ask where they got the graphic, they will share your custom referral link.

### 3. Product Hunt Launch
*   Schedule a launch on [ProductHunt.com](https://www.producthunt.com/).
*   **Tagline:** "Matchup Pro: The AI Assistant for Football Fans & Creators."
*   **Assets:** Use a 60-second Loom screen-recording showing how quickly you can go from searching a game to generating a "Trash Talk" script and downloading a custom neon Matchup Card.

---

## Phase 3: Transition to Version 2.0 (Next Month)
Once initial revenue is secured and users are onboarded, we will reference the `V2_ROADMAP.md` document to begin development on:
1. Red Zone & Upset Push Notifications
2. The AI Avatar Presenter (ElevenLabs integration)
3. Live Odds Movement Tracking
