if (typeof chrome === 'undefined' || !chrome.storage) {
  const mockStorage = {
    apiKey: "test-cfbd-key",
    isPremium: false,
    stripeEmail: "",
    defaultYear: "2024",
    defaultWeek: "1"
  };
  window.chrome = {
    storage: {
      sync: {
        get: (keys) => {
          const sessionData = sessionStorage.getItem('mockStorage');
          const data = sessionData ? JSON.parse(sessionData) : mockStorage;
          const result = {};
          if (Array.isArray(keys)) {
            keys.forEach(k => result[k] = data[k]);
          } else if (typeof keys === 'string') {
            result[keys] = data[keys];
          } else {
            Object.assign(result, keys);
          }
          return Promise.resolve(result);
        },
        set: (obj) => {
          const sessionData = sessionStorage.getItem('mockStorage');
          const data = sessionData ? JSON.parse(sessionData) : mockStorage;
          Object.assign(data, obj);
          sessionStorage.setItem('mockStorage', JSON.stringify(data));
          return Promise.resolve();
        }
      }
    },
    runtime: {
      openOptionsPage: () => {
        window.open('options.html', '_blank');
      }
    }
  };
}

const $ = (s) => document.querySelector(s);

// Global state for Copy-Script feature
let lastGame = null;
let lastSportType = null;

const API_BASE = "https://api.collegefootballdata.com";
const ESPN_API_BASE = "https://site.api.espn.com/apis/site/v2/sports";

async function getApiKey() {
  const { apiKey } = await chrome.storage.sync.get(["apiKey"]);
  if (!apiKey) throw new Error("Missing API key. Click Settings to add your CollegeFootballData API key.");
  return apiKey;
}

function setLoading(isLoading) {
  const loader = $("#loader");
  if (loader) loader.style.display = isLoading ? "block" : "none";
}

function setOutput(html) {
  const output = $("#output");
  if (output) {
    output.innerHTML = html;
    attachShareBtnListener();
  }
}

async function attachShareBtnListener() {
  const shareCardBtn = $("#shareCardBtn");
  if (shareCardBtn) {
    shareCardBtn.addEventListener("click", async () => {
      console.log('Share card button clicked');
      const { isPremium } = await chrome.storage.sync.get(["isPremium"]);
      if (!isPremium) {
        // Show Upgrade CTA card
        if (!$("#goProPromoBtn")) {
          const promoHtml = `
            <div id="proPromoCard" style="background: rgba(243, 156, 18, 0.15); border: 2px solid rgba(243, 156, 18, 0.5); border-radius: 12px; padding: 16px; margin-top: 12px; text-align: center; color: white;">
              <div style="font-size: 15px; font-weight: 700; margin-bottom: 8px;">📸 Unlock Matchup Card Export (Pro)</div>
              <div style="font-size: 12px; line-height: 1.5; margin-bottom: 12px; opacity: 0.9;">
                Export gorgeous, high-resolution matchup cards directly to PNG for sharing on Twitter, Instagram, or your sports blog.
              </div>
              <button id="goProPromoBtn" style="background: #f39c12; color: white; border: none; border-radius: 6px; padding: 8px 16px; font-weight: 600; cursor: pointer; font-size: 13px;">
                Upgrade to Pro
              </button>
            </div>
          `;
          const container = $("#proPromoContainer");
          if (container) {
            container.innerHTML = promoHtml;
            const promoBtn = $("#goProPromoBtn");
            if (promoBtn) {
              promoBtn.addEventListener("click", () => chrome.runtime.openOptionsPage());
            }
          }
        }
        return;
      }

      // Generate canvas using html2canvas
      const card = $("#matchupCard");
      if (card && typeof html2canvas !== 'undefined') {
        shareCardBtn.innerHTML = '⏳ Generating Image...';
        shareCardBtn.disabled = true;
        
        html2canvas(card, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: null // Transparent background from gradient
        }).then(canvas => {
          const link = document.createElement('a');
          const home = lastGame.homeTeam || lastGame.home_team || 'Home';
          const away = lastGame.awayTeam || lastGame.away_team || 'Away';
          link.download = `${home}-vs-${away}-Matchup.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
          shareCardBtn.innerHTML = '✅ Saved Matchup!';
          setTimeout(() => {
            shareCardBtn.innerHTML = '<span>📸</span> Share Matchup Card';
            shareCardBtn.disabled = false;
          }, 2000);
        }).catch(err => {
          console.error('html2canvas error:', err);
          shareCardBtn.innerHTML = '❌ Export Failed';
          shareCardBtn.disabled = false;
        });
      } else {
        alert('Visual card export library is not loaded.');
      }
    });
  }
}

function range(start, end) {
  return Array.from({length: end - start + 1}, (_, i) => start + i);
}

// NFL Team name mappings for ESPN API
const NFL_TEAMS = {
  'cardinals': 'ARI', 'arizona': 'ARI',
  'falcons': 'ATL', 'atlanta': 'ATL',
  'ravens': 'BAL', 'baltimore': 'BAL',
  'bills': 'BUF', 'buffalo': 'BUF',
  'panthers': 'CAR', 'carolina': 'CAR',
  'bears': 'CHI', 'chicago': 'CHI',
  'bengals': 'CIN', 'cincinnati': 'CIN',
  'browns': 'CLE', 'cleveland': 'CLE',
  'cowboys': 'DAL', 'dallas': 'DAL',
  'broncos': 'DEN', 'denver': 'DEN',
  'lions': 'DET', 'detroit': 'DET',
  'packers': 'GB', 'green bay': 'GB',
  'texans': 'HOU', 'houston': 'HOU',
  'colts': 'IND', 'indianapolis': 'IND',
  'jaguars': 'JAX', 'jacksonville': 'JAX',
  'chiefs': 'KC', 'kansas city': 'KC',
  'raiders': 'LV', 'las vegas': 'LV',
  'chargers': 'LAC', 'los angeles chargers': 'LAC',
  'rams': 'LAR', 'los angeles rams': 'LAR',
  'dolphins': 'MIA', 'miami': 'MIA',
  'vikings': 'MIN', 'minnesota': 'MIN',
  'patriots': 'NE', 'new england': 'NE',
  'saints': 'NO', 'new orleans': 'NO',
  'giants': 'NYG', 'new york giants': 'NYG',
  'jets': 'NYJ', 'new york jets': 'NYJ',
  'eagles': 'PHI', 'philadelphia': 'PHI',
  'steelers': 'PIT', 'pittsburgh': 'PIT',
  '49ers': 'SF', 'san francisco': 'SF',
  'seahawks': 'SEA', 'seattle': 'SEA',
  'buccaneers': 'TB', 'tampa bay': 'TB',
  'titans': 'TEN', 'tennessee': 'TEN',
  'commanders': 'WAS', 'washington': 'WAS'
};

function normalizeNFLTeamName(input) {
  const normalized = input.toLowerCase().trim();
  return NFL_TEAMS[normalized] || null;
}

function sanitizeTeamName(name) {
  return name.trim();
}

async function api(path) {
  const apiKey = await getApiKey();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${apiKey}` }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${path} failed: ${res.status} ${res.statusText} — ${text}`);
  }
  return res.json();
}

async function espnApi(path) {
  const res = await fetch(`${ESPN_API_BASE}${path}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ESPN API ${path} failed: ${res.status} ${res.statusText} — ${text}`);
  }
  return res.json();
}

async function findNFLGame(team, week) {
  try {
    const teamCode = normalizeNFLTeamName(team);
    if (!teamCode) {
      throw new Error(`Team "${team}" not recognized. Try using team name or city (e.g., "Cowboys" or "Dallas")`);
    }

    const currentYear = new Date().getFullYear();
    const season = new Date().getMonth() < 3 ? currentYear - 1 : currentYear;
    
    // Convert internal week values to ESPN API parameters
    let espnWeek, espnSeasonType;
    if (week <= 4) {
      // Preseason weeks 1-4
      espnWeek = week;
      espnSeasonType = 1;
    } else if (week <= 22) {
      // Regular season weeks (internal 5-22 = ESPN weeks 1-18)
      espnWeek = week - 4;
      espnSeasonType = 2;
    } else {
      // Playoffs (internal 23-26 = ESPN weeks 1-4)
      espnWeek = week - 22;
      espnSeasonType = 3;
    }
    
    // Get NFL scoreboard for the week
    const scoreboard = await espnApi(`/football/nfl/scoreboard?dates=${season}&seasontype=${espnSeasonType}&week=${espnWeek}`);
    
    const game = scoreboard.events?.find(event => {
      const homeTeam = event.competitions?.[0]?.competitors?.find(c => c.homeAway === 'home');
      const awayTeam = event.competitions?.[0]?.competitors?.find(c => c.homeAway === 'away');
      
      return homeTeam?.team?.abbreviation === teamCode || awayTeam?.team?.abbreviation === teamCode;
    });

    if (!game) return null;

    const competition = game.competitions[0];
    const homeTeam = competition.competitors.find(c => c.homeAway === 'home');
    const awayTeam = competition.competitors.find(c => c.homeAway === 'away');

    return {
      id: game.id,
      date: game.date,
      homeTeam: homeTeam.team.displayName,
      awayTeam: awayTeam.team.displayName,
      homeAbbr: homeTeam.team.abbreviation,
      awayAbbr: awayTeam.team.abbreviation,
      venue: competition.venue?.fullName,
      homeScore: homeTeam.score,
      awayScore: awayTeam.score,
      status: game.status?.type?.description,
      odds: competition.odds?.[0],
      homeRecord: homeTeam.records?.[0]?.summary,
      awayRecord: awayTeam.records?.[0]?.summary,
      week: week,
      seasonType: espnSeasonType
    };
  } catch (error) {
    throw new Error(`Failed to find NFL game: ${error.message}`);
  }
}

async function findGame(team, year, week, seasonType) {
  const encTeam = encodeURIComponent(team);
  const games = await api(`/games?year=${year}&week=${week}&seasonType=${seasonType}&team=${encTeam}`);
  console.log('[CFBD] Raw response for', team, year, 'Week', week, ':', JSON.stringify(games));
  if (!games || !games.length) return null;
  return games[0];
}

function fmt(n, digits=1) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return Number(n).toFixed(digits);
}

function fmtRecord(record) {
  return record || "—";
}

function renderNFLSummary(game) {
  const spreadText = game.odds?.details || "—";
  const gameDate = new Date(game.date).toLocaleString();
  
  // Format week display
  let weekDisplay;
  if (game.week <= 4) {
    weekDisplay = `Preseason Week ${game.week}`;
  } else if (game.week <= 22) {
    weekDisplay = `Week ${game.week - 4}`;
  } else {
    const playoffNames = ['Wild Card', 'Divisional', 'Conference Championship', 'Super Bowl'];
    weekDisplay = playoffNames[game.week - 23] || `Playoff Week ${game.week - 22}`;
  }
  
  return `
    <div id="matchupCard" style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); border-radius: 12px; padding: 20px; border: 1px solid rgba(255, 255, 255, 0.25); box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37); color: white; position: relative; overflow: hidden; font-family: 'Outfit', sans-serif;">
      <!-- Watermark background decoration -->
      <div style="position: absolute; right: -15px; bottom: -15px; font-size: 80px; font-weight: 900; opacity: 0.05; font-style: italic; pointer-events: none;">NFL</div>
      
      <div style="display: grid; grid-template-columns: 1fr auto 1fr; gap: 16px; align-items: center; margin-bottom: 16px; position: relative; z-index: 1;">
        <div style="text-align: left;">
          <div style="font-size: 10px; opacity: 0.7; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Home</div>
          <div style="font-size: 15px; font-weight: 700;">${game.homeTeam}</div>
          <div style="font-size: 11px; opacity: 0.8; margin-top: 2px;">Record: ${fmtRecord(game.homeRecord)}</div>
        </div>
        <div style="text-align: center; font-weight: bold; font-size: 16px; color: #f39c12; background: rgba(243, 156, 18, 0.15); width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(243, 156, 18, 0.3);">VS</div>
        <div style="text-align: right;">
          <div style="font-size: 10px; opacity: 0.7; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Away</div>
          <div style="font-size: 15px; font-weight: 700;">${game.awayTeam}</div>
          <div style="font-size: 11px; opacity: 0.8; margin-top: 2px;">Record: ${fmtRecord(game.awayRecord)}</div>
        </div>
      </div>
      <div style="margin-top: 14px; padding-top: 14px; border-top: 1px solid rgba(255, 255, 255, 0.15); font-size: 12px; line-height: 1.6; position: relative; z-index: 1;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span style="opacity:0.8;">📅 Date:</span> <span><strong>${gameDate}</strong></span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span style="opacity:0.8;">🏟️ Venue:</span> <span><strong>${game.venue || "TBD"}</strong></span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span style="opacity:0.8;">🏈 Week:</span> <span><strong>${weekDisplay}</strong></span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span style="opacity:0.8;">📊 Line:</span> <span style="color: #f1c40f;"><strong>${spreadText}</strong></span>
        </div>
      </div>
      <!-- Watermark footer inside card -->
      <div style="margin-top: 16px; padding-top: 8px; border-top: 1px dashed rgba(255, 255, 255, 0.2); text-align: center; font-size: 10px; opacity: 0.6; letter-spacing: 1.5px;">
        MATCHUP PRO • SMART FOOTBALL ANALYTICS
      </div>
    </div>
    <div style="margin-top: 12px;">
      <button id="shareCardBtn" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: 600; padding: 10px; border-radius: 8px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: white; cursor: pointer; transition: all 0.2s; font-size: 13px;">
        <span>📸</span> Share Matchup Card
      </button>
    </div>
    <div id="proPromoContainer"></div>
  `;
}

function renderCFBSummary(game) {
  // CFBD API uses snake_case; handle camelCase fallback for future-proofing
  const home = game.home_team || game.homeTeam || game.home || null;
  const away = game.away_team || game.awayTeam || game.away || null;
  const gameDate = game.start_date || game.startDate || null;
  const formattedDate = gameDate
    ? new Date(gameDate).toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })
    : '—';

  // Team names missing = season schedule not yet published (e.g. querying a future year)
  if (!home || !away) {
    const now = new Date();
    const activeYear = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
    const queriedYear = game.season || game.year || '?';
    return `
      <div style="background:rgba(255,193,7,0.15);border:1px solid rgba(255,193,7,0.5);border-radius:12px;padding:16px;margin-top:16px;">
        <div style="font-size:15px;font-weight:700;margin-bottom:8px;">&#x26A0;&#xFE0F; Season Data Not Available Yet</div>
        <div style="font-size:13px;line-height:1.6;">
          The API found a game slot at <strong>${game.venue || 'this venue'}</strong> for the
          <strong>${queriedYear}</strong> season, but team names haven't been announced yet.
        </div>
        ${Number(queriedYear) > activeYear ? `
        <div style="margin-top:12px;background:rgba(255,255,255,0.1);border-radius:8px;padding:10px;font-size:12px;">
          &#x1F4A1; <strong>Tip:</strong> Change the Season to <strong>${activeYear}</strong>
          to see last season's completed matchups.
        </div>` : ''}
      </div>
    `;
  }

  const homePoints = game.home_points != null ? game.home_points : null;
  const awayPoints = game.away_points != null ? game.away_points : null;
  const hasScore = homePoints !== null && awayPoints !== null;
  const excitement = game.excitement_index ? Number(game.excitement_index).toFixed(1) : null;

  return `
    <div id="matchupCard" style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); border-radius: 12px; padding: 20px; border: 1px solid rgba(255, 255, 255, 0.25); box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37); color: white; position: relative; overflow: hidden; font-family: 'Outfit', sans-serif;">
      <!-- Watermark background decoration -->
      <div style="position: absolute; right: -15px; bottom: -15px; font-size: 80px; font-weight: 900; opacity: 0.05; font-style: italic; pointer-events: none;">CFB</div>
      
      <div style="display: grid; grid-template-columns: 1fr auto 1fr; gap: 16px; align-items: center; margin-bottom: 16px; position: relative; z-index: 1;">
        <div style="text-align: left;">
          <div style="font-size: 10px; opacity: 0.7; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Home</div>
          <div style="font-size: 15px; font-weight: 700;">${home}</div>
          ${hasScore ? `<div style="font-size: 20px; font-weight: 800; margin-top: 4px; color: #2ecc71;">${homePoints}</div>` : ''}
        </div>
        <div style="text-align: center; font-weight: bold; font-size: 16px; color: #f39c12; background: rgba(243, 156, 18, 0.15); width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(243, 156, 18, 0.3);">VS</div>
        <div style="text-align: right;">
          <div style="font-size: 10px; opacity: 0.7; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Away</div>
          <div style="font-size: 15px; font-weight: 700;">${away}</div>
          ${hasScore ? `<div style="font-size: 20px; font-weight: 800; margin-top: 4px; color: #2ecc71;">${awayPoints}</div>` : ''}
        </div>
      </div>
      <div style="margin-top: 14px; padding-top: 14px; border-top: 1px solid rgba(255, 255, 255, 0.15); font-size: 12px; line-height: 1.6; position: relative; z-index: 1;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span style="opacity:0.8;">📅 Date:</span> <span><strong>${formattedDate}</strong></span>
        </div>
        ${game.venue ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span style="opacity:0.8;">🏟️ Venue:</span> <span><strong>${game.venue}</strong></span>
        </div>` : ''}
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span style="opacity:0.8;">🏈 Details:</span> <span><strong>Week ${game.week || '?'} &bull; ${game.season_type || game.seasonType || 'Regular'} Season</strong></span>
        </div>
        ${excitement ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span style="opacity:0.8;">⚡ Excitement:</span> <span style="color: #f1c40f;"><strong>${excitement}/10</strong></span>
        </div>` : ''}
      </div>
      <!-- Watermark footer inside card -->
      <div style="margin-top: 16px; padding-top: 8px; border-top: 1px dashed rgba(255, 255, 255, 0.2); text-align: center; font-size: 10px; opacity: 0.6; letter-spacing: 1.5px;">
        MATCHUP PRO • SMART FOOTBALL ANALYTICS
      </div>
    </div>
    <div style="margin-top: 12px;">
      <button id="shareCardBtn" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: 600; padding: 10px; border-radius: 8px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: white; cursor: pointer; transition: all 0.2s; font-size: 13px;">
        <span>📸</span> Share Matchup Card
      </button>
    </div>
    <div id="proPromoContainer"></div>
  `;
}


function getCurrentCFBWeek() {
  const now = new Date();
  const month = now.getMonth(); // 0=Jan
  const day = now.getDate();

  // CFB season runs late August through mid-January (bowls)
  if (month < 7) return null;           // offseason Jan-Jul
  if (month === 7) return 0;            // August = Week 0 kickoff
  if (month === 8) {                    // September
    const weeksSinceLabor = Math.floor((day - 1) / 7);
    return Math.min(weeksSinceLabor + 1, 4);
  }
  if (month === 9) return Math.min(5 + Math.floor(day / 7), 8);   // October
  if (month === 10) return Math.min(9 + Math.floor(day / 7), 12); // November
  if (month === 11) return 13;          // December (rivalry + conf championships)
  return null;                          // Jan = bowls/playoffs — user should pick
}

function getCurrentNFLWeek() {
  const now = new Date();
  const year = now.getFullYear();
  
  // NFL season dates (approximate)
  const preseasonStart = new Date(year, 7, 1); // August 1st
  const regularSeasonStart = new Date(year, 8, 8); // September 8th
  const playoffStart = new Date(year + 1, 0, 8); // January 8th of next year
  
  if (now < preseasonStart) {
    return 1; // Preseason Week 1
  } else if (now >= preseasonStart && now < regularSeasonStart) {
    // Preseason (values 1-4)
    const weeksSincePreseason = Math.floor((now - preseasonStart) / (7 * 24 * 60 * 60 * 1000));
    return Math.min(Math.max(weeksSincePreseason + 1, 1), 4);
  } else if (now >= regularSeasonStart && now < playoffStart) {
    // Regular season (values 5-22, displayed as Week 1-18)
    const weeksSinceRegular = Math.floor((now - regularSeasonStart) / (7 * 24 * 60 * 60 * 1000));
    return Math.min(Math.max(weeksSinceRegular + 5, 5), 22);
  } else {
    // Playoffs (values 23-26)
    const weeksSincePlayoffs = Math.floor((now - playoffStart) / (7 * 24 * 60 * 60 * 1000));
    return Math.min(Math.max(weeksSincePlayoffs + 23, 23), 26);
  }
}

// ─── Podcast Feature: Generate on-air script text ───────────────────────────
function generateScriptText(game, sportType) {
  if (sportType === 'nfl') {
    const home = game.homeTeam;
    const away = game.awayTeam;
    const spread = game.odds?.details || null;
    const venue = game.venue || 'their home stadium';
    const spreadLine = spread ? ` Vegas has ${spread}.` : '';
    let weekLabel = '';
    if (game.week <= 4) weekLabel = `Preseason Week ${game.week}`;
    else if (game.week <= 22) weekLabel = `Week ${game.week - 4}`;
    else {
      const names = ['Wild Card', 'Divisional', 'Conference Championship', 'Super Bowl'];
      weekLabel = names[game.week - 23] || 'the playoffs';
    }
    return `Coming up in ${weekLabel} action: the ${away} travel to ${venue} to take on the ${home}.${spreadLine} This one kicks off ${new Date(game.date).toLocaleDateString('en-US', {weekday:'long', month:'long', day:'numeric'})}.`;
  } else {
    const home = game.home_team || game.homeTeam || 'the home team';
    const away = game.away_team || game.awayTeam || 'the visitors';
    const venue = game.venue || 'their home stadium';
    const dateStr = game.start_date || game.startDate;
    const dateLabel = dateStr ? new Date(dateStr).toLocaleDateString('en-US', {weekday:'long', month:'long', day:'numeric'}) : 'this week';
    const weekNum = game.week || '?';
    return `In college football, Week ${weekNum} brings us ${away} at ${home}, kicking off ${dateLabel} at ${venue}. This is a matchup worth watching heading into the weekend.`;
  }
}

// ─── Podcast Feature: Load dynamic featured matchups ─────────────────────────
async function loadFeaturedMatchups() {
  const grid = $('#featuredMatchups');
  if (!grid) return;

  const sportType = $("#sportType");
  const sport = sportType ? sportType.value : "cfb";
  const isCFB = sport === "cfb";
  const endpoint = isCFB ? '/football/college-football/scoreboard' : '/football/nfl/scoreboard';

  try {
    const data = await espnApi(endpoint);
    const events = data?.events || [];
    
    let display = [];
    if (isCFB) {
      const topGames = events
        .filter(e => e.competitions?.[0]?.competitors?.some(c => c.curatedRank?.current <= 25))
        .slice(0, 2);
      display = topGames.length >= 2 ? topGames : events.slice(0, 2);
    } else {
      display = events.slice(0, 2);
    }

    if (display.length === 0) {
      grid.innerHTML = '<div class="quick-pick-card" style="opacity:0.5;font-size:12px;">No games found this week</div>';
      return;
    }

    grid.innerHTML = display.map(evt => {
      const comp = evt.competitions?.[0];
      const home = comp?.competitors?.find(c => c.homeAway === 'home');
      const away = comp?.competitors?.find(c => c.homeAway === 'away');
      const homeName = home?.team?.shortDisplayName || home?.team?.displayName || '?';
      const awayName = away?.team?.shortDisplayName || away?.team?.displayName || '?';
      const homeRank = isCFB && home?.curatedRank?.current <= 25 ? `#${home.curatedRank.current} ` : '';
      const awayRank = isCFB && away?.curatedRank?.current <= 25 ? `#${away.curatedRank.current} ` : '';
      const status = evt.status?.type?.shortDetail || '';
      return `<div class="quick-pick-card" data-team="${homeName}" onclick="document.getElementById('teamInput').value='${homeName}'">
        <div class="quick-pick-teams">${awayRank}${awayName} vs ${homeRank}${homeName}</div>
        <div class="quick-pick-info">${status}</div>
      </div>`;
    }).join('');
  } catch (e) {
    grid.innerHTML = isCFB ? `
      <div class="quick-pick-card" onclick="document.getElementById('teamInput').value='Georgia'">
        <div class="quick-pick-teams">Georgia vs Alabama</div>
        <div class="quick-pick-info">SEC • Classic Rivalry</div>
      </div>
      <div class="quick-pick-card" onclick="document.getElementById('teamInput').value='Texas'">
        <div class="quick-pick-teams">Michigan vs Texas</div>
        <div class="quick-pick-info">Big Ten/SEC • Powerhouse</div>
      </div>` : `
      <div class="quick-pick-card" onclick="document.getElementById('teamInput').value='Chiefs'">
        <div class="quick-pick-teams">Chiefs vs Ravens</div>
        <div class="quick-pick-info">NFL • Season Kickoff</div>
      </div>
      <div class="quick-pick-card" onclick="document.getElementById('teamInput').value='49ers'">
        <div class="quick-pick-teams">49ers vs Jets</div>
        <div class="quick-pick-info">NFL • Monday Night</div>
      </div>`;
  }
}
// ─────────────────────────────────────────────────────────────────────────────

async function initSelectors() {
  const now = new Date();
  const currentYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  
  // Initialize CFB year selector
  const years = range(currentYear - 6, currentYear + 1).reverse();
  const yearSel = $("#year");
  if (yearSel) {
    yearSel.innerHTML = '';
    years.forEach(y => {
      const opt = document.createElement("option");
      opt.value = y;
      opt.textContent = y;
      yearSel.appendChild(opt);
    });
  }

  // Initialize CFB week selector
  const weekSel = $("#week");
  if (weekSel) {
    weekSel.innerHTML = '';
    range(0, 20).forEach(w => {
      const opt = document.createElement("option");
      opt.value = w;
      opt.textContent = `Week ${w}`;
      weekSel.appendChild(opt);
    });
  }

  // Initialize NFL week selector - FIXED: Separate preseason from regular season
  const nflWeekSel = $("#nflWeek");
  if (nflWeekSel) {
    nflWeekSel.innerHTML = '';
    
    // Preseason weeks 1-4
    range(1, 4).forEach(w => {
      const opt = document.createElement("option");
      opt.value = w;
      opt.textContent = `Preseason Week ${w}`;
      nflWeekSel.appendChild(opt);
    });
    
    // Regular season weeks 1-18 (values 5-22 internally to avoid overlap)
    range(1, 18).forEach(w => {
      const opt = document.createElement("option");
      opt.value = w + 4; // Values 5-22
      opt.textContent = `Week ${w}`;
      nflWeekSel.appendChild(opt);
    });
    
    // Playoffs (values 23-26)
    const playoffNames = ['Wild Card', 'Divisional', 'Conference Championship', 'Super Bowl'];
    playoffNames.forEach((name, i) => {
      const opt = document.createElement("option");
      opt.value = 23 + i;
      opt.textContent = name;
      nflWeekSel.appendChild(opt);
    });
  }

  // Set current NFL week
  const currentNFLWeek = getCurrentNFLWeek();
  if (currentNFLWeek && nflWeekSel) nflWeekSel.value = currentNFLWeek;

  // Set up sport tab functionality
  document.querySelectorAll('.sport-tab').forEach(tab => {
    tab.addEventListener('click', function() {
      document.querySelectorAll('.sport-tab').forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      
      const sport = this.dataset.sport;
      const isCFB = sport === "cfb";
      
      // Update hidden select for compatibility
      const sportType = $("#sportType");
      if (sportType) sportType.value = sport;
      
      // Show/hide controls
      const cfbControls = $("#cfbControls");
      const nflControls = $("#nflControls");
      const teamInput = $("#teamInput");
      
      if (cfbControls) cfbControls.style.display = isCFB ? "block" : "none";
      if (nflControls) nflControls.style.display = isCFB ? "none" : "block";
      if (teamInput) teamInput.placeholder = isCFB ? "Search teams (e.g., Georgia)" : "Search teams (e.g., Cowboys)";
      
      // Reload featured matchups for selected sport
      loadFeaturedMatchups();
    });
  });

  // Quick pick functionality
  document.querySelectorAll('.quick-pick-card').forEach(card => {
    card.addEventListener('click', function() {
      const teams = this.querySelector('.quick-pick-teams');
      const teamInput = $("#teamInput");
      if (teams && teamInput) {
        teamInput.value = teams.textContent;
      }
    });
  });

  const { defaultYear, defaultWeek } = await chrome.storage.sync.get(["defaultYear", "defaultWeek"]);
  if (defaultYear && yearSel) yearSel.value = defaultYear;
  if (defaultWeek !== undefined && weekSel) {
    weekSel.value = defaultWeek;
  } else {
    // Auto-detect current CFB week
    const cfbWeek = getCurrentCFBWeek();
    if (cfbWeek !== null && weekSel) weekSel.value = cfbWeek;
  }
}

// Main event handlers
async function main() {
  console.log('Popup script loaded');
  
  await initSelectors();

  // Load dynamic featured matchups in background (no blocker if it fails)
  loadFeaturedMatchups();

  // Premium Status Initialization
  const { isPremium } = await chrome.storage.sync.get(["isPremium"]);
  const premiumBadge = $("#premiumBadge");
  if (premiumBadge) {
    if (isPremium) {
      premiumBadge.textContent = "Pro";
      premiumBadge.style.background = "linear-gradient(45deg, #27ae60, #2ecc71)";
      premiumBadge.style.color = "white";
      premiumBadge.style.display = "inline-block";
    } else {
      premiumBadge.textContent = "Upgrade";
      premiumBadge.style.background = "linear-gradient(45deg, #f39c12, #e74c3c)";
      premiumBadge.style.color = "white";
      premiumBadge.style.display = "inline-block";
      premiumBadge.title = "Click to activate premium features";
    }
    premiumBadge.addEventListener("click", () => {
      chrome.runtime.openOptionsPage();
    });
  }

  // Copy Script button
  const copyScriptBtn = $('#copyScriptBtn');
  if (copyScriptBtn) {
    if (!isPremium) {
      copyScriptBtn.innerHTML = '<span>🔒</span> Copy Script';
    }

    copyScriptBtn.addEventListener('click', async () => {
      const { isPremium: currentIsPremium } = await chrome.storage.sync.get(["isPremium"]);
      if (!currentIsPremium) {
        // Show Upgrade CTA card at top of output
        const output = $("#output");
        if (output) {
          if (!$("#goProPromoBtn")) {
            const promoHtml = `
              <div id="proPromoCard" style="background: rgba(243, 156, 18, 0.15); border: 2px solid rgba(243, 156, 18, 0.5); border-radius: 12px; padding: 16px; margin-top: 16px; text-align: center; color: white;">
                <div style="font-size: 16px; font-weight: 700; margin-bottom: 8px;">🎙️ Unlock On-Air Scripts (Pro)</div>
                <div style="font-size: 12px; line-height: 1.5; margin-bottom: 12px; opacity: 0.9;">
                  Get pre-written, broadcast-ready scripts for your sports podcast automatically generated for every matchup.
                </div>
                <button id="goProPromoBtn" style="background: #f39c12; color: white; border: none; border-radius: 6px; padding: 8px 16px; font-weight: 600; cursor: pointer; font-size: 13px;">
                  Upgrade to Pro
                </button>
              </div>
            `;
            output.innerHTML = promoHtml + output.innerHTML;
            
            const promoBtn = $("#goProPromoBtn");
            if (promoBtn) {
              promoBtn.addEventListener("click", () => chrome.runtime.openOptionsPage());
            }
          }
          output.scrollIntoView({ behavior: 'smooth' });
        }
        return;
      }

      if (!lastGame) return;
      const scriptText = generateScriptText(lastGame, lastSportType);
      navigator.clipboard.writeText(scriptText).then(() => {
        copyScriptBtn.innerHTML = '✅ Copied!';
        copyScriptBtn.classList.add('copied');
        setTimeout(() => {
          copyScriptBtn.innerHTML = '<span>🎙️</span> Copy Script';
          copyScriptBtn.classList.remove('copied');
        }, 2000);
      }).catch(() => {
        const ta = document.createElement('textarea');
        ta.value = scriptText;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        copyScriptBtn.innerHTML = '✅ Copied!';
        setTimeout(() => { copyScriptBtn.innerHTML = '<span>🎙️</span> Copy Script'; }, 2000);
      });
    });
  }

  const openOptions = $("#openOptions");
  if (openOptions) {
    openOptions.addEventListener("click", () => {
      chrome.runtime.openOptionsPage();
    });
  }

  const findBtn = $("#findBtn");
  if (findBtn) {
    findBtn.addEventListener("click", async () => {
      console.log('Find button clicked');
      
      try {
        const teamInput = $("#teamInput");
        const team = teamInput ? sanitizeTeamName(teamInput.value) : '';
        
        console.log('Team input:', team);
        
        // Determine sport type based on active tab
        const activeTab = document.querySelector('.sport-tab.active');
        const sportType = activeTab ? activeTab.dataset.sport : 'cfb';
        
        console.log('Sport type:', sportType);

        if (!team) {
          console.log('No team entered');
          setOutput(`<div style="background: rgba(231, 76, 60, 0.2); border: 1px solid rgba(231, 76, 60, 0.5); border-radius: 8px; padding: 16px; text-align: center; color: #fff; margin-top: 16px;">Please enter a team name.</div>`);
          return;
        }

        console.log('Starting search...');
        setLoading(true);
        setOutput("");

        if (sportType === "nfl") {
          console.log('NFL search');
          // NFL Logic
          const weekSel = $("#nflWeek");
          const week = weekSel ? parseInt(weekSel.value, 10) : 5;
          
          console.log('NFL week:', week);

          const game = await findNFLGame(team, week);
          if (!game) {
            let weekText;
            if (week <= 4) {
              weekText = `Preseason Week ${week}`;
            } else if (week <= 22) {
              weekText = `Week ${week - 4}`;
            } else {
              const playoffNames = ['Wild Card', 'Divisional', 'Conference Championship', 'Super Bowl'];
              weekText = playoffNames[week - 23] || `Playoff Week ${week - 22}`;
            }
            setOutput(`<div style="background: rgba(231, 76, 60, 0.2); border: 1px solid rgba(231, 76, 60, 0.5); border-radius: 8px; padding: 16px; text-align: center; color: #fff; margin-top: 16px;">No NFL game found for ${team} in ${weekText}.</div>`);
            setLoading(false);
            return;
          }

          const html = renderNFLSummary(game);
          setOutput(html);
          // Store for Copy Script
          lastGame = game;
          lastSportType = 'nfl';
          const scriptBtn = $('#copyScriptBtn');
          if (scriptBtn) scriptBtn.disabled = false;

        } else {
          console.log('CFB search');
          // College Football Logic
          const yearSel = $("#year");
          const weekSel = $("#week");
          const seasonTypeSel = $("#seasonType");
          
          const year = yearSel ? parseInt(yearSel.value, 10) : 2024;
          const week = weekSel ? parseInt(weekSel.value, 10) : 1;
          const seasonType = seasonTypeSel ? seasonTypeSel.value : 'regular';

          console.log('CFB params:', { year, week, seasonType, team });

          try {
            const game = await findGame(team, year, week, seasonType);
            console.log('Game found:', game);
            
            if (!game) {
              console.log('No game found');
              setOutput(`<div style="background: rgba(231, 76, 60, 0.2); border: 1px solid rgba(231, 76, 60, 0.5); border-radius: 8px; padding: 16px; text-align: center; color: #fff; margin-top: 16px;">No game found for ${team} in Week ${week}, ${year} (${seasonType}).</div>`);
              setLoading(false);
              return;
            }

            console.log('Rendering CFB summary...');
            try {
              const html = renderCFBSummary(game);
              console.log('CFB summary rendered successfully');
              setOutput(html);
              // Store for Copy Script
              lastGame = game;
              lastSportType = 'cfb';
              const scriptBtn = $('#copyScriptBtn');
              if (scriptBtn) scriptBtn.disabled = false;
            } catch (renderError) {
              console.error('Error rendering CFB summary:', renderError);
              // Fallback to basic display without records
              const home = game.home_team || game.homeTeam;
              const away = game.away_team || game.awayTeam;
              const gameDate = game.start_date || game.startDate;
              const formattedDate = gameDate ? new Date(gameDate).toLocaleString() : "";
              
              const basicHtml = `
                <div style="background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px); border-radius: 12px; padding: 16px; margin-top: 16px; border: 1px solid rgba(255, 255, 255, 0.2);">
                  <div style="display: grid; grid-template-columns: 1fr auto 1fr; gap: 16px; align-items: center; margin-bottom: 16px;">
                    <div>
                      <div style="font-size: 12px; opacity: 0.7;">Home</div>
                      <div><strong>${home}</strong></div>
                      <div style="font-size: 12px;">Record: Loading...</div>
                    </div>
                    <div style="text-align: center; font-weight: bold; font-size: 20px; opacity: 0.6;">vs</div>
                    <div>
                      <div style="font-size: 12px; opacity: 0.7;">Away</div>
                      <div><strong>${away}</strong></div>
                      <div style="font-size: 12px;">Record: Loading...</div>
                    </div>
                  </div>
                  <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255, 255, 255, 0.1); font-size: 12px; opacity: 0.7;">
                    <div>${formattedDate}</div>
                    <div>${game.venue || ""}</div>
                    <div>Week ${game.week || "?"} • ${game.season_type || "Regular"} Season</div>
                    <div style="margin-top: 8px; color: #ffeb3b;">Note: Error loading team records - ${renderError.message}</div>
                  </div>
                </div>
              `;
              setOutput(basicHtml);
            }
            
          } catch (apiError) {
            console.error('CFB API Error:', apiError);
            // Show basic game info without records if API fails
            setOutput(`
              <div style="background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px); border-radius: 12px; padding: 16px; margin-top: 16px; border: 1px solid rgba(255, 255, 255, 0.2);">
                <div style="text-align: center; margin-bottom: 16px;">
                  <div><strong>Search for: ${team}</strong></div>
                  <div style="font-size: 12px; opacity: 0.7;">Year: ${year}, Week: ${week}, Type: ${seasonType}</div>
                </div>
                <div style="background: rgba(255, 215, 0, 0.2); border: 1px solid rgba(255, 215, 0, 0.5); border-radius: 8px; padding: 12px; font-size: 12px;">
                  <strong>API Error:</strong> ${apiError.message}
                  <br><br>
                  <strong>Tip:</strong> Make sure you have configured your CollegeFootballData API key in Settings. Get a free key at collegefootballdata.com
                </div>
              </div>
            `);
          }
        }
        
      } catch (e) {
        console.error('General error:', e);
        setOutput(`<div style="background: rgba(231, 76, 60, 0.2); border: 1px solid rgba(231, 76, 60, 0.5); border-radius: 8px; padding: 16px; text-align: center; color: #fff; margin-top: 16px;">Error: ${e.message}</div>`);
      } finally {
        console.log('Search complete, hiding loading');
        setLoading(false);
      }
    });
  }

  console.log('Event listeners set up');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}