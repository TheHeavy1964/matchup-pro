import Vapi from '@vapi-ai/web';

// ─────────────────────────────────────────────────────────────────────────────
// SPORTS TRANSCRIBER CONFIG
// Uses Deepgram nova-2 with keyword boosting to fix sports term misrecognition.
// Boost weight :3 = strong, :2 = moderate. Applied at call-start time.
// Fixes: Clemson→Clinton, rushing→Russia, Crimson→Clinton, etc.
// ─────────────────────────────────────────────────────────────────────────────
const SPORTS_TRANSCRIBER = {
    provider: "deepgram",
    model: "nova-2",
    language: "en-US",
    smartFormat: true,
    keywords: [
        // ── SEC ──────────────────────────────────────────────────
        "Alabama:3", "Crimson Tide:3",
        "Georgia:3", "Bulldogs:3",
        "LSU:3", "Tigers:3",
        "Florida:3", "Gators:3",
        "Tennessee:3", "Volunteers:3",
        "Auburn:3",
        "Ole Miss:3", "Rebels:3",
        "Mississippi State:3",
        "Arkansas:3", "Razorbacks:3",
        "Texas A&M:3", "Aggies:3",
        "Missouri:3",
        "Kentucky:3", "Wildcats:3",
        "Vanderbilt:3", "Commodores:3",
        "South Carolina:3", "Gamecocks:3",
        "Oklahoma:3", "Sooners:3",
        "Texas:3", "Longhorns:3",

        // ── ACC ──────────────────────────────────────────────────
        "Clemson:3",
        "Florida State:3", "Seminoles:3",
        "Miami:3", "Hurricanes:3",
        "North Carolina:3", "Tar Heels:3",
        "NC State:3", "Wolfpack:3",
        "Duke:3", "Blue Devils:3",
        "Virginia:3", "Cavaliers:3",
        "Virginia Tech:3", "Hokies:3",
        "Pittsburgh:3", "Panthers:3",
        "Wake Forest:3", "Demon Deacons:3",
        "Syracuse:3", "Orange:3",
        "Boston College:3", "Eagles:3",
        "Georgia Tech:3", "Yellow Jackets:3",
        "Louisville:3", "Cardinals:3",
        "California:3", "Golden Bears:3",
        "Stanford:3",
        "SMU:3",

        // ── Big Ten ──────────────────────────────────────────────
        "Ohio State:3", "Buckeyes:3",
        "Michigan:3", "Wolverines:3",
        "Penn State:3", "Nittany Lions:3",
        "Michigan State:3", "Spartans:3",
        "Iowa:3", "Hawkeyes:3",
        "Wisconsin:3", "Badgers:3",
        "Nebraska:3", "Cornhuskers:3",
        "Minnesota:3", "Gophers:3",
        "Purdue:3", "Boilermakers:3",
        "Indiana:3", "Hoosiers:3",
        "Illinois:3", "Fighting Illini:3",
        "Northwestern:3",
        "Maryland:3", "Terrapins:3",
        "Rutgers:3", "Scarlet Knights:3",
        "UCLA:3", "Bruins:3",
        "USC:3", "Trojans:3",
        "Oregon:3", "Ducks:3",
        "Washington:3", "Huskies:3",

        // ── Big 12 ──────────────────────────────────────────────
        "Kansas State:3",
        "Kansas:3", "Jayhawks:3",
        "Baylor:3", "Bears:3",
        "TCU:3", "Horned Frogs:3",
        "Oklahoma State:3", "Cowboys:3",
        "Iowa State:3", "Cyclones:3",
        "West Virginia:3", "Mountaineers:3",
        "Texas Tech:3", "Red Raiders:3",
        "Colorado:3", "Buffaloes:3",
        "Utah:3", "Utes:3",
        "Arizona:3",
        "Arizona State:3", "Sun Devils:3",
        "Cincinnati:3", "Bearcats:3",
        "Houston:3", "Cougars:3",
        "UCF:3", "Knights:3",

        // ── Sun Belt & G5 ──────────────────────────────────────
        "Notre Dame:3", "Fighting Irish:3",
        "BYU:3", "Brigham Young:2",
        "Boise State:3", "Broncos:3",
        "Washington State:3",
        "Oregon State:3", "Beavers:3",
        "Air Force:3", "Falcons:3",
        "Army:3", "Black Knights:3",
        "Navy:3", "Midshipmen:3",
        "Liberty:2", "Flames:2",
        "Memphis:2",
        "Appalachian State:2",
        "Coastal Carolina:2", "Chanticleers:2",
        "James Madison:2",
        "San Jose State:2",
        "Fresno State:2",
        "Nevada:2", "Wolf Pack:2",
        "UNLV:2",
        "Tulane:2", "Green Wave:2",
        "UAB:2", "Blazers:2",
        "Marshall:2", "Thundering Herd:2",
        "Louisiana:2", "Ragin Cajuns:2",
        "Georgia Southern:2", "Eagles:2",
        "South Alabama:2", "Jaguars:2",

        // ── NFL Teams ────────────────────────────────────────────
        "Chiefs:3", "Kansas City:3",
        "Eagles:3", "Philadelphia:3",
        "49ers:3", "San Francisco:3",
        "Cowboys:3", "Dallas:3",
        "Bills:3", "Buffalo:3",
        "Ravens:3", "Baltimore:3",
        "Bengals:3",
        "Browns:3", "Cleveland:3",
        "Steelers:3",
        "Texans:3",
        "Colts:3", "Indianapolis:3",
        "Jaguars:3", "Jacksonville:3",
        "Titans:3",
        "Broncos:3", "Denver:3",
        "Raiders:3", "Las Vegas:3",
        "Chargers:3",
        "Seahawks:3", "Seattle:3",
        "Cardinals:3",
        "Rams:3",
        "Packers:3", "Green Bay:3",
        "Bears:3", "Chicago:3",
        "Lions:3", "Detroit:3",
        "Vikings:3",
        "Falcons:3", "Atlanta:3",
        "Panthers:3", "Carolina:3",
        "Saints:3", "New Orleans:3",
        "Buccaneers:3", "Tampa Bay:3",
        "Giants:3",
        "Jets:3",
        "Patriots:3", "New England:3",
        "Dolphins:3",
        "Commanders:3",

        // ── Stats & Play Types ───────────────────────────────────
        "rushing yards:3", "rushing:3",
        "passing yards:3", "passing:3",
        "receiving yards:3",
        "touchdowns:3", "touchdown:3",
        "interceptions:3", "interception:3",
        "completion percentage:3",
        "yards per carry:3",
        "yards per game:3",
        "yards after contact:2",
        "yards after catch:2",
        "red zone:3",
        "third down:3", "fourth down:3",
        "turnover:3", "turnovers:3",
        "turnover differential:3",
        "fumble:3", "fumbles:3",
        "sacks:3", "sack:3",
        "tackles for loss:3",
        "pressures:2",
        "passer rating:3",
        "QBR:3",
        "SP plus:3", "SP+:3",
        "EPA:3", "expected points added:3",
        "yards per play:3",
        "first downs:3",
        "time of possession:3",
        "scoring offense:3",
        "scoring defense:3",
        "points per game:3",
        "points allowed:2",
        "national ranking:3",
        "overall ranking:2",
        "conference record:2",

        // ── Positions ────────────────────────────────────────────
        "quarterback:3", "QB:3",
        "running back:3", "halfback:3",
        "fullback:2",
        "wide receiver:3",
        "tight end:3",
        "offensive line:3",
        "offensive lineman:2",
        "left tackle:2", "right tackle:2",
        "center:2", "guard:2",
        "defensive end:3",
        "defensive tackle:3",
        "nose tackle:2",
        "linebacker:3",
        "inside linebacker:2",
        "outside linebacker:2",
        "cornerback:3",
        "safety:3", "free safety:2", "strong safety:2",
        "nickelback:2",
        "punter:2", "kicker:2",
        "long snapper:2",

        // ── Coaching ─────────────────────────────────────────────
        "defensive coordinator:2",
        "offensive coordinator:2",
        "head coach:2",
        "special teams coordinator:2",

        // ── Schemes & Coverages ──────────────────────────────────
        "blitz:3", "coverage:3",
        "zone defense:3", "man coverage:3",
        "cover two:2", "cover three:2",
        "cover four:2", "quarters coverage:2",
        "nickel:2", "dime:2",
        "four three:2", "three four:2",
        "play action:3",
        "option:2", "read option:3",
        "RPO:3", "run pass option:3",
        "screen pass:2",
        "hurry up:2", "no huddle:2",

        // ── Games & Seasons ──────────────────────────────────────
        "bowl game:3",
        "College Football Playoff:3", "CFP:3",
        "playoff:3",
        "national championship:3",
        "conference championship:3",
        "rivalry game:2",
        "Iron Bowl:3",
        "Rose Bowl:2", "Sugar Bowl:2",
        "Orange Bowl:2", "Cotton Bowl:2",
        "Fiesta Bowl:2", "Peach Bowl:2",

        // ── Conferences ──────────────────────────────────────────
        "SEC:3", "Southeastern Conference:3",
        "ACC:3", "Atlantic Coast Conference:3",
        "Big Ten:3",
        "Big 12:3",
        "Pac-12:3",
        "American Athletic:2", "AAC:2",
        "Mountain West:2", "MWC:2",
        "Sun Belt:2",
        "Conference USA:2",
        "MAC:2", "Mid-American:2",
        "Independent:2"
    ]
};

// ─────────────────────────────────────────────────────────────────────────────
// Studio Mode & Vapi Logic
// ─────────────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const studioToggle = document.getElementById('studioModeToggle');
    const studioContainer = document.getElementById('studioModeContainer');
    const welcomeContainer = document.getElementById('dashboardWelcome');

    const otherContainers = [
        document.getElementById('analyticsContainer'),
        document.getElementById('teamsGamesContainer'),
        document.getElementById('playersContainer')
    ];

    let isStudioMode = false;

    if (studioToggle) {
        studioToggle.addEventListener('click', () => {
            isStudioMode = !isStudioMode;

            if (isStudioMode) {
                studioToggle.style.background = '#2ecc71';
                studioToggle.querySelector('.pulse-dot').classList.add('active');
                if (welcomeContainer) welcomeContainer.style.display = 'none';
                otherContainers.forEach(c => { if (c) c.style.display = 'none'; });
                if (studioContainer) studioContainer.style.display = 'flex';
                if (window.innerWidth <= 1024) {
                    const lp = document.querySelector('.left-panel');
                    if (lp) lp.style.display = 'none';
                }
            } else {
                studioToggle.style.background = 'linear-gradient(45deg, #e74c3c, #c0392b)';
                studioToggle.querySelector('.pulse-dot').classList.remove('active');
                if (studioContainer) studioContainer.style.display = 'none';
                if (welcomeContainer) welcomeContainer.style.display = 'block';
                const lp = document.querySelector('.left-panel');
                if (lp) lp.style.display = 'block';
            }
        });
    }

    // Real Vapi Mic Integration
    const vapiMicBtn = document.getElementById('vapiMicBtn');
    const mockStatCard = document.getElementById('mockStatCard');

    const VAPI_PUBLIC_KEY = 'e57014ec-f147-4ae9-ab3b-41fb56bf5048';
    const ASSISTANT_ID = '852fe68f-bc23-484f-ba74-7e97bd291f4b';

    let vapiInstance = null;
    let isListening = false;

    if (typeof Vapi !== 'undefined' && VAPI_PUBLIC_KEY) {
        vapiInstance = new Vapi(VAPI_PUBLIC_KEY);

        const vapiTranscript = document.getElementById('vapiTranscript');
        const vapiStatCard   = document.getElementById('vapiStatCard');
        const vapiStatLabel  = document.getElementById('vapiStatLabel');
        const vapiStatHead   = document.getElementById('vapiStatHeadline');

        vapiInstance.on('call-start', () => {
            isListening = true;
            vapiMicBtn.style.transform = 'scale(1.1)';
            vapiMicBtn.style.boxShadow = '0 0 30px rgba(16, 185, 129, 0.8)';
            vapiMicBtn.innerHTML = '<span style="font-size: 32px; color: white;">🛑</span>';
            // Show transcript box and clear previous session
            if (vapiTranscript) {
                vapiTranscript.innerHTML = '';
                vapiTranscript.style.display = 'block';
            }
        });

        vapiInstance.on('call-end', () => {
            isListening = false;
            vapiMicBtn.style.transform = 'scale(1)';
            vapiMicBtn.style.boxShadow = '0 10px 30px rgba(16, 185, 129, 0.4)';
            vapiMicBtn.innerHTML = '<span style="font-size: 32px; color: white;">🎤</span>';
        });

        // Live transcript: renders each message as it comes in
        vapiInstance.on('message', (message) => {
            // Tool call initiated — show the stat card in loading state
            if (message.type === 'tool-calls' && vapiStatCard) {
                vapiStatCard.style.display = 'block';
                if (vapiStatLabel) vapiStatLabel.textContent = 'Fetching live data...';
                if (vapiStatHead)  vapiStatHead.textContent  = '⏳';
            }

            // Transcript messages — append to live chat log
            if (message.type === 'transcript' && message.transcriptType === 'final') {
                if (!vapiTranscript) return;
                const role = message.role; // 'user' | 'assistant'
                const text = message.transcript;
                const div  = document.createElement('div');
                div.className = `transcript-msg ${role}`;
                div.textContent = text;
                vapiTranscript.appendChild(div);
                vapiTranscript.scrollTop = vapiTranscript.scrollHeight;

                // When the assistant delivers the stat answer, surface it in the stat card
                if (role === 'assistant' && vapiStatCard) {
                    vapiStatCard.style.display = 'block';
                    if (vapiStatLabel) vapiStatLabel.textContent = 'Live Stat Result';
                    if (vapiStatHead)  vapiStatHead.textContent  = text.length > 120
                        ? text.substring(0, 117) + '…'
                        : text;
                }
            }
        });

        vapiInstance.on('error', (err) => {
            console.error('[Vapi] Error:', err);
            if (vapiTranscript) {
                vapiTranscript.style.display = 'block';
                const div = document.createElement('div');
                div.className = 'transcript-msg assistant';
                div.textContent = '⚠️ Connection error — please try again.';
                vapiTranscript.appendChild(div);
                vapiTranscript.scrollTop = vapiTranscript.scrollHeight;
            }
        });
    }

    if (vapiMicBtn) {
        vapiMicBtn.addEventListener('click', () => {
            if (!VAPI_PUBLIC_KEY) {
                alert("Vapi is not configured! Please add your Public Key in vapi-setup.js.");
                return;
            }

            if (!isListening) {
                // Dynamically clean keywords list: skip multi-word phrases
                // (Vapi strictly rejects keywords with spaces, and splitting them causes false positives like "hello" -> "yellow")
                const rawKeywords = SPORTS_TRANSCRIBER.keywords || [];
                const cleanKeywords = [];
                rawKeywords.forEach(kw => {
                    const parts = kw.split(':');
                    const wordPart = parts[0];
                    const weightPart = parts[1] ? `:${parts[1]}` : '';

                    if (wordPart.includes(' ')) {
                        // Skip multi-word phrases entirely to prevent single-word over-boosting
                        return;
                    }

                    const alphaW = wordPart.replace(/[^a-zA-Z0-9]/g, '');
                    // Vapi strictly rejects keywords that start with a number/digit (e.g., 49ers, 12)
                    if (alphaW && !/^[0-9]/.test(alphaW)) {
                        cleanKeywords.push(`${alphaW}${weightPart}`);
                    }
                });

                // Inject sports transcriber at call time — overrides assistant defaults
                vapiInstance.start(ASSISTANT_ID, {
                    transcriber: {
                        ...SPORTS_TRANSCRIBER,
                        keywords: cleanKeywords
                    }
                });
            } else {
                vapiInstance.stop();
            }
        });
    }
});
