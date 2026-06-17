const $ = (s) => document.querySelector(s);

const API_BASE = "https://api.collegefootballdata.com";
const ESPN_API_BASE = "https://site.api.espn.com/apis/site/v2/sports";

async function getApiKey() {
  const { apiKey } = await chrome.storage.sync.get(["apiKey"]);
  if (!apiKey) throw new Error("Missing API key. Click Settings to add your CollegeFootballData API key.");
  return apiKey;
}

function setLoading(isLoading) {
  $("#loader").style.display = isLoading ? "block" : "none";
}

function setOutput(html) {
  $("#output").innerHTML = html;
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

async function initSelectors() {
  const now = new Date();
  const currentYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1; // CFB season spans fall
  
  // Initialize CFB year selector
  const years = range(currentYear - 6, currentYear + 1).reverse();
  const yearSel = $("#year");
  years.forEach(y => {
    const opt = document.createElement("option");
    opt.value = y;
    opt.textContent = y;
    yearSel.appendChild(opt);
  });

  // Initialize CFB week selector
  const weekSel = $("#week");
  range(0, 20).forEach(w => {
    const opt = document.createElement("option");
    opt.value = w;
    opt.textContent = `Week ${w}`;
    weekSel.appendChild(opt);
  });

  // Initialize NFL week selector
  const nflWeekSel = $("#nflWeek");
  range(1, 22).forEach(w => {
    const opt = document.createElement("option");
    opt.value = w;
    if (w <= 18) {
      opt.textContent = `Week ${w}`;
    } else {
      const playoffWeek = w - 18;
      const playoffNames = ['Wild Card', 'Divisional', 'Conference Championship', 'Super Bowl'];
      opt.textContent = playoffNames[playoffWeek - 1] || `Playoff Week ${playoffWeek}`;
    }
    nflWeekSel.appendChild(opt);
  });

  // Set current NFL week
  const currentNFLWeek = getCurrentNFLWeek();
  if (currentNFLWeek) nflWeekSel.value = currentNFLWeek;

  // Sport type selector change handler
  $("#sportType").addEventListener("change", (e) => {
    const isCFB = e.target.value === "cfb";
    $("#cfbControls").style.display = isCFB ? "block" : "none";
    $("#nflControls").style.display = isCFB ? "none" : "block";
    $("#teamInput").placeholder = isCFB ? "Enter team (e.g., Georgia)" : "Enter team (e.g., Cowboys)";
  });

  const { defaultYear, defaultWeek } = await chrome.storage.sync.get(["defaultYear", "defaultWeek"]);
  if (defaultYear) yearSel.value = defaultYear;
  if (defaultWeek !== undefined) weekSel.value = defaultWeek;
}

function getCurrentNFLWeek() {
  const now = new Date();
  const year = now.getFullYear();
  const seasonStart = new Date(year, 8, 1); // September 1st approximation
  
  if (now < seasonStart) return 1;
  
  const weeksSinceStart = Math.floor((now - seasonStart) / (7 * 24 * 60 * 60 * 1000));
  return Math.min(Math.max(weeksSinceStart + 1, 1), 18);
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

function sanitizeTeamName(name) {
  return name.trim();
}

/** Find NFL game using ESPN API */
async function findNFLGame(team, week, seasonType) {
  try {
    const teamCode = normalizeNFLTeamName(team);
    if (!teamCode) {
      throw new Error(`Team "${team}" not recognized. Try using team name or city (e.g., "Cowboys" or "Dallas")`);
    }

    const currentYear = new Date().getFullYear();
    const season = new Date().getMonth() < 3 ? currentYear - 1 : currentYear;
    
    // Get NFL scoreboard for the week
    const scoreboard = await espnApi(`/football/nfl/scoreboard?dates=${season}&seasontype=${seasonType}&week=${week}`);
    
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
      seasonType: seasonType
    };
  } catch (error) {
    throw new Error(`Failed to find NFL game: ${error.message}`);
  }
}

/** Get NFL team stats from ESPN */
async function getNFLTeamStats(teamAbbr) {
  try {
    const currentYear = new Date().getFullYear();
    const season = new Date().getMonth() < 3 ? currentYear - 1 : currentYear;
    
    const stats = await espnApi(`/football/nfl/teams/${teamAbbr.toLowerCase()}/statistics?season=${season}`);
    
    const offensive = {};
    const defensive = {};
    
    stats.splits?.categories?.forEach(category => {
      const isOffense = category.name.toLowerCase().includes('offensive') || 
                       category.name.toLowerCase().includes('passing') ||
                       category.name.toLowerCase().includes('rushing');
      
      category.stats?.forEach(stat => {
        const target = isOffense ? offensive : defensive;
        target[stat.name] = stat.value;
      });
    });

    return { offensive, defensive };
  } catch (error) {
    console.warn(`Failed to fetch NFL stats for ${teamAbbr}:`, error);
    return { offensive: {}, defensive: {} };
  }
}

/** Find CFB game (existing function) */
async function findGame(team, year, week, seasonType) {
  const encTeam = encodeURIComponent(team);
  const games = await api(`/games?year=${year}&week=${week}&seasonType=${seasonType}&team=${encTeam}`);
  if (!games || !games.length) return null;
  return games[0];
}

function getOpponent(game, team) {
  const isHome = (game.home_team || game.homeTeam) === team;
  const isAway = (game.away_team || game.awayTeam) === team;
  const home = game.home_team || game.homeTeam;
  const away = game.away_team || game.awayTeam;
  return {
    opponent: isHome ? away : home,
    venue: isHome ? "home" : (isAway ? "away" : "neutral"),
    home, away
  };
}

/** Enhanced betting lines (CFB) */
async function getBettingLines(year, week, team) {
  try {
    const data = await api(`/lines?year=${year}&week=${week}&team=${encodeURIComponent(team)}`);
    if (!data || !data.length) return null;
    
    const gameLines = data[0];
    const lines = gameLines.lines || [];
    
    let bestLine = null;
    let consensus = {
      spread: null,
      total: null,
      moneyline: null,
      providers: []
    };
    
    lines.forEach(line => {
      if (line.provider) consensus.providers.push(line.provider);
      
      const priorityProviders = ['consensus', 'bovada', 'draftkings', 'fanduel'];
      const isPriority = priorityProviders.includes(line.provider?.toLowerCase());
      
      if (!bestLine || isPriority) {
        bestLine = line;
      }
      
      if (line.spread !== null && consensus.spread === null) consensus.spread = line.spread;
      if (line.overUnder !== null && consensus.total === null) consensus.total = line.overUnder;
    });
    
    return {
      ...bestLine,
      consensus,
      allLines: lines
    };
  } catch (error) {
    console.warn('Failed to fetch betting lines:', error);
    return null;
  }
}

/** Enhanced ratings (CFB) */
async function getEnhancedRatings(year) {
  const ratings = {};
  
  try {
    const spData = await api(`/ratings/sp?year=${year}`);
    spData.forEach(team => {
      if (!ratings[team.team]) ratings[team.team] = {};
      ratings[team.team].sp_overall = team.rating;
      ratings[team.team].sp_offense = team.offense;
      ratings[team.team].sp_defense = team.defense;
    });
  } catch (e) {
    console.warn('SP+ ratings not available:', e.message);
  }
  
  try {
    const srsData = await api(`/ratings/srs?year=${year}`);
    srsData.forEach(team => {
      if (!ratings[team.team]) ratings[team.team] = {};
      ratings[team.team].srs = team.rating;
    });
  } catch (e) {
    console.warn('SRS ratings not available:', e.message);
  }
  
  return ratings;
}

/** Advanced season stats (CFB) */
async function getAdvancedSeasonStats(year, team) {
  const stats = { offense: {}, defense: {} };
  
  try {
    const seasonStats = await api(`/stats/season?year=${year}&team=${encodeURIComponent(team)}`);
    
    seasonStats.forEach(stat => {
      const category = stat.category?.toLowerCase();
      if (category === 'offense' || category === 'defense') {
        stats[category][stat.statName] = stat.stat;
      }
    });
    
    const advancedStats = await api(`/stats/season/advanced?year=${year}&team=${encodeURIComponent(team)}`);
    
    advancedStats.forEach(stat => {
      const category = stat.category?.toLowerCase();
      if (category === 'offense' || category === 'defense') {
        if (stat.statName === 'successRate') stats[category].successRate = stat.stat;
        if (stat.statName === 'explosiveness') stats[category].explosiveness = stat.stat;
        if (stat.statName === 'ppa') stats[category].ppa = stat.stat;
      }
    });
    
  } catch (error) {
    console.warn(`Failed to fetch advanced stats for ${team}:`, error);
  }
  
  return stats;
}

function fmt(n, digits=1) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return Number(n).toFixed(digits);
}

function fmtRecord(record) {
  return record || "—";
}

/** NFL-specific prediction */
function predictNFL(game) {
  // Simple NFL prediction based on records and odds
  const homeRecord = game.homeRecord || "0-0";
  const awayRecord = game.awayRecord || "0-0";
  
  const [homeWins, homeLosses] = homeRecord.split('-').map(Number);
  const [awayWins, awayLosses] = awayRecord.split('-').map(Number);
  
  const homeWinPct = homeWins / (homeWins + homeLosses) || 0.5;
  const awayWinPct = awayWins / (awayWins + awayLosses) || 0.5;
  
  // Home field advantage
  let homeAdvantage = (homeWinPct - awayWinPct) * 100 + 3.0;
  
  // Use Vegas odds if available
  if (game.odds?.details) {
    const details = game.odds.details;
    const spreadMatch = details.match(/([+-]?\d+\.?\d*)/);
    if (spreadMatch) {
      const vegasSpread = parseFloat(spreadMatch[1]);
      homeAdvantage = (homeAdvantage * 0.4) + (vegasSpread * -0.6);
    }
  }
  
  const winner = homeAdvantage > 0 ? game.homeTeam : game.awayTeam;
  const margin = Math.abs(homeAdvantage);
  
  return {
    winner,
    margin,
    confidence: game.odds ? "High" : "Medium"
  };
}

/** CFB prediction (existing) */
function enhancedPredict(game, ratings, betting) {
  const home = game.home_team || game.homeTeam;
  const away = game.away_team || game.awayTeam;
  
  const homeRating = ratings[home] || {};
  const awayRating = ratings[away] || {};
  
  const homeScore = homeRating.sp_overall || homeRating.srs || 0;
  const awayScore = awayRating.sp_overall || awayRating.srs || 0;
  
  let homeAdvantage = homeScore - awayScore + 3.0; // HFA
  
  if (betting?.spread !== null && betting?.spread !== undefined) {
    const marketPrediction = -betting.spread;
    homeAdvantage = (homeAdvantage * 0.6) + (marketPrediction * 0.4);
  }
  
  const predictedWinner = homeAdvantage > 0 ? home : away;
  const predictedMargin = Math.abs(homeAdvantage);
  
  return {
    winner: predictedWinner,
    margin: predictedMargin,
    confidence: betting?.spread !== null ? "High" : "Medium"
  };
}

function renderNFLSummary(game, homeStats, awayStats, prediction) {
  const spreadText = game.odds?.details || "—";
  const gameDate = new Date(game.date).toLocaleString();
  
  return `
    <div class="card">
      <div class="grid">
        <div>
          <div class="small muted">Home</div>
          <div><strong>${game.homeTeam}</strong></div>
          <div class="small">Record: ${fmtRecord(game.homeRecord)}</div>
        </div>
        <div class="vs">vs</div>
        <div>
          <div class="small muted">Away</div>
          <div><strong>${game.awayTeam}</strong></div>
          <div class="small">Record: ${fmtRecord(game.awayRecord)}</div>
        </div>
      </div>
      <div class="footer">
        <div class="muted small">${gameDate}</div>
        <div class="muted small">${game.venue || ""}</div>
        <div class="muted small">Status: ${game.status}</div>
      </div>
    </div>

    <div class="card">
      <h3>Game Information</h3>
      <div class="kpi">
        <div class="item">
          <div class="muted small">Vegas Line</div>
          <div><strong>${spreadText}</strong></div>
        </div>
        <div class="item">
          <div class="muted small">Week</div>
          <div><strong>Week ${game.week}</strong></div>
        </div>
        ${game.homeScore !== null ? `
        <div class="item">
          <div class="muted small">Score</div>
          <div><strong>${game.homeTeam} ${game.homeScore} - ${game.awayScore} ${game.awayTeam}</strong></div>
        </div>
        ` : ''}
      </div>
    </div>

    <div class="card">
      <h3>Team Stats (Season)</h3>
      <div class="grid">
        <div>
          <div class="small muted">${game.homeTeam} Stats</div>
          <div class="small">Points/Game: <strong>${fmt(homeStats?.offensive?.pointsPerGame)}</strong></div>
          <div class="small">Yards/Game: <strong>${fmt(homeStats?.offensive?.totalYards)}</strong></div>
          <div class="small">Pass Yards/Game: <strong>${fmt(homeStats?.offensive?.passingYardsPerGame)}</strong></div>
          <div class="small">Rush Yards/Game: <strong>${fmt(homeStats?.offensive?.rushingYardsPerGame)}</strong></div>
        </div>
        <div>
          <div class="small muted">${game.awayTeam} Stats</div>
          <div class="small">Points/Game: <strong>${fmt(awayStats?.offensive?.pointsPerGame)}</strong></div>
          <div class="small">Yards/Game: <strong>${fmt(awayStats?.offensive?.totalYards)}</strong></div>
          <div class="small">Pass Yards/Game: <strong>${fmt(awayStats?.offensive?.passingYardsPerGame)}</strong></div>
          <div class="small">Rush Yards/Game: <strong>${fmt(awayStats?.offensive?.rushingYardsPerGame)}</strong></div>
        </div>
      </div>
    </div>

    <div class="card">
      <h3>Defensive Stats</h3>
      <div class="grid">
        <div>
          <div class="small muted">${game.homeTeam} Defense</div>
          <div class="small">Points Allowed/Game: <strong>${fmt(homeStats?.defensive?.pointsAllowedPerGame)}</strong></div>
          <div class="small">Yards Allowed/Game: <strong>${fmt(homeStats?.defensive?.totalYardsAllowed)}</strong></div>
        </div>
        <div>
          <div class="small muted">${game.awayTeam} Defense</div>
          <div class="small">Points Allowed/Game: <strong>${fmt(awayStats?.defensive?.pointsAllowedPerGame)}</strong></div>
          <div class="small">Yards Allowed/Game: <strong>${fmt(awayStats?.defensive?.totalYardsAllowed)}</strong></div>
        </div>
      </div>
    </div>

    <div class="card">
      <h3>Prediction</h3>
      <div class="winner">
        <span class="badge">${prediction.winner}</span> by ${fmt(prediction.margin, 1)} points
      </div>
      <div class="small muted">Confidence: ${prediction.confidence}</div>
      <div class="note">
        NFL prediction based on team records, home field advantage, and betting lines when available. 
        For entertainment only.
      </div>
    </div>
  `;
}

function renderCFBSummary({ game, ratings, homeStats, awayStats, betting, prediction }) {
  const home = game.home_team || game.homeTeam;
  const away = game.away_team || game.awayTeam;
  
  const homeR = ratings[home] || {};
  const awayR = ratings[away] || {};
  
  const spreadText = betting?.formattedSpread || 
                    (betting?.spread !== undefined ? 
                     (betting.spread > 0 ? `+${betting.spread}` : `${betting.spread}`) : 
                     "—");
  const totalText = betting?.overUnder || "—";
  
  const gameDate = game.start_date || game.startDate;
  const formattedDate = gameDate ? new Date(gameDate).toLocaleString() : "";
  
  return `
    <div class="card">
      <div class="grid">
        <div>
          <div class="small muted">Home</div>
          <div><strong>${home}</strong></div>
          <div class="small">SP+: ${fmt(homeR.sp_overall)} | SRS: ${fmt(homeR.srs)}</div>
        </div>
        <div class="vs">vs</div>
        <div>
          <div class="small muted">Away</div>
          <div><strong>${away}</strong></div>
          <div class="small">SP+: ${fmt(awayR.sp_overall)} | SRS: ${fmt(awayR.srs)}</div>
        </div>
      </div>
      <div class="footer">
        <div class="muted small">${formattedDate}</div>
        <div class="muted small">${game.venue || ""}</div>
      </div>
    </div>

    <div class="card">
      <h3>Betting Information</h3>
      <div class="kpi">
        <div class="item">
          <div class="muted small">Vegas Spread</div>
          <div><strong>${spreadText}</strong></div>
        </div>
        <div class="item">
          <div class="muted small">Over/Under</div>
          <div><strong>${totalText}</strong></div>
        </div>
      </div>
    </div>

    <div class="card">
      <h3>Team Ratings</h3>
      <div class="grid">
        <div>
          <div class="small muted">${home} Ratings</div>
          <div class="small">SP+ Overall: <strong>${fmt(homeR.sp_overall)}</strong></div>
          <div class="small">SP+ Offense: <strong>${fmt(homeR.sp_offense)}</strong></div>
          <div class="small">SP+ Defense: <strong>${fmt(homeR.sp_defense)}</strong></div>
        </div>
        <div>
          <div class="small muted">${away} Ratings</div>
          <div class="small">SP+ Overall: <strong>${fmt(awayR.sp_overall)}</strong></div>
          <div class="small">SP+ Offense: <strong>${fmt(awayR.sp_offense)}</strong></div>
          <div class="small">SP+ Defense: <strong>${fmt(awayR.sp_defense)}</strong></div>
        </div>
      </div>
    </div>

    <div class="card">
      <h3>Advanced Stats</h3>
      <div class="grid">
        <div>
          <div class="muted small">${home} Offense</div>
          <div class="small">PPG: <strong>${fmt(homeStats?.offense?.pointsPerGame)}</strong></div>
          <div class="small">Success Rate: <strong>${fmt(homeStats?.offense?.successRate, 3)}</strong></div>
          <div class="small">PPA: <strong>${fmt(homeStats?.offense?.ppa, 2)}</strong></div>
        </div>
        <div>
          <div class="muted small">${away} Offense</div>
          <div class="small">PPG: <strong>${fmt(awayStats?.offense?.pointsPerGame)}</strong></div>
          <div class="small">Success Rate: <strong>${fmt(awayStats?.offense?.successRate, 3)}</strong></div>
          <div class="small">PPA: <strong>${fmt(awayStats?.offense?.ppa, 2)}</strong></div>
        </div>
      </div>
    </div>

    <div class="card">
      <h3>Prediction</h3>
      <div class="winner">
        <span class="badge">${prediction.winner}</span> by ${fmt(prediction.margin, 1)} points
      </div>
      <div class="small muted">Confidence: ${prediction.confidence}</div>
      <div class="note">
        Enhanced model using SP+/SRS ratings, home field advantage, and betting markets. 
        For entertainment only.
      </div>
    </div>
  `;
}

async function main() {
  await initSelectors();

  $("#openOptions").addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });

  $("#findBtn").addEventListener("click", async () => {
    const team = sanitizeTeamName($("#teamInput").value);
    const sportType = $("#sportType").value;

    if (!team) {
      setOutput(`<div class="error">Please enter a team name.</div>`);
      return;
    }

    setLoading(true);
    setOutput("");

    try {
      if (sportType === "nfl") {
        // NFL Logic
        const week = parseInt($("#nflWeek").value, 10);
        const seasonType = $("#nflSeasonType").value;

        const game = await findNFLGame(team, week, seasonType);
        if (!game) {
          setOutput(`<div class="error">No NFL game found for ${team} in Week ${week}.</div>`);
          setLoading(false);
          return;
        }

        const [homeStats, awayStats] = await Promise.all([
          getNFLTeamStats(game.homeAbbr),
          getNFLTeamStats(game.awayAbbr)
        ]);

        const prediction = predictNFL(game);

        const html = renderNFLSummary(game, homeStats, awayStats, prediction);
        setOutput(html);

      } else {
        // College Football Logic (existing)
        const year = parseInt($("#year").value, 10);
        const week = parseInt($("#week").value, 10);
        const seasonType = $("#seasonType").value;

        const game = await findGame(team, year, week, seasonType);
        if (!game) {
          setOutput(`<div class="error">No game found for ${team} in Week ${week}, ${year} (${seasonType}).</div>`);
          setLoading(false);
          return;
        }

        const home = game.home_team || game.homeTeam;
        const away = game.away_team || game.awayTeam;

        const [ratings, homeStats, awayStats, bettingLines] = await Promise.all([
          getEnhancedRatings(year),
          getAdvancedSeasonStats(year, home),
          getAdvancedSeasonStats(year, away),
          getBettingLines(year, week, team)
        ]);

        const prediction = enhancedPredict(game, ratings, bettingLines);

        const html = renderCFBSummary({
          game,
          ratings,
          homeStats,
          awayStats,
          betting: bettingLines,
          prediction
        });

        setOutput(html);
      }
    } catch (e) {
      console.error(e);
      setOutput(`<div class="error">${e.message}</div>`);
    } finally {
      setLoading(false);
    }
  });
}

main();