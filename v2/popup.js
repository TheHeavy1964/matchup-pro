const $ = (s) => document.querySelector(s);

const API_BASE = "https://api.collegefootballdata.com";
const ESPN_API_BASE = "https://site.api.espn.com/apis/site/v2/sports";

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

// Utility functions
function range(start, end) {
  return Array.from({length: end - start + 1}, (_, i) => start + i);
}

function normalizeNFLTeamName(input) {
  const normalized = input.toLowerCase().trim();
  return NFL_TEAMS[normalized] || null;
}

function sanitizeTeamName(name) {
  return name.trim();
}

function fmt(n, digits=1) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return Number(n).toFixed(digits);
}

function fmtRecord(record) {
  return record || "—";
}

function setLoading(isLoading) {
  const loader = $("#loader");
  if (loader) loader.style.display = isLoading ? "block" : "none";
}

function setOutput(html) {
  const output = $("#output");
  if (output) output.innerHTML = html;
}

// API functions
async function getApiKey() {
  const { apiKey } = await chrome.storage.sync.get(["apiKey"]);
  if (!apiKey) throw new Error("Missing API key. Click Settings to add your CollegeFootballData API key.");
  return apiKey;
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

// Game finding functions
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
  if (!games || !games.length) return null;
  return games[0];
}

// Rendering functions
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
    <div style="background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px); border-radius: 12px; padding: 16px; margin-top: 16px; border: 1px solid rgba(255, 255, 255, 0.2);">
      <div style="display: grid; grid-template-columns: 1fr auto 1fr; gap: 16px; align-items: center; margin-bottom: 16px;">
        <div>
          <div style="font-size: 12px; opacity: 0.7;">Home</div>
          <div><strong>${game.homeTeam}</strong></div>
          <div style="font-size: 12px;">Record: ${fmtRecord(game.homeRecord)}</div>
        </div>
        <div style="text-align: center; font-weight: bold; font-size: 20px; opacity: 0.6;">vs</div>
        <div>
          <div style="font-size: 12px; opacity: 0.7;">Away</div>
          <div><strong>${game.awayTeam}</strong></div>
          <div style="font-size: 12px;">Record: ${fmtRecord(game.awayRecord)}</div>
        </div>
      </div>
      <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255, 255, 255, 0.1); font-size: 12px; opacity: 0.7;">
        <div>${gameDate}</div>
        <div>${game.venue || ""}</div>
        <div>Status: ${game.status}</div>
        <div>${weekDisplay} • Line: ${spreadText}</div>
      </div>
    </div>
  `;
}

function renderCFBSummary(game) {
  const home = game.home_team || game.homeTeam;
  const away = game.away_team || game.awayTeam;
  const gameDate = game.start_date || game.startDate;
  const formattedDate = gameDate ? new Date(gameDate).toLocaleString() : "";
  
  return `
    <div style="background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px); border-radius: 12px; padding: 16px; margin-top: 16px; border: 1px solid rgba(255, 255, 255, 0.2);">
      <div style="display: grid; grid-template-columns: 1fr auto 1fr; gap: 16px; align-items: center; margin-bottom: 16px;">
        <div>
          <div style="font-size: 12px; opacity: 0.7;">Home</div>
          <div><strong>${home}</strong></div>
        </div>
        <div style="text-align: center; font-weight: bold; font-size: 20px; opacity: 0.6;">vs</div>
        <div>
          <div style="font-size: 12px; opacity: 0.7;">Away</div>
          <div><strong>${away}</strong></div>
        </div>
      </div>
      <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255, 255, 255, 0.1); font-size: 12px; opacity: 0.7;">
        <div>${formattedDate}</div>
        <div>${game.venue || ""}</div>
      </div>
    </div>
  `;
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
  if (defaultWeek !== undefined && weekSel) weekSel.value = defaultWeek;
}

// Main event handlers
async function main() {
  console.log('Popup script loaded');
  
  await initSelectors();

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
      const teamInput = $("#teamInput");
      const team = teamInput ? sanitizeTeamName(teamInput.value) : '';
      
      // Determine sport type based on active tab
      const activeTab = document.querySelector('.sport-tab.active');
      const sportType = activeTab ? activeTab.dataset.sport : 'cfb';

      if (!team) {
        setOutput(`<div style="background: rgba(231, 76, 60, 0.2); border: 1px solid rgba(231, 76, 60, 0.5); border-radius: 8px; padding: 16px; text-align: center; color: #fff; margin-top: 16px;">Please enter a team name.</div>`);
        return;
      }

      setLoading(true);
      setOutput("");

      try {
        if (sportType === "nfl") {
          // NFL Logic
          const weekSel = $("#nflWeek");
          const week = weekSel ? parseInt(weekSel.value, 10) : 5;

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

        } else {
          // College Football Logic
          const yearSel = $("#year");
          const weekSel = $("#week");
          const seasonTypeSel = $("#seasonType");
          
          const year = yearSel ? parseInt(yearSel.value, 10) : 2024;
          const week = weekSel ? parseInt(weekSel.value, 10) : 1;
          const seasonType = seasonTypeSel ? seasonTypeSel.value : 'regular';

          const game = await findGame(team, year, week, seasonType);
          if (!game) {
            setOutput(`<div style="background: rgba(231, 76, 60, 0.2); border: 1px solid rgba(231, 76, 60, 0.5); border-radius: 8px; padding: 16px; text-align: center; color: #fff; margin-top: 16px;">No game found for ${team} in Week ${week}, ${year} (${seasonType}).</div>`);
            setLoading(false);
            return;
          }

          const html = renderCFBSummary(game);
          setOutput(html);
        }
      } catch (e) {
        console.error(e);
        setOutput(`<div style="background: rgba(231, 76, 60, 0.2); border: 1px solid rgba(231, 76, 60, 0.5); border-radius: 8px; padding: 16px; text-align: center; color: #fff; margin-top: 16px;">${e.message}</div>`);
      } finally {
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