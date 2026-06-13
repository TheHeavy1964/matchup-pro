if (typeof chrome === 'undefined' || !chrome.storage) {
  const mockStorage = {
    apiKey: "GHP727ErgsO9BFzeR+G7gsLtn4TePbsetr2ale2LpFHeBhDpDU14895gxItsRqaA",
    isPremium: false,
    stripeEmail: "",
    defaultYear: "2024",
    defaultWeek: "1"
  };
  window.chrome = {
    storage: {
      sync: {
        get: (keys) => {
          const localData = localStorage.getItem('mockStorage');
          let data;
          try {
            data = localData ? JSON.parse(localData) : mockStorage;
          } catch (e) {
            data = mockStorage;
          }
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
          const localData = localStorage.getItem('mockStorage');
          let data;
          try {
            data = localData ? JSON.parse(localData) : mockStorage;
          } catch (e) {
            data = mockStorage;
          }
          Object.assign(data, obj);
          localStorage.setItem('mockStorage', JSON.stringify(data));
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

let isDemoMode = false;

async function getApiKey() {
  const { apiKey } = await chrome.storage.sync.get(["apiKey"]);
  if (!apiKey || apiKey === "test-cfbd-key" || apiKey === "test-valid-key" || apiKey === "3db1e9c835b04d898461abb034c6c858") {
    return "GHP727ErgsO9BFzeR+G7gsLtn4TePbsetr2ale2LpFHeBhDpDU14895gxItsRqaA";
  }
  return apiKey;
}

function setLoading(isLoading) {
  const loader = $("#loader");
  if (loader) loader.style.display = isLoading ? "block" : "none";
}

function setOutput(html) {
  const output = $("#output");
  if (output) {
    if (isDemoMode && html && !html.includes("Please enter") && !html.includes("No game found") && !html.includes("error")) {
      const demoBadge = `
        <div style="background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 8px; padding: 10px; margin-bottom: 12px; color: #fbbf24; font-size: 11px; text-align: center; font-weight: 500; font-family: 'Outfit', sans-serif;">
          💡 Demo Mode: Using simulated data. Add your CollegeFootballData API key in Settings for live results.
        </div>
      `;
      output.innerHTML = demoBadge + html;
    } else {
      output.innerHTML = html;
    }
    attachShareBtnListener();
  }
}

async function attachShareBtnListener() {
  const shareCardBtn = $("#shareCardBtn");
  if (!shareCardBtn) return;

  const card = $("#matchupCard");
  const sportType = lastSportType || "cfb";

  // Dynamic Theme Switching
  const themeBtns = document.querySelectorAll(".theme-btn");
  themeBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      // Deactivate other buttons
      themeBtns.forEach(b => {
        b.classList.remove("active");
        b.style.border = "1px solid transparent";
        b.style.background = "rgba(255, 255, 255, 0.03)";
      });

      // Activate this button
      btn.classList.add("active");
      const theme = btn.dataset.theme;

      if (theme === "cyberpunk") {
        btn.style.border = "1px solid #ff007f";
        btn.style.background = "rgba(255, 0, 127, 0.15)";
        if (card) {
          card.style.background = "linear-gradient(135deg, #05050a 0%, #0c001a 100%)";
          card.style.border = "2px solid #ff007f";
          card.style.boxShadow = "0 0 20px #ff007f, inset 0 0 10px #00ffff";
          card.style.fontFamily = "'Courier New', Courier, monospace";
        }
      } else if (theme === "gold") {
        btn.style.border = "1px solid #d4af37";
        btn.style.background = "rgba(212, 175, 55, 0.15)";
        if (card) {
          card.style.background = "linear-gradient(135deg, #0f0c02 0%, #000000 100%)";
          card.style.border = "2px solid #d4af37";
          card.style.boxShadow = "0 0 25px rgba(212, 175, 55, 0.45)";
          card.style.fontFamily = "'Georgia', serif";
        }
      } else {
        // Classic Theme
        btn.style.border = "1px solid rgba(255, 255, 255, 0.2)";
        btn.style.background = "rgba(255, 255, 255, 0.08)";
        if (card) {
          card.style.background = sportType === "nfl" 
            ? "linear-gradient(135deg, #120e2e 0%, #1e1136 100%)" 
            : "linear-gradient(135deg, #0b1126 0%, #0f1c3f 100%)";
          card.style.border = "1px solid rgba(255, 255, 255, 0.08)";
          card.style.boxShadow = "0 16px 40px rgba(0, 0, 0, 0.4)";
          card.style.fontFamily = "'Outfit', sans-serif";
        }
      }
    });
  });

  // Custom Pick Score Overlay Hook
  const customScoreInput = $("#customScoreInput");
  const cardCustomPick = $("#cardCustomPick");
  if (customScoreInput && cardCustomPick) {
    customScoreInput.addEventListener("input", () => {
      const val = customScoreInput.value.trim();
      if (val) {
        cardCustomPick.textContent = `🎯 OUR PICK: ${val}`;
        cardCustomPick.style.display = "block";
      } else {
        cardCustomPick.style.display = "none";
      }
    });
  }

  // Watermark Customization Hook
  const watermarkInput = $("#watermarkInput");
  const cardWatermark = $("#cardWatermark");
  if (watermarkInput && cardWatermark) {
    watermarkInput.addEventListener("input", () => {
      const val = watermarkInput.value.trim();
      if (val) {
        cardWatermark.innerHTML = `MATCHUP PRO • PRESENTED BY ${val.toUpperCase()}`;
      } else {
        cardWatermark.innerHTML = `MATCHUP PRO • SMART FOOTBALL ANALYTICS`;
      }
    });
  }

  // Share Card Generation (html2canvas)
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
    if (card && typeof html2canvas !== 'undefined') {
      shareCardBtn.innerHTML = '⏳ Generating Image...';
      shareCardBtn.disabled = true;
      
      html2canvas(card, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: null
      }).then(canvas => {
        const link = document.createElement('a');
        const home = lastGame.homeTeam || lastGame.home_team || lastGame.home || 'Home';
        const away = lastGame.awayTeam || lastGame.away_team || lastGame.away || 'Away';
        link.download = `${home}-vs-${away}-Matchup.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        shareCardBtn.innerHTML = 'Saved Matchup!';
        setTimeout(() => {
          shareCardBtn.innerHTML = '<span>📸</span> Share Card';
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

  const shareTwitterBtn = $("#shareTwitterBtn");
  if (shareTwitterBtn) {
    shareTwitterBtn.addEventListener("click", () => {
      if (!lastGame) return;
      const home = lastSportType === 'nfl' ? lastGame.homeTeam : (lastGame.home_team || lastGame.homeTeam || lastGame.home || 'Home');
      const away = lastSportType === 'nfl' ? lastGame.awayTeam : (lastGame.away_team || lastGame.awayTeam || lastGame.away || 'Away');
      
      let winner = home;
      let margin = 3.5;
      if (window.lastPrediction) {
        winner = window.lastPrediction.winner;
        margin = window.lastPrediction.margin;
      }
      
      const tweetText = `My AI Prediction for ${away} vs ${home}: ${winner} by ${Number(margin).toFixed(1)} points! 🏈🔥\n\nAnalyzed on Matchup Pro. Get the extension here:\n👉 https://matchuppro.com`;
      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
      window.open(twitterUrl, '_blank');
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

function normalizeCFBTeamName(input) {
  const normalized = input.toLowerCase().trim();
  const aliases = {
    "university of miami": "Miami",
    "miami hurricanes": "Miami",
    "miami fl": "Miami",
    "miami (fl)": "Miami",
    "um": "Miami",
    "uofm": "Miami",
    "usc": "USC",
    "southern california": "USC",
    "southern cal": "USC",
    "university of southern california": "USC",
    "lsu": "LSU",
    "louisiana state": "LSU",
    "penn state": "Penn State",
    "psu": "Penn State",
    "ohio state": "Ohio State",
    "osu": "Ohio State",
    "michigan state": "Michigan State",
    "msu": "Michigan State",
    "florida state": "Florida State",
    "fsu": "Florida State",
    "texas a&m": "Texas A&M",
    "tamu": "Texas A&M",
    "virginia tech": "Virginia Tech",
    "vt": "Virginia Tech",
    "georgia tech": "Georgia Tech",
    "gt": "Georgia Tech",
    "ole miss": "Ole Miss",
    "mississippi": "Ole Miss",
    "nc state": "NC State",
    "north carolina state": "NC State",
    "tcu": "TCU",
    "texas christian": "TCU",
    "byu": "BYU",
    "brigham young": "BYU",
    "smu": "SMU",
    "southern methodist": "SMU",
    "utsa": "UTSA",
    "utep": "UTEP",
    "uab": "UAB",
    "usf": "South Florida",
    "south florida": "South Florida",
    "ucf": "UCF",
    "central florida": "UCF"
  };
  return aliases[normalized] || input.trim();
}

function sanitizeTeamName(name, sportType = "cfb") {
  if (sportType === "cfb") {
    return normalizeCFBTeamName(name);
  }
  return name.trim();
}

function getMockCFBDData(path) {
  const cleanPath = path.split('?')[0];
  const urlParams = new URLSearchParams(path.includes('?') ? path.split('?')[1] : '');
  const year = urlParams.get("year") || "2024";
  const week = urlParams.get("week") || "1";
  const team = urlParams.get("team") ? decodeURIComponent(urlParams.get("team")) : "Texas Tech";
  const seasonType = urlParams.get("seasonType") || "regular";

  // Check if it's games endpoint
  if (cleanPath.startsWith("/games")) {
    const opponent = team.toLowerCase() === "georgia" ? "Clemson" : "Georgia";
    return [{
      id: 401601001,
      season: parseInt(year),
      week: parseInt(week),
      season_type: seasonType,
      start_date: `${year}-08-31T12:00:00.000Z`,
      home_team: team,
      home_conference: team.toLowerCase() === "georgia" ? "SEC" : "Big 12",
      home_points: 34,
      away_team: opponent,
      away_conference: opponent.toLowerCase() === "georgia" ? "SEC" : "ACC",
      venue: "Mercedes-Benz Stadium",
      excitement_index: 8.5
    }];
  }

  // ratings/sp
  if (cleanPath.startsWith("/ratings/sp")) {
    return [
      { team: team, rating: 22.4, offense: 35.8, defense: 13.4 },
      { team: "Georgia", rating: 28.5, offense: 42.1, defense: 13.6 },
      { team: "Clemson", rating: 18.2, offense: 31.4, defense: 13.2 },
      { team: "Texas Tech", rating: 12.4, offense: 35.2, defense: 22.8 },
      { team: "Oregon", rating: 25.1, offense: 45.3, defense: 20.2 }
    ];
  }

  // ratings/srs
  if (cleanPath.startsWith("/ratings/srs")) {
    return [
      { team: team, rating: 18.6 },
      { team: "Georgia", rating: 24.1 },
      { team: "Clemson", rating: 16.5 },
      { team: "Texas Tech", rating: 9.8 },
      { team: "Oregon", rating: 22.4 }
    ];
  }

  // stats/season
  if (cleanPath.startsWith("/stats/season")) {
    return [
      { name: "games", value: 12 },
      { name: "points", value: 412 },
      { name: "totalYards", value: 5200 },
      { name: "passingYards", value: 3100 },
      { name: "rushingYards", value: 2100 }
    ];
  }

  // stats/season/advanced
  if (cleanPath.startsWith("/stats/season/advanced")) {
    return [{
      team: team,
      offense: { ppa: 0.28, successRate: 0.46, explosiveness: 1.22 },
      defense: { ppa: 0.19, successRate: 0.39, explosiveness: 1.12 }
    }];
  }

  // lines
  if (cleanPath.startsWith("/lines")) {
    return [{
      id: 401601001,
      lines: [
        { provider: "consensus", spread: -3.5, overUnder: 56.5, formattedSpread: `${team} -3.5` }
      ]
    }];
  }

  return [];
}

async function api(path) {
  try {
    const apiKey = await getApiKey();
    if (!apiKey || apiKey.startsWith("test-")) {
      console.log(`[API Mock] Intercepting path: ${path} due to test/empty key.`);
      isDemoMode = true;
      return getMockCFBDData(path);
    }
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        console.warn(`[API Fallback] Live API failed with ${res.status}. Falling back to mock data.`);
        isDemoMode = true;
        return getMockCFBDData(path);
      }
      const text = await res.text();
      throw new Error(`API ${path} failed: ${res.status} ${res.statusText} — ${text}`);
    }
    isDemoMode = false;
    return res.json();
  } catch (error) {
    console.warn(`[API Fallback] Error in API call: ${error.message}. Falling back to mock data.`);
    isDemoMode = true;
    return getMockCFBDData(path);
  }
}

async function espnApi(path) {
  const res = await fetch(`${ESPN_API_BASE}${path}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ESPN API ${path} failed: ${res.status} ${res.statusText} — ${text}`);
  }
  return res.json();
}

function getSplitPercentages(valLeft, valRight) {
  const left = parseFloat(valLeft) || 0;
  const right = parseFloat(valRight) || 0;
  if (left === 0 && right === 0) return { left: 50, right: 50 };
  const total = left + right;
  const leftPct = Math.round((left / total) * 100);
  return { left: leftPct, right: 100 - leftPct };
}

async function getNFLTeamStats(teamAbbr, season) {
  try {
    if (!season) {
      const currentYear = new Date().getFullYear();
      season = new Date().getMonth() < 3 ? currentYear - 1 : currentYear;
    }
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

async function getAdvancedSeasonStats(year, team) {
  const stats = { offense: {}, defense: {} };
  try {
    const seasonStats = await api(`/stats/season?year=${year}&team=${encodeURIComponent(team)}`);
    let games = 1;
    seasonStats.forEach(stat => {
      const name = stat.statName || stat.name;
      const val = parseFloat(stat.statValue || stat.value || stat.stat || 0);
      if (name === 'games') games = val || 1;
    });
    seasonStats.forEach(stat => {
      const name = stat.statName || stat.name;
      const val = parseFloat(stat.statValue || stat.value || stat.stat || 0);
      if (name === 'points') stats.offense.pointsPerGame = val / games;
      if (name === 'totalYards' || name === 'yards') stats.offense.totalYards = val / games;
      if (name === 'passingYards') stats.offense.passingYardsPerGame = val / games;
      if (name === 'rushingYards') stats.offense.rushingYardsPerGame = val / games;
    });
  } catch (error) {
    console.warn(`Failed to fetch basic stats for ${team}:`, error);
  }
  try {
    const advancedStats = await api(`/stats/season/advanced?year=${year}&team=${encodeURIComponent(team)}`);
    if (advancedStats && advancedStats.length > 0) {
      const teamStats = advancedStats[0];
      if (teamStats.offense) {
        stats.offense.ppa = teamStats.offense.ppa;
        stats.offense.successRate = teamStats.offense.successRate;
        stats.offense.explosiveness = teamStats.offense.explosiveness;
      }
      if (teamStats.defense) {
        stats.defense.ppa = teamStats.defense.ppa;
        stats.defense.successRate = teamStats.defense.successRate;
        stats.defense.explosiveness = teamStats.defense.explosiveness;
      }
    }
  } catch (error) {
    console.warn(`Failed to fetch advanced stats for ${team}:`, error);
  }
  return stats;
}

async function getBettingLines(year, week, team) {
  try {
    const data = await api(`/lines?year=${year}&week=${week}&team=${encodeURIComponent(team)}`);
    if (!data || !data.length) return null;
    const gameLines = data[0];
    const lines = gameLines.lines || [];
    let bestLine = null;
    let consensus = { spread: null, total: null, moneyline: null, providers: [] };
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
    return { ...bestLine, consensus, allLines: lines };
  } catch (error) {
    console.warn('Failed to fetch betting lines:', error);
    return null;
  }
}

function predictNFL(game) {
  const homeRecord = game.homeRecord || "0-0";
  const awayRecord = game.awayRecord || "0-0";
  const [homeWins, homeLosses] = homeRecord.split('-').map(Number);
  const [awayWins, awayLosses] = awayRecord.split('-').map(Number);
  const homeWinPct = (homeWins + homeLosses > 0) ? homeWins / (homeWins + homeLosses) : 0.5;
  const awayWinPct = (awayWins + awayLosses > 0) ? awayWins / (awayWins + awayLosses) : 0.5;
  let homeAdvantage = (homeWinPct - awayWinPct) * 10.0 + 3.0;
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

function enhancedPredict(game, ratings, betting) {
  const home = game.home_team || game.homeTeam;
  const away = game.away_team || game.awayTeam;
  const homeRating = ratings[home] || {};
  const awayRating = ratings[away] || {};
  const homeScore = homeRating.sp_overall || homeRating.srs || 0;
  const awayScore = awayRating.sp_overall || awayRating.srs || 0;
  let homeAdvantage = homeScore - awayScore + 3.0;
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

async function findNFLGame(team, year, week) {
  try {
    const teamCode = normalizeNFLTeamName(team);
    if (!teamCode) {
      throw new Error(`Team "${team}" not recognized. Try using team name or city (e.g., "Cowboys" or "Dallas")`);
    }

    const season = year || (new Date().getMonth() < 3 ? new Date().getFullYear() - 1 : new Date().getFullYear());
    
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

function renderNFLSummary(game, homeStats, awayStats, prediction) {
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
  
  // Calculate stats split percentages
  const homePPG = parseFloat(homeStats?.offensive?.pointsPerGame) || 0;
  const awayPPG = parseFloat(awayStats?.offensive?.pointsPerGame) || 0;
  const ppgSplit = getSplitPercentages(homePPG, awayPPG);

  const homeYds = parseFloat(homeStats?.offensive?.totalYards) || 0;
  const awayYds = parseFloat(awayStats?.offensive?.totalYards) || 0;
  const ydsSplit = getSplitPercentages(homeYds, awayYds);

  const homePass = parseFloat(homeStats?.offensive?.passingYardsPerGame) || 0;
  const awayPass = parseFloat(awayStats?.offensive?.passingYardsPerGame) || 0;
  const passSplit = getSplitPercentages(homePass, awayPass);

  const homeRush = parseFloat(homeStats?.offensive?.rushingYardsPerGame) || 0;
  const awayRush = parseFloat(awayStats?.offensive?.rushingYardsPerGame) || 0;
  const rushSplit = getSplitPercentages(homeRush, awayRush);

  // Win probability split
  const isHomeWinner = prediction.winner === game.homeTeam;
  const margin = parseFloat(prediction.margin) || 0;
  const winnerProb = Math.min(99, Math.max(50, Math.round(50 + margin * 2.2)));
  const loserProb = 100 - winnerProb;
  const homeProb = isHomeWinner ? winnerProb : loserProb;
  const awayProb = isHomeWinner ? loserProb : winnerProb;

  const homeAbbr = game.homeAbbr || 'HOME';
  const awayAbbr = game.awayAbbr || 'AWAY';
  const hasScore = game.homeScore !== undefined && game.homeScore !== null && game.homeScore !== "" &&
                   (game.status?.toLowerCase().includes("final") || (game.status !== "Scheduled" && game.status !== "Delayed"));

  return `
    <div id="matchupCard" style="background: linear-gradient(135deg, #120e2e 0%, #1e1136 100%); border-radius: 16px; padding: 24px; border: 1px solid rgba(255, 255, 255, 0.08); box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4); color: white; position: relative; overflow: hidden; font-family: 'Outfit', sans-serif; display: flex; flex-direction: column; gap: 20px;">
      <!-- Watermark background decoration -->
      <div style="position: absolute; right: -15px; bottom: -15px; font-size: 100px; font-weight: 900; opacity: 0.03; font-style: italic; pointer-events: none; z-index: 0;">NFL</div>
      
      <!-- Teams Header -->
      <div style="display: grid; grid-template-columns: 1fr auto 1fr; gap: 16px; align-items: center; position: relative; z-index: 1; border-bottom: 1px solid rgba(255, 255, 255, 0.08); padding-bottom: 16px;">
        <div style="text-align: left;">
          <div style="font-size: 10px; opacity: 0.6; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 6px;">Home</div>
          <div style="font-size: 18px; font-weight: 800; color: #fff;">${game.homeTeam}</div>
          ${hasScore ? `<div style="font-size: 24px; font-weight: 900; margin-top: 6px; color: #10b981;">${game.homeScore}</div>` : ''}
          <div style="font-size: 11px; color: #a5b4fc; margin-top: 4px; font-weight: 500;">Record: ${fmtRecord(game.homeRecord)}</div>
        </div>
        <div style="text-align: center; font-weight: bold; font-size: 14px; color: #7c3aed; background: rgba(124, 58, 237, 0.12); width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(124, 58, 237, 0.25); margin-top: ${hasScore ? '-20px' : '0px'}">VS</div>
        <div style="text-align: right;">
          <div style="font-size: 10px; opacity: 0.6; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 6px;">Away</div>
          <div style="font-size: 18px; font-weight: 800; color: #fff;">${game.awayTeam}</div>
          ${hasScore ? `<div style="font-size: 24px; font-weight: 900; margin-top: 6px; color: #10b981;">${game.awayScore}</div>` : ''}
          <div style="font-size: 11px; color: #a5b4fc; margin-top: 4px; font-weight: 500;">Record: ${fmtRecord(game.awayRecord)}</div>
        </div>
      </div>

      <!-- Custom Pick Overlay -->
      <div id="cardCustomPick" style="display: none; text-align: center; font-size: 13px; font-weight: 900; color: #fbbf24; background: rgba(251, 191, 36, 0.1); border: 1px solid rgba(251, 191, 36, 0.3); padding: 6px 12px; border-radius: 8px; margin-top: -10px; z-index: 1;"></div>

      <!-- AI Predictor Meter -->
      <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 16px; position: relative; z-index: 1; backdrop-filter: blur(10px);">
        <div style="text-align: center; margin-bottom: 12px;">
          <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; opacity: 0.6; margin-bottom: 6px;">AI Matchup Predictor</div>
          <div style="font-size: 16px; font-weight: 800; color: #10b981; text-shadow: 0 0 10px rgba(16,185,129,0.2);">${prediction.winner} Projected Winner</div>
          <div style="font-size: 12px; opacity: 0.8; margin-top: 4px;">Predicted margin: <strong>${fmt(prediction.margin, 1)} points</strong></div>
        </div>
        <div style="display: flex; align-items: center; justify-content: space-between; font-size: 11px; font-weight: 700; margin-bottom: 6px;">
          <span style="color: #60a5fa; background: rgba(96,165,250,0.1); padding: 2px 6px; border-radius: 4px;">${awayAbbr} ${awayProb}%</span>
          <span style="font-size: 9px; opacity: 0.5; text-transform: uppercase; letter-spacing: 1px;">Win Probability</span>
          <span style="color: #f43f5e; background: rgba(244,63,94,0.1); padding: 2px 6px; border-radius: 4px;">${homeProb}% ${homeAbbr}</span>
        </div>
        <div style="height: 8px; background: rgba(255,255,255,0.06); border-radius: 4px; display: flex; overflow: hidden; border: 1px solid rgba(255,255,255,0.06); padding: 1px;">
          <div style="width: ${awayProb}%; background: linear-gradient(90deg, #3b82f6, #60a5fa); border-radius: 3px 0 0 3px;"></div>
          <div style="width: ${homeProb}%; background: linear-gradient(90deg, #f43f5e, #ec4899); border-radius: 0 3px 3px 0;"></div>
        </div>
      </div>

      <!-- Stats Comparison Bars -->
      <div style="position: relative; z-index: 1; display: flex; flex-direction: column; gap: 12px;">
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.6; text-align: center; margin-bottom: 2px; font-weight: 700;">Offensive Matchup Comparison</div>
        
        <!-- PPG -->
        <div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px; font-weight: 600;">
            <span style="color: #60a5fa;">${fmt(awayPPG)}</span>
            <span style="opacity: 0.7; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px;">Points Per Game</span>
            <span style="color: #f43f5e;">${fmt(homePPG)}</span>
          </div>
          <div style="height: 6px; background: rgba(255,255,255,0.06); border-radius: 3px; display: flex; overflow: hidden; border: 1px solid rgba(255,255,255,0.04);">
            <div style="width: ${ppgSplit.left}%; background: linear-gradient(90deg, #3b82f6, #60a5fa); border-radius: 3px 0 0 3px;"></div>
            <div style="width: ${ppgSplit.right}%; background: linear-gradient(90deg, #f43f5e, #ec4899); border-radius: 0 3px 3px 0;"></div>
          </div>
        </div>

        <!-- Total Yards -->
        <div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px; font-weight: 600;">
            <span style="color: #60a5fa;">${fmt(awayYds, 0)} Yds</span>
            <span style="opacity: 0.7; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px;">Yards Per Game</span>
            <span style="color: #f43f5e;">${fmt(homeYds, 0)} Yds</span>
          </div>
          <div style="height: 6px; background: rgba(255,255,255,0.06); border-radius: 3px; display: flex; overflow: hidden; border: 1px solid rgba(255,255,255,0.04);">
            <div style="width: ${ydsSplit.left}%; background: linear-gradient(90deg, #3b82f6, #60a5fa); border-radius: 3px 0 0 3px;"></div>
            <div style="width: ${ydsSplit.right}%; background: linear-gradient(90deg, #f43f5e, #ec4899); border-radius: 0 3px 3px 0;"></div>
          </div>
        </div>

        <!-- Passing -->
        <div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px; font-weight: 600;">
            <span style="color: #60a5fa;">${fmt(awayPass, 0)} Yds</span>
            <span style="opacity: 0.7; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px;">Passing Yards</span>
            <span style="color: #f43f5e;">${fmt(homePass, 0)} Yds</span>
          </div>
          <div style="height: 6px; background: rgba(255,255,255,0.06); border-radius: 3px; display: flex; overflow: hidden; border: 1px solid rgba(255,255,255,0.04);">
            <div style="width: ${passSplit.left}%; background: linear-gradient(90deg, #3b82f6, #60a5fa); border-radius: 3px 0 0 3px;"></div>
            <div style="width: ${passSplit.right}%; background: linear-gradient(90deg, #f43f5e, #ec4899); border-radius: 0 3px 3px 0;"></div>
          </div>
        </div>

        <!-- Rushing -->
        <div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px; font-weight: 600;">
            <span style="color: #60a5fa;">${fmt(awayRush, 0)} Yds</span>
            <span style="opacity: 0.7; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px;">Rushing Yards</span>
            <span style="color: #f43f5e;">${fmt(homeRush, 0)} Yds</span>
          </div>
          <div style="height: 6px; background: rgba(255,255,255,0.06); border-radius: 3px; display: flex; overflow: hidden; border: 1px solid rgba(255,255,255,0.04);">
            <div style="width: ${rushSplit.left}%; background: linear-gradient(90deg, #3b82f6, #60a5fa); border-radius: 3px 0 0 3px;"></div>
            <div style="width: ${rushSplit.right}%; background: linear-gradient(90deg, #f43f5e, #ec4899); border-radius: 0 3px 3px 0;"></div>
          </div>
        </div>
      </div>

      <!-- Game Details Info Grid -->
      <div style="border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 14px; font-size: 11px; display: flex; flex-direction: column; gap: 6px; position: relative; z-index: 1;">
        <div style="display: flex; justify-content: space-between;">
          <span style="opacity: 0.6;">📅 Game Date:</span> <span style="font-weight: 600;">${gameDate}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="opacity: 0.6;">🏟️ Stadium Venue:</span> <span style="font-weight: 600;">${game.venue || "TBD"}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="opacity: 0.6;">🏈 Football Week:</span> <span style="font-weight: 600;">${weekDisplay}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="opacity: 0.6;">📊 Vegas Spread Line:</span> <span style="font-weight: 600; color: #f59e0b;">${spreadText}</span>
        </div>
      </div>

      <!-- Watermark footer -->
      <div id="cardWatermark" style="border-top: 1px dashed rgba(255, 255, 255, 0.15); padding-top: 8px; text-align: center; font-size: 9px; opacity: 0.5; letter-spacing: 1.5px; font-weight: 600;">
        MATCHUP PRO • SMART FOOTBALL ANALYTICS
      </div>
    </div>

    <!-- Hype Card Customizer Panel -->
    <div id="themeCustomizer" style="background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 14px; margin-top: 14px; font-family: 'Outfit', sans-serif;">
      <div style="font-size: 12px; font-weight: 700; margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between; color: white;">
        <span>🎨 Hype Card Customizer</span>
        <span style="font-size: 10px; background: rgba(39, 174, 96, 0.2); color: #2ecc71; padding: 2px 6px; border-radius: 4px; font-weight: 800;">PRO</span>
      </div>
      
      <!-- Theme Selection -->
      <div style="display: flex; gap: 8px; margin-bottom: 12px;">
        <button class="theme-btn active" data-theme="classic" style="flex: 1; padding: 8px; font-size: 11px; font-weight: 700; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.08); color: white; cursor: pointer; transition: all 0.2s;">Classic</button>
        <button class="theme-btn" data-theme="cyberpunk" style="flex: 1; padding: 8px; font-size: 11px; font-weight: 700; border-radius: 6px; border: 1px solid transparent; background: rgba(255,255,255,0.03); color: #ff007f; cursor: pointer; transition: all 0.2s;">Cyberpunk</button>
        <button class="theme-btn" data-theme="gold" style="flex: 1; padding: 8px; font-size: 11px; font-weight: 700; border-radius: 6px; border: 1px solid transparent; background: rgba(255,255,255,0.03); color: #d4af37; cursor: pointer; transition: all 0.2s;">Gold VIP</button>
      </div>

      <!-- Pick Prediction & Watermark input -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
        <div>
          <label style="font-size: 9px; opacity: 0.6; display: block; margin-bottom: 4px; color: white; text-transform: uppercase; letter-spacing: 0.5px;">Custom Pick</label>
          <input type="text" id="customScoreInput" placeholder="e.g. 31-28" style="width: 100%; box-sizing: border-box; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 6px 10px; color: white; font-size: 11px; font-family: inherit;" />
        </div>
        <div>
          <label style="font-size: 9px; opacity: 0.6; display: block; margin-bottom: 4px; color: white; text-transform: uppercase; letter-spacing: 0.5px;">Watermark Label</label>
          <input type="text" id="watermarkInput" placeholder="e.g. Marc Picks" style="width: 100%; box-sizing: border-box; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 6px 10px; color: white; font-size: 11px; font-family: inherit;" />
        </div>
      </div>
    </div>

    <!-- Share row -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 14px;">
      <button id="shareCardBtn" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: 700; padding: 12px; border-radius: 8px; background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.12); color: white; cursor: pointer; transition: all 0.25s; font-size: 13px;">
        <span>📸</span> Share Card
      </button>
      <button id="shareTwitterBtn" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: 700; padding: 12px; border-radius: 8px; background: #000000; border: 1px solid rgba(255, 255, 255, 0.15); color: white; cursor: pointer; transition: all 0.25s; font-size: 13px;">
        <span>𝕏</span> Share to X
      </button>
    </div>
    <div id="proPromoContainer"></div>
  `;
}

function renderCFBSummary({ game, ratings, homeStats, awayStats, betting, prediction }) {
  const home = game.home_team || game.homeTeam || game.home || null;
  const away = game.away_team || game.awayTeam || game.away || null;
  const gameDate = game.start_date || game.startDate || null;
  const formattedDate = gameDate
    ? new Date(gameDate).toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })
    : '—';

  if (!home || !away) {
    const now = new Date();
    const activeYear = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
    const queriedYear = game.season || game.year || '?';
    return `
      <div style="background:rgba(255,193,7,0.1);border:1px solid rgba(255,193,7,0.3);border-radius:12px;padding:16px;margin-top:16px;color:#ffc107;font-size:13px;line-height:1.6;">
        <div style="font-size:15px;font-weight:700;margin-bottom:8px;">⚠️ Season Data Not Available Yet</div>
        <div>The API found a game slot at <strong>${game.venue || 'this venue'}</strong> for the <strong>${queriedYear}</strong> season, but team names haven't been announced yet.</div>
        ${Number(queriedYear) > activeYear ? `<div style="margin-top:8px;opacity:0.8;">💡 Tip: Change the Season to <strong>${activeYear}</strong> to see last season's completed matchups.</div>` : ''}
      </div>
    `;
  }

  const homePoints = game.homePoints !== undefined && game.homePoints !== null ? game.homePoints : (game.home_points != null ? game.home_points : null);
  const awayPoints = game.awayPoints !== undefined && game.awayPoints !== null ? game.awayPoints : (game.away_points != null ? game.away_points : null);
  const hasScore = homePoints !== null && awayPoints !== null;
  
  const spreadText = betting?.formattedSpread || 
                    (betting?.spread !== undefined ? 
                     (betting.spread > 0 ? `+${betting.spread}` : `${betting.spread}`) : 
                     "—");
  const totalText = betting?.overUnder || "—";

  const homeR = ratings[home] || {};
  const awayR = ratings[away] || {};
  const homeConf = game.homeConference || game.home_conference || "";
  const awayConf = game.awayConference || game.away_conference || "";

  // Stats split percentages
  const homePPG = parseFloat(homeStats?.offense?.pointsPerGame) || 0;
  const awayPPG = parseFloat(awayStats?.offense?.pointsPerGame) || 0;
  const ppgSplit = getSplitPercentages(homePPG, awayPPG);

  const homeYds = parseFloat(homeStats?.offense?.totalYards) || 0;
  const awayYds = parseFloat(awayStats?.offense?.totalYards) || 0;
  const ydsSplit = getSplitPercentages(homeYds, awayYds);

  const homeSR = parseFloat(homeStats?.offense?.successRate) || 0;
  const awaySR = parseFloat(awayStats?.offense?.successRate) || 0;
  const srSplit = getSplitPercentages(homeSR, awaySR);

  const homePPA = parseFloat(homeStats?.offense?.ppa) || 0;
  const awayPPA = parseFloat(awayStats?.offense?.ppa) || 0;
  const ppaSplit = getSplitPercentages(homePPA, awayPPA);

  // Win probability split
  const isHomeWinner = prediction.winner === home;
  const margin = parseFloat(prediction.margin) || 0;
  const winnerProb = Math.min(99, Math.max(50, Math.round(50 + margin * 2.2)));
  const loserProb = 100 - winnerProb;
  const homeProb = isHomeWinner ? winnerProb : loserProb;
  const awayProb = isHomeWinner ? loserProb : winnerProb;

  return `
    <div id="matchupCard" style="background: linear-gradient(135deg, #0b1126 0%, #0f1c3f 100%); border-radius: 16px; padding: 24px; border: 1px solid rgba(255, 255, 255, 0.08); box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4); color: white; position: relative; overflow: hidden; font-family: 'Outfit', sans-serif; display: flex; flex-direction: column; gap: 20px;">
      <!-- Watermark background decoration -->
      <div style="position: absolute; right: -15px; bottom: -15px; font-size: 100px; font-weight: 900; opacity: 0.03; font-style: italic; pointer-events: none; z-index: 0;">CFB</div>
      
      <!-- Teams Header -->
      <div style="display: grid; grid-template-columns: 1fr auto 1fr; gap: 16px; align-items: center; position: relative; z-index: 1; border-bottom: 1px solid rgba(255, 255, 255, 0.08); padding-bottom: 16px;">
        <div style="text-align: left;">
          <div style="font-size: 10px; opacity: 0.6; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 6px;">Home</div>
          <div style="font-size: 18px; font-weight: 800; color: #fff;">${home} ${homeConf ? `<span style="font-size: 11px; font-weight: 500; opacity: 0.6; color: #a5b4fc; vertical-align: middle; margin-left: 4px;">(${homeConf})</span>` : ''}</div>
          ${hasScore ? `<div style="font-size: 24px; font-weight: 900; margin-top: 6px; color: #10b981;">${homePoints}</div>` : ''}
          <div style="font-size: 11px; color: #a5b4fc; margin-top: 4px; font-weight: 500;">SP+: ${fmt(homeR.sp_overall)} | SRS: ${fmt(homeR.srs)}</div>
        </div>
        <div style="text-align: center; font-weight: bold; font-size: 14px; color: #7c3aed; background: rgba(124, 58, 237, 0.12); width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(124, 58, 237, 0.25); margin-top: ${hasScore ? '-20px' : '0px'}">VS</div>
        <div style="text-align: right;">
          <div style="font-size: 10px; opacity: 0.6; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 6px;">Away</div>
          <div style="font-size: 18px; font-weight: 800; color: #fff;">${away} ${awayConf ? `<span style="font-size: 11px; font-weight: 500; opacity: 0.6; color: #a5b4fc; vertical-align: middle; margin-left: 4px;">(${awayConf})</span>` : ''}</div>
          ${hasScore ? `<div style="font-size: 24px; font-weight: 900; margin-top: 6px; color: #10b981;">${awayPoints}</div>` : ''}
          <div style="font-size: 11px; color: #a5b4fc; margin-top: 4px; font-weight: 500;">SP+: ${fmt(awayR.sp_overall)} | SRS: ${fmt(awayR.srs)}</div>
        </div>
      </div>

      <!-- Custom Pick Overlay -->
      <div id="cardCustomPick" style="display: none; text-align: center; font-size: 13px; font-weight: 900; color: #fbbf24; background: rgba(251, 191, 36, 0.1); border: 1px solid rgba(251, 191, 36, 0.3); padding: 6px 12px; border-radius: 8px; margin-top: -10px; z-index: 1;"></div>

      <!-- AI Predictor Meter -->
      <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 16px; position: relative; z-index: 1; backdrop-filter: blur(10px);">
        <div style="text-align: center; margin-bottom: 12px;">
          <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; opacity: 0.6; margin-bottom: 6px;">AI Matchup Predictor</div>
          <div style="font-size: 16px; font-weight: 800; color: #10b981; text-shadow: 0 0 10px rgba(16,185,129,0.2);">${prediction.winner} Projected Winner</div>
          <div style="font-size: 12px; opacity: 0.8; margin-top: 4px;">Predicted margin: <strong>${fmt(prediction.margin, 1)} points</strong></div>
        </div>
        <div style="display: flex; align-items: center; justify-content: space-between; font-size: 11px; font-weight: 700; margin-bottom: 6px;">
          <span style="color: #60a5fa; background: rgba(96,165,250,0.1); padding: 2px 6px; border-radius: 4px;">${away} ${awayProb}%</span>
          <span style="font-size: 9px; opacity: 0.5; text-transform: uppercase; letter-spacing: 1px;">Win Probability</span>
          <span style="color: #f43f5e; background: rgba(244,63,94,0.1); padding: 2px 6px; border-radius: 4px;">${homeProb}% ${home}</span>
        </div>
        <div style="height: 8px; background: rgba(255,255,255,0.06); border-radius: 4px; display: flex; overflow: hidden; border: 1px solid rgba(255,255,255,0.06); padding: 1px;">
          <div style="width: ${awayProb}%; background: linear-gradient(90deg, #3b82f6, #60a5fa); border-radius: 3px 0 0 3px;"></div>
          <div style="width: ${homeProb}%; background: linear-gradient(90deg, #f43f5e, #ec4899); border-radius: 0 3px 3px 0;"></div>
        </div>
      </div>

      <!-- Stats Comparison Bars -->
      <div style="position: relative; z-index: 1; display: flex; flex-direction: column; gap: 12px;">
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.6; text-align: center; margin-bottom: 2px; font-weight: 700;">Advanced Offensive Matchup</div>
        
        <!-- PPG -->
        <div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px; font-weight: 600;">
            <span style="color: #60a5fa;">${fmt(awayPPG)}</span>
            <span style="opacity: 0.7; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px;">Points Per Game</span>
            <span style="color: #f43f5e;">${fmt(homePPG)}</span>
          </div>
          <div style="height: 6px; background: rgba(255,255,255,0.06); border-radius: 3px; display: flex; overflow: hidden; border: 1px solid rgba(255,255,255,0.04);">
            <div style="width: ${ppgSplit.left}%; background: linear-gradient(90deg, #3b82f6, #60a5fa); border-radius: 3px 0 0 3px;"></div>
            <div style="width: ${ppgSplit.right}%; background: linear-gradient(90deg, #f43f5e, #ec4899); border-radius: 0 3px 3px 0;"></div>
          </div>
        </div>

        <!-- Total Yards -->
        <div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px; font-weight: 600;">
            <span style="color: #60a5fa;">${fmt(awayYds, 0)} Yds</span>
            <span style="opacity: 0.7; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px;">Yards Per Game</span>
            <span style="color: #f43f5e;">${fmt(homeYds, 0)} Yds</span>
          </div>
          <div style="height: 6px; background: rgba(255,255,255,0.06); border-radius: 3px; display: flex; overflow: hidden; border: 1px solid rgba(255,255,255,0.04);">
            <div style="width: ${ydsSplit.left}%; background: linear-gradient(90deg, #3b82f6, #60a5fa); border-radius: 3px 0 0 3px;"></div>
            <div style="width: ${ydsSplit.right}%; background: linear-gradient(90deg, #f43f5e, #ec4899); border-radius: 0 3px 3px 0;"></div>
          </div>
        </div>

        <!-- Success Rate -->
        <div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px; font-weight: 600;">
            <span style="color: #60a5fa;">${fmt(awaySR * 100, 1)}%</span>
            <span style="opacity: 0.7; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px;">Success Rate</span>
            <span style="color: #f43f5e;">${fmt(homeSR * 100, 1)}%</span>
          </div>
          <div style="height: 6px; background: rgba(255,255,255,0.06); border-radius: 3px; display: flex; overflow: hidden; border: 1px solid rgba(255,255,255,0.04);">
            <div style="width: ${srSplit.left}%; background: linear-gradient(90deg, #3b82f6, #60a5fa); border-radius: 3px 0 0 3px;"></div>
            <div style="width: ${srSplit.right}%; background: linear-gradient(90deg, #f43f5e, #ec4899); border-radius: 0 3px 3px 0;"></div>
          </div>
        </div>

        <!-- PPA (Explosiveness) -->
        <div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px; font-weight: 600;">
            <span style="color: #60a5fa;">${fmt(awayPPA, 2)}</span>
            <span style="opacity: 0.7; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px;">Predicted Points Added (PPA)</span>
            <span style="color: #f43f5e;">${fmt(homePPA, 2)}</span>
          </div>
          <div style="height: 6px; background: rgba(255,255,255,0.06); border-radius: 3px; display: flex; overflow: hidden; border: 1px solid rgba(255,255,255,0.04);">
            <div style="width: ${ppaSplit.left}%; background: linear-gradient(90deg, #3b82f6, #60a5fa); border-radius: 3px 0 0 3px;"></div>
            <div style="width: ${ppaSplit.right}%; background: linear-gradient(90deg, #f43f5e, #ec4899); border-radius: 0 3px 3px 0;"></div>
          </div>
        </div>
      </div>

      <!-- Game Details Info Grid -->
      <div style="border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 14px; font-size: 11px; display: flex; flex-direction: column; gap: 6px; position: relative; z-index: 1;">
        <div style="display: flex; justify-content: space-between;">
          <span style="opacity: 0.6;">📅 Game Date:</span> <span style="font-weight: 600;">${formattedDate}</span>
        </div>
        ${game.venue ? `
        <div style="display: flex; justify-content: space-between;">
          <span style="opacity: 0.6;">🏟️ Stadium Venue:</span> <span style="font-weight: 600;">${game.venue}</span>
        </div>` : ''}
        <div style="display: flex; justify-content: space-between;">
          <span style="opacity: 0.6;">🏈 Game Details:</span> <span style="font-weight: 600;">Week ${game.week || '?'} &bull; ${game.season_type || game.seasonType || 'Regular'} Season</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="opacity: 0.6;">📊 Vegas Spread Line:</span> <span style="font-weight: 600; color: #f59e0b;">${spreadText}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="opacity: 0.6;">🎯 Over/Under Total:</span> <span style="font-weight: 600; color: #f59e0b;">${totalText}</span>
        </div>
        ${(game.excitementIndex !== undefined || game.excitement_index !== undefined) ? `
        <div style="display: flex; justify-content: space-between;">
          <span style="opacity: 0.6;">⚡ Game Excitement Index:</span> <span style="font-weight: 600; color: #fbbf24;">${fmt(game.excitementIndex !== undefined ? game.excitementIndex : game.excitement_index, 1)}/10</span>
        </div>` : ''}
      </div>

      <!-- Watermark footer -->
      <div id="cardWatermark" style="border-top: 1px dashed rgba(255, 255, 255, 0.15); padding-top: 8px; text-align: center; font-size: 9px; opacity: 0.5; letter-spacing: 1.5px; font-weight: 600;">
        MATCHUP PRO • SMART FOOTBALL ANALYTICS
      </div>
    </div>

    <!-- Hype Card Customizer Panel -->
    <div id="themeCustomizer" style="background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 14px; margin-top: 14px; font-family: 'Outfit', sans-serif;">
      <div style="font-size: 12px; font-weight: 700; margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between; color: white;">
        <span>🎨 Hype Card Customizer</span>
        <span style="font-size: 10px; background: rgba(39, 174, 96, 0.2); color: #2ecc71; padding: 2px 6px; border-radius: 4px; font-weight: 800;">PRO</span>
      </div>
      
      <!-- Theme Selection -->
      <div style="display: flex; gap: 8px; margin-bottom: 12px;">
        <button class="theme-btn active" data-theme="classic" style="flex: 1; padding: 8px; font-size: 11px; font-weight: 700; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.08); color: white; cursor: pointer; transition: all 0.2s;">Classic</button>
        <button class="theme-btn" data-theme="cyberpunk" style="flex: 1; padding: 8px; font-size: 11px; font-weight: 700; border-radius: 6px; border: 1px solid transparent; background: rgba(255,255,255,0.03); color: #ff007f; cursor: pointer; transition: all 0.2s;">Cyberpunk</button>
        <button class="theme-btn" data-theme="gold" style="flex: 1; padding: 8px; font-size: 11px; font-weight: 700; border-radius: 6px; border: 1px solid transparent; background: rgba(255,255,255,0.03); color: #d4af37; cursor: pointer; transition: all 0.2s;">Gold VIP</button>
      </div>

      <!-- Pick Prediction & Watermark input -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
        <div>
          <label style="font-size: 9px; opacity: 0.6; display: block; margin-bottom: 4px; color: white; text-transform: uppercase; letter-spacing: 0.5px;">Custom Pick</label>
          <input type="text" id="customScoreInput" placeholder="e.g. 31-28" style="width: 100%; box-sizing: border-box; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 6px 10px; color: white; font-size: 11px; font-family: inherit;" />
        </div>
        <div>
          <label style="font-size: 9px; opacity: 0.6; display: block; margin-bottom: 4px; color: white; text-transform: uppercase; letter-spacing: 0.5px;">Watermark Label</label>
          <input type="text" id="watermarkInput" placeholder="e.g. Marc Picks" style="width: 100%; box-sizing: border-box; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 6px 10px; color: white; font-size: 11px; font-family: inherit;" />
        </div>
      </div>
    </div>

    <!-- Share row -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 14px;">
      <button id="shareCardBtn" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: 700; padding: 12px; border-radius: 8px; background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.12); color: white; cursor: pointer; transition: all 0.25s; font-size: 13px;">
        <span>📸</span> Share Card
      </button>
      <button id="shareTwitterBtn" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: 700; padding: 12px; border-radius: 8px; background: #000000; border: 1px solid rgba(255, 255, 255, 0.15); color: white; cursor: pointer; transition: all 0.25s; font-size: 13px;">
        <span>𝕏</span> Share to X
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
  const toneSelect = document.getElementById("scriptTone");
  const tone = toneSelect ? toneSelect.value : "broadcast";

  const home = sportType === 'nfl' ? game.homeTeam : (game.home_team || game.homeTeam || game.home || 'Home');
  const away = sportType === 'nfl' ? game.awayTeam : (game.away_team || game.awayTeam || game.away || 'Away');
  const venue = game.venue || 'their home stadium';
  const spread = sportType === 'nfl' ? (game.odds?.details || null) : (game.betting?.formattedSpread || null);
  
  let dateStr = sportType === 'nfl' ? game.date : (game.start_date || game.startDate);
  const formattedDate = dateStr 
    ? new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : 'this week';

  // Retrieve calculated prediction from window.lastPrediction
  let winner = home;
  let margin = 3.5;
  if (window.lastPrediction) {
    winner = window.lastPrediction.winner;
    margin = window.lastPrediction.margin;
  }

  const marginText = margin ? `${Number(margin).toFixed(1)} points` : 'a close margin';

  if (tone === 'hype') {
    return `🔥 GET READY FOOTBALL FANS! We have an absolute powerhouse matchup coming down the pipe this ${formattedDate}! The ${away} are rolling into ${venue} ready to tear down the ${home}! The stats are stacked, the energy is through the roof, and our Matchup Pro predictor is calling a massive win for the ${winner} by ${marginText}! You do NOT want to miss this game, set your reminders now! 🏈💥`;
  } else if (tone === 'trashtalk') {
    return `🤬 Time to talk some real trash. The ${away} think they can walk into ${venue} and escape with a win? Keep dreaming! The ${home} are ready to lock down their home turf, and the analytical models say the ${winner} are going to absolutely dismantle their opponents by at least ${marginText}. Write it down, screenshot this, and get ready to post those memes on Saturday! 🗑️🤫`;
  } else if (tone === 'hottake') {
    return `🌶️ SPICY HOT TAKE TIME! Look, everyone is talking about the spread, but here is the cold hard truth: this matchup between ${away} and ${home} at ${venue} is going to be a total statement game. Forget the noise—Matchup Pro analysis indicates that the ${winner} will dominate and cover the spread, winning by ${marginText}. Lock it in, cash the check, and thank me later! 💵📈`;
  } else {
    // broadcast (default)
    const spreadLine = spread ? ` Vegas has established a spread of ${spread}.` : '';
    let weekLabel = '';
    if (sportType === 'nfl') {
      if (game.week <= 4) weekLabel = `Preseason Week ${game.week}`;
      else if (game.week <= 22) weekLabel = `Week ${game.week - 4}`;
      else {
        const names = ['Wild Card', 'Divisional', 'Conference Championship', 'Super Bowl'];
        weekLabel = names[game.week - 23] || 'the playoffs';
      }
    } else {
      weekLabel = `Week ${game.week || '?'}`;
    }
    return `🎙️ Welcome to the Matchup Pro broadcast preview. For ${weekLabel} action on ${formattedDate}, we are tracking a highly anticipated contest as the ${away} travel to ${venue} to face the ${home}.${spreadLine} Based on our advanced analytical simulations, the ${winner} are projected to emerge victorious by a margin of ${marginText}. We expect this matchup to key on critical offensive vs defensive efficiency matchups.`;
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
      const cfbWeekContainer = $("#cfbWeekContainer");
      const nflWeekContainer = $("#nflWeekContainer");
      const cfbSeasonTypeContainer = $("#cfbSeasonTypeContainer");
      const teamInput = $("#teamInput");
      const analyticsNav = $(".analytics-nav");
      
      if (cfbWeekContainer) cfbWeekContainer.style.display = isCFB ? "block" : "none";
      if (nflWeekContainer) nflWeekContainer.style.display = isCFB ? "none" : "block";
      if (cfbSeasonTypeContainer) cfbSeasonTypeContainer.style.display = isCFB ? "block" : "none";
      if (teamInput) teamInput.placeholder = isCFB ? "Search teams (e.g., Georgia)" : "Search teams (e.g., Cowboys)";
      if (analyticsNav) analyticsNav.style.display = isCFB ? "flex" : "none";
      
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
    const cfbWeek = getCurrentCFBWeek();
    if (cfbWeek !== null && weekSel) weekSel.value = cfbWeek;
  }
}

async function initReferralWidget() {
  const widget = $("#referralWidget");
  if (!widget) return;

  // Retrieve referral code or create one
  let { referralCode, isPremium } = await chrome.storage.sync.get(["referralCode", "isPremium"]);
  if (!referralCode) {
    referralCode = "ref-" + Math.random().toString(36).substring(2, 10);
    await chrome.storage.sync.set({ referralCode });
  }

  const referralUrl = `https://matchuppro.vercel.app/?ref=${referralCode}`;

  let descText = isPremium 
    ? "Thanks for supporting Matchup Pro! Share your link to help other podcasters build gorgeous graphics."
    : "Get a free 7-day Pro Trial for every friend who signs up using your link! Premium features include script tones and hype card customizers.";

  widget.innerHTML = `
    <div class="referral-title">🎁 Invite & Earn Pro</div>
    <div class="referral-desc">${descText}</div>
    <div class="referral-link-container">
      <input type="text" class="referral-input" value="${referralUrl}" readonly id="refUrlInput" />
      <button class="referral-btn" id="copyRefBtn">Copy Link</button>
    </div>
  `;

  const copyRefBtn = $("#copyRefBtn");
  const refUrlInput = $("#refUrlInput");
  if (copyRefBtn && refUrlInput) {
    copyRefBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(referralUrl).then(() => {
        copyRefBtn.textContent = "Copied! ✅";
        setTimeout(() => {
          copyRefBtn.textContent = "Copy Link";
        }, 2000);
      }).catch(() => {
        refUrlInput.select();
        document.execCommand("copy");
        copyRefBtn.textContent = "Copied! ✅";
        setTimeout(() => {
          copyRefBtn.textContent = "Copy Link";
        }, 2000);
      });
    });
  }
}

// Main event handlers
async function main() {
  console.log('Popup script loaded');
  
  await initSelectors();
  await initReferralWidget();
  
  // Analytics Dropdown Toggle
  const dropdownTrigger = $(".dropdown-trigger");
  const dropdownContent = $(".dropdown-content");
  if (dropdownTrigger && dropdownContent) {
    dropdownTrigger.addEventListener("click", (e) => {
      e.stopPropagation();
      const isVisible = dropdownContent.style.display === "block";
      dropdownContent.style.display = isVisible ? "none" : "block";
    });
    document.addEventListener("click", () => {
      dropdownContent.style.display = "none";
    });
  }

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
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      } else {
        window.open("options.html", "_blank");
      }
    });
  }

  const findBtn = $("#findBtn");
  if (findBtn) {
    findBtn.addEventListener("click", async () => {
      console.log('Find button clicked');
      
      try {
        // Determine sport type based on active tab
        const activeTab = document.querySelector('.sport-tab.active');
        const sportType = activeTab ? activeTab.dataset.sport : 'cfb';

        const teamInput = $("#teamInput");
        const team = teamInput ? sanitizeTeamName(teamInput.value, sportType) : '';
        
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
          const yearSel = $("#year");
          const year = yearSel ? parseInt(yearSel.value, 10) : 2024;
          
          console.log('NFL params:', { year, week, team });

          const game = await findNFLGame(team, year, week);
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
            setOutput(`<div style="background: rgba(231, 76, 60, 0.2); border: 1px solid rgba(231, 76, 60, 0.5); border-radius: 8px; padding: 16px; text-align: center; color: #fff; margin-top: 16px;">No NFL game found for ${team} in ${weekText}, ${year}.</div>`);
            setLoading(false);
            return;
          }

          // Fetch NFL Stats
          const [homeStats, awayStats] = await Promise.all([
            getNFLTeamStats(game.homeAbbr, year),
            getNFLTeamStats(game.awayAbbr, year)
          ]);

          const prediction = predictNFL(game);

          const html = renderNFLSummary(game, homeStats, awayStats, prediction);
          setOutput(html);
          // Store for Copy Script
          lastGame = game;
          lastSportType = 'nfl';
          window.lastPrediction = prediction;
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

            console.log('Fetching CFB ratings and advanced stats...');
            const home = game.home_team || game.homeTeam || game.home;
            const away = game.away_team || game.awayTeam || game.away;

            const [ratings, homeStats, awayStats, betting] = await Promise.all([
              getEnhancedRatings(year),
              getAdvancedSeasonStats(year, home),
              getAdvancedSeasonStats(year, away),
              getBettingLines(year, week, home)
            ]);

            const prediction = enhancedPredict(game, ratings, betting);

            console.log('Rendering CFB summary...');
            try {
              const html = renderCFBSummary({ game, ratings, homeStats, awayStats, betting, prediction });
              console.log('CFB summary rendered successfully');
              setOutput(html);
              // Store for Copy Script
              lastGame = game;
              lastSportType = 'cfb';
              window.lastPrediction = prediction;
              const scriptBtn = $('#copyScriptBtn');
              if (scriptBtn) scriptBtn.disabled = false;
            } catch (renderError) {
              console.error('Error rendering CFB summary:', renderError);
              // Fallback to basic display without records
              const homeName = game.home_team || game.homeTeam;
              const awayName = game.away_team || game.awayTeam;
              const homeConf = game.homeConference || game.home_conference || "";
              const awayConf = game.awayConference || game.away_conference || "";
              const gameDate = game.start_date || game.startDate;
              const formattedDate = gameDate ? new Date(gameDate).toLocaleString() : "";
              
              const basicHtml = `
                <div style="background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px); border-radius: 12px; padding: 16px; margin-top: 16px; border: 1px solid rgba(255, 255, 255, 0.2);">
                  <div style="display: grid; grid-template-columns: 1fr auto 1fr; gap: 16px; align-items: center; margin-bottom: 16px;">
                    <div>
                      <div style="font-size: 12px; opacity: 0.7;">Home</div>
                      <div><strong>${homeName}</strong> ${homeConf ? `<span style="font-size: 10px; opacity: 0.6;">(${homeConf})</span>` : ''}</div>
                      <div style="font-size: 12px;">Record: Loading...</div>
                    </div>
                    <div style="text-align: center; font-weight: bold; font-size: 20px; opacity: 0.6;">vs</div>
                    <div>
                      <div style="font-size: 12px; opacity: 0.7;">Away</div>
                      <div><strong>${awayName}</strong> ${awayConf ? `<span style="font-size: 10px; opacity: 0.6;">(${awayConf})</span>` : ''}</div>
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
            // Retrieve key to display prefix for troubleshooting
            let maskedKey = "None";
            try {
              const apiKey = await getApiKey();
              maskedKey = apiKey ? `${apiKey.substring(0, 5)}...` : "None";
            } catch (err) {}
            
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
                  <strong>Currently Loaded Key:</strong> <code>${maskedKey}</code>
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

  // Handle Analytics Dropdown item clicks
  const closeAnalyticsBtn = $("#closeAnalyticsBtn");
  const analyticsContainer = $("#analyticsContainer");
  if (closeAnalyticsBtn && analyticsContainer) {
    closeAnalyticsBtn.addEventListener("click", () => {
      analyticsContainer.style.display = "none";
    });
  }

  const dropdownItems = document.querySelectorAll(".dropdown-item");
  dropdownItems.forEach(item => {
    item.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const dropdownContent = $(".dropdown-content");
      if (dropdownContent) dropdownContent.style.display = "none"; // Hide dropdown

      const label = item.textContent.trim().substring(2).trim(); // Strip emoji
      const href = item.getAttribute("href");

      console.log("Analytics clicked:", label);

      // Verify we have a loaded CFB game
      if (!lastGame || lastSportType !== "cfb") {
        showLocalAnalyticsMessage("⚠️ Analytics Context Required", `Please search for a College Football matchup first (e.g. "Georgia") before running advanced analytics.`);
        return;
      }

      // Show container and loader
      analyticsContainer.style.display = "block";
      const titleEl = $("#analyticsTitle");
      if (titleEl) titleEl.textContent = `📈 ${label}`;
      
      const loaderEl = $("#analyticsLoader");
      const bodyEl = $("#analyticsBody");
      if (loaderEl) loaderEl.style.display = "block";
      if (bodyEl) {
        bodyEl.style.display = "none";
        bodyEl.innerHTML = "";
      }

      analyticsContainer.scrollIntoView({ behavior: "smooth" });

      try {
        let contentHtml = "";

        if (label.includes("Box Scores")) {
          contentHtml = await renderDetailedBoxScore(lastGame);
        } else if (label.includes("Win Probability Chart")) {
          contentHtml = await renderWinProbabilityChart(lastGame);
        } else if (label.includes("SP+ Team Trends")) {
          contentHtml = await renderSPTeamTrends(lastGame);
        } else if (label.includes("Player Efficiency")) {
          contentHtml = await renderPlayerEfficiency(lastGame);
        } else if (label.includes("Data Exporter")) {
          await runDataExporter(lastGame);
          contentHtml = `
            <div style="background: rgba(39, 174, 96, 0.15); border: 1px solid rgba(39, 174, 96, 0.3); border-radius: 8px; padding: 12px; text-align: center; color: #2ecc71;">
              <strong>Success!</strong> CSV spreadsheet containing SP+ ratings for the ${lastGame.season || new Date().getFullYear()} season has been compiled and downloaded. Check your Downloads folder.
            </div>
          `;
        } else if (label.includes("Win Probability Calculator")) {
          contentHtml = renderWPLocalCalculator(lastGame);
        } else {
          // Fallback: open external link in new tab
          window.open(href, "_blank");
          analyticsContainer.style.display = "none";
          return;
        }

        if (bodyEl) {
          bodyEl.innerHTML = contentHtml;
          bodyEl.style.display = "block";
          if (loaderEl) loaderEl.style.display = "none";
          
          // Hook up calculate button if win probability calculator is rendered
          const calcBtn = $("#localCalcBtn");
          if (calcBtn) {
            calcBtn.addEventListener("click", () => {
              calculateLocalWP(lastGame);
            });
          }
        }
      } catch (err) {
        console.error("Analytics fetch error:", err);
        if (bodyEl) {
          bodyEl.innerHTML = `<div style="background: rgba(231, 76, 60, 0.2); border: 1px solid rgba(231, 76, 60, 0.5); border-radius: 8px; padding: 12px; color: #fff;">Error loading analytics: ${err.message}</div>`;
          bodyEl.style.display = "block";
        }
        if (loaderEl) loaderEl.style.display = "none";
      }
    });
  });

  console.log('Event listeners set up');
}

// Analytics Display Helper Functions

function showLocalAnalyticsMessage(title, message) {
  const container = $("#analyticsContainer");
  const titleEl = $("#analyticsTitle");
  const loaderEl = $("#analyticsLoader");
  const bodyEl = $("#analyticsBody");
  
  if (container) container.style.display = "block";
  if (titleEl) titleEl.textContent = title;
  if (loaderEl) loaderEl.style.display = "none";
  if (bodyEl) {
    bodyEl.style.display = "block";
    bodyEl.innerHTML = `
      <div style="background: rgba(243, 156, 18, 0.15); border: 1px solid rgba(243, 156, 18, 0.3); border-radius: 8px; padding: 12px; color: #f39c12; font-size: 12px; line-height: 1.5;">
        ${message}
      </div>
    `;
  }
  if (container) container.scrollIntoView({ behavior: "smooth" });
}

async function getAdvancedBoxScore(gameId) {
  const apiKey = await getApiKey();
  const res = await fetch(`${API_BASE}/game/box/advanced?id=${gameId}`, {
    headers: { Authorization: `Bearer ${apiKey}` }
  });
  if (!res.ok) throw new Error(`API returned ${res.status}`);
  return res.json();
}

async function getWinProbabilityData(gameId) {
  const apiKey = await getApiKey();
  const res = await fetch(`${API_BASE}/metrics/wp?gameId=${gameId}`, {
    headers: { Authorization: `Bearer ${apiKey}` }
  });
  if (!res.ok) throw new Error(`API returned ${res.status}`);
  return res.json();
}

async function getTeamSPHistory(team) {
  const apiKey = await getApiKey();
  const res = await fetch(`${API_BASE}/ratings/sp?team=${encodeURIComponent(team)}`, {
    headers: { Authorization: `Bearer ${apiKey}` }
  });
  if (!res.ok) throw new Error(`API returned ${res.status}`);
  return res.json();
}

async function getSeasonSPRatings(year) {
  const apiKey = await getApiKey();
  const res = await fetch(`${API_BASE}/ratings/sp?year=${year}`, {
    headers: { Authorization: `Bearer ${apiKey}` }
  });
  if (!res.ok) throw new Error(`API returned ${res.status}`);
  return res.json();
}

async function getPlayerEfficiency(year, team) {
  const apiKey = await getApiKey();
  const res = await fetch(`${API_BASE}/ppa/players/season?year=${year}&team=${encodeURIComponent(team)}&threshold=20`, {
    headers: { Authorization: `Bearer ${apiKey}` }
  });
  if (!res.ok) throw new Error(`API returned ${res.status}`);
  return res.json();
}

async function renderDetailedBoxScore(game) {
  const data = await getAdvancedBoxScore(game.id);
  if (!data || !data.teams) {
    return `<div style="padding: 10px; opacity: 0.8; text-align: center;">No advanced box score data found for this game.</div>`;
  }
  
  const teams = data.teams;
  const sr = teams.successRates || [];
  const exp = teams.explosiveness || [];
  const havoc = teams.havoc || [];
  
  const home = game.home_team || game.homeTeam || game.home;
  const away = game.away_team || game.awayTeam || game.away;

  const findIndex = (arr, teamName) => arr.findIndex(t => t.team?.toLowerCase() === teamName?.toLowerCase());
  
  const homeSRIdx = findIndex(sr, home);
  const awaySRIdx = findIndex(sr, away);
  const homeExpIdx = findIndex(exp, home);
  const awayExpIdx = findIndex(exp, away);
  const homeHavIdx = findIndex(havoc, home);
  const awayHavIdx = findIndex(havoc, away);

  const getVal = (arr, idx, path) => {
    if (idx === -1) return "—";
    let curr = arr[idx];
    const parts = path.split(".");
    for (const p of parts) {
      if (curr && curr[p] !== undefined) curr = curr[p];
      else return "—";
    }
    return typeof curr === "number" ? curr : "—";
  };

  const fmtPct = (val) => val === "—" ? "—" : `${(val * 100).toFixed(1)}%`;
  const fmtNum = (val, dec = 2) => val === "—" ? "—" : Number(val).toFixed(dec);

  return `
    <div style="display: flex; flex-direction: column; gap: 12px; font-family: inherit;">
      <div style="font-size: 11px; opacity: 0.7; text-align: center; text-transform: uppercase; letter-spacing: 0.5px;">Advanced Box Score (Post-Game Stats)</div>
      
      <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 12px;">
        <thead>
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.15); opacity: 0.8;">
            <th style="padding: 6px 0;">Metric</th>
            <th style="padding: 6px 0; color: #60a5fa; text-align: right;">${away}</th>
            <th style="padding: 6px 0; color: #f43f5e; text-align: right;">${home}</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
            <td style="padding: 8px 0; font-weight: 500;">Overall Success Rate</td>
            <td style="padding: 8px 0; text-align: right; color: #60a5fa; font-weight: 600;">${fmtPct(getVal(sr, awaySRIdx, "overall.total"))}</td>
            <td style="padding: 8px 0; text-align: right; color: #f43f5e; font-weight: 600;">${fmtPct(getVal(sr, homeSRIdx, "overall.total"))}</td>
          </tr>
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
            <td style="padding: 8px 0; font-weight: 500;">Standard Downs Success</td>
            <td style="padding: 8px 0; text-align: right;">${fmtPct(getVal(sr, awaySRIdx, "standardDowns.total"))}</td>
            <td style="padding: 8px 0; text-align: right;">${fmtPct(getVal(sr, homeSRIdx, "standardDowns.total"))}</td>
          </tr>
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
            <td style="padding: 8px 0; font-weight: 500;">Passing Downs Success</td>
            <td style="padding: 8px 0; text-align: right;">${fmtPct(getVal(sr, awaySRIdx, "passingDowns.total"))}</td>
            <td style="padding: 8px 0; text-align: right;">${fmtPct(getVal(sr, homeSRIdx, "passingDowns.total"))}</td>
          </tr>
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
            <td style="padding: 8px 0; font-weight: 500;">Explosiveness (PPA/Play)</td>
            <td style="padding: 8px 0; text-align: right; color: #60a5fa; font-weight: 600;">${fmtNum(getVal(exp, awayExpIdx, "overall.total"))}</td>
            <td style="padding: 8px 0; text-align: right; color: #f43f5e; font-weight: 600;">${fmtNum(getVal(exp, homeExpIdx, "overall.total"))}</td>
          </tr>
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
            <td style="padding: 8px 0; font-weight: 500;">Defensive Havoc Rate</td>
            <td style="padding: 8px 0; text-align: right; color: #60a5fa; font-weight: 600;">${fmtPct(getVal(havoc, awayHavIdx, "total"))}</td>
            <td style="padding: 8px 0; text-align: right; color: #f43f5e; font-weight: 600;">${fmtPct(getVal(havoc, homeHavIdx, "total"))}</td>
          </tr>
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
            <td style="padding: 8px 0; opacity: 0.7; padding-left: 8px;">— Front Seven Havoc</td>
            <td style="padding: 8px 0; text-align: right; opacity: 0.8;">${fmtPct(getVal(havoc, awayHavIdx, "frontSeven"))}</td>
            <td style="padding: 8px 0; text-align: right; opacity: 0.8;">${fmtPct(getVal(havoc, homeHavIdx, "frontSeven"))}</td>
          </tr>
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
            <td style="padding: 8px 0; opacity: 0.7; padding-left: 8px;">— DB Havoc</td>
            <td style="padding: 8px 0; text-align: right; opacity: 0.8;">${fmtPct(getVal(havoc, awayHavIdx, "db"))}</td>
            <td style="padding: 8px 0; text-align: right; opacity: 0.8;">${fmtPct(getVal(havoc, homeHavIdx, "db"))}</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

async function renderWinProbabilityChart(game) {
  const data = await getWinProbabilityData(game.id);
  if (!data || data.length === 0) {
    return `<div style="padding: 10px; opacity: 0.8; text-align: center;">No play-by-play win probability chart data found for this game.</div>`;
  }

  const home = game.home_team || game.homeTeam || game.home;
  const away = game.away_team || game.awayTeam || game.away;

  const width = 400;
  const height = 150;
  const padding = 20;

  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const maxPlay = data[data.length - 1].playNumber || data.length;
  
  let points = [];
  data.forEach(p => {
    const playNum = p.playNumber || 0;
    const wp = p.homeWinProbability !== undefined ? p.homeWinProbability : 0.5;
    const x = padding + (playNum / maxPlay) * chartWidth;
    const y = padding + (1 - wp) * chartHeight;
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  });

  const polylinePoints = points.join(" ");

  return `
    <div style="display: flex; flex-direction: column; gap: 10px; font-family: inherit;">
      <div style="font-size: 11px; opacity: 0.7; text-align: center; text-transform: uppercase; letter-spacing: 0.5px;">Win Probability Flow</div>
      
      <div style="position: relative; width: 100%; height: ${height}px; background: rgba(0,0,0,0.2); border-radius: 8px; border: 1px solid rgba(255,255,255,0.06); padding: 4px; box-sizing: border-box;">
        <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: 100%;">
          <line x1="${padding}" y1="${height / 2}" x2="${width - padding}" y2="${height / 2}" stroke="rgba(255,255,255,0.15)" stroke-dasharray="4" />
          
          <text x="${padding}" y="${padding - 5}" fill="#f43f5e" font-size="8" font-weight="700" letter-spacing="0.5">${home.toUpperCase()} WINNING (100%)</text>
          <text x="${padding}" y="${height - padding + 12}" fill="#3b82f6" font-size="8" font-weight="700" letter-spacing="0.5">${away.toUpperCase()} WINNING (100%)</text>

          <polyline fill="none" stroke="url(#chartGradient)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="${polylinePoints}" />

          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#f43f5e" />
              <stop offset="50%" stop-color="#a855f7" />
              <stop offset="100%" stop-color="#3b82f6" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 9px; opacity: 0.6; padding: 0 4px;">
        <span>Kickoff</span>
        <span>4th Quarter / Final</span>
      </div>
    </div>
  `;
}

async function renderSPTeamTrends(game) {
  const home = game.home_team || game.homeTeam || game.home;
  const away = game.away_team || game.awayTeam || game.away;

  const [homeData, awayData] = await Promise.all([
    getTeamSPHistory(home),
    getTeamSPHistory(away)
  ]);

  const yearsMap = {};
  
  const hList = Array.isArray(homeData) ? homeData : (homeData?.value || []);
  const aList = Array.isArray(awayData) ? awayData : (awayData?.value || []);

  hList.forEach(item => {
    if (item.team === home) {
      yearsMap[item.year] = yearsMap[item.year] || {};
      yearsMap[item.year].home = item.rating;
    }
  });

  aList.forEach(item => {
    if (item.team === away) {
      yearsMap[item.year] = yearsMap[item.year] || {};
      yearsMap[item.year].away = item.rating;
    }
  });

  const sortedYears = Object.keys(yearsMap).map(Number).sort((a, b) => b - a).slice(0, 6);

  let rowsHtml = "";
  sortedYears.forEach(year => {
    const hVal = yearsMap[year]?.home;
    const aVal = yearsMap[year]?.away;
    rowsHtml += `
      <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
        <td style="padding: 8px 0; font-weight: 600;">${year}</td>
        <td style="padding: 8px 0; text-align: right; color: #60a5fa;">${aVal !== undefined ? aVal.toFixed(1) : "—"}</td>
        <td style="padding: 8px 0; text-align: right; color: #f43f5e;">${hVal !== undefined ? hVal.toFixed(1) : "—"}</td>
      </tr>
    `;
  });

  return `
    <div style="display: flex; flex-direction: column; gap: 10px; font-family: inherit;">
      <div style="font-size: 11px; opacity: 0.7; text-align: center; text-transform: uppercase; letter-spacing: 0.5px;">Multi-Year SP+ Rating History</div>
      <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 12px;">
        <thead>
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.15); opacity: 0.8;">
            <th style="padding: 6px 0;">Year</th>
            <th style="padding: 6px 0; color: #60a5fa; text-align: right;">${away}</th>
            <th style="padding: 6px 0; color: #f43f5e; text-align: right;">${home}</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
  `;
}

async function renderPlayerEfficiency(game) {
  const home = game.home_team || game.homeTeam || game.home;
  const away = game.away_team || game.awayTeam || game.away;
  const year = game.season || game.year || new Date().getFullYear();

  const [homePPA, awayPPA] = await Promise.all([
    getPlayerEfficiency(year, home),
    getPlayerEfficiency(year, away)
  ]);

  const hList = (Array.isArray(homePPA) ? homePPA : (homePPA?.value || [])).sort((a,b) => (b.averagePPA?.all || 0) - (a.averagePPA?.all || 0)).slice(0, 4);
  const aList = (Array.isArray(awayPPA) ? awayPPA : (awayPPA?.value || [])).sort((a,b) => (b.averagePPA?.all || 0) - (a.averagePPA?.all || 0)).slice(0, 4);

  const renderListHtml = (list, color) => {
    if (list.length === 0) return `<div style="opacity:0.6;font-size:11px;">No active efficiency leaders found.</div>`;
    return list.map(p => `
      <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
        <div>
          <span style="font-weight:600; font-size: 11px;">${p.name}</span>
          <span style="font-size:8px;opacity:0.6;background:rgba(255,255,255,0.1);padding:1px 3px;border-radius:3px;margin-left:4px;">${p.position}</span>
        </div>
        <div style="font-weight:700;color:${color}; font-size: 11px;">${(p.averagePPA?.all || 0).toFixed(3)}</div>
      </div>
    `).join("");
  };

  return `
    <div style="display: flex; flex-direction: column; gap: 14px; font-family: inherit;">
      <div style="font-size: 11px; opacity: 0.7; text-align: center; text-transform: uppercase; letter-spacing: 0.5px;">Player Efficiency Leaders (Average PPA)</div>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
        <div>
          <div style="font-weight: 700; font-size: 11px; color: #60a5fa; margin-bottom: 8px; border-bottom: 1px solid rgba(96,165,250,0.2); padding-bottom: 4px;">${away}</div>
          ${renderListHtml(aList, "#60a5fa")}
        </div>
        <div>
          <div style="font-weight: 700; font-size: 11px; color: #f43f5e; margin-bottom: 8px; border-bottom: 1px solid rgba(244,63,94,0.2); padding-bottom: 4px;">${home}</div>
          ${renderListHtml(hList, "#f43f5e")}
        </div>
      </div>
    </div>
  `;
}

async function runDataExporter(game) {
  const year = game.season || game.year || new Date().getFullYear();
  const ratings = await getSeasonSPRatings(year);
  const list = Array.isArray(ratings) ? ratings : (ratings?.value || []);
  if (list.length === 0) throw new Error("No data found to export.");

  const headers = ["Year", "Team", "Conference", "Rating", "Ranking", "Offense Rating", "Offense Ranking", "Defense Rating", "Defense Ranking", "Special Teams Rating"];
  const csvRows = [headers.join(",")];

  list.forEach(r => {
    if (r.team === "nationalAverages") return;
    const row = [
      r.year,
      `"${r.team}"`,
      `"${r.conference || ""}"`,
      r.rating,
      r.ranking || "",
      r.offense?.rating || "",
      r.offense?.ranking || "",
      r.defense?.rating || "",
      r.defense?.ranking || "",
      r.specialTeams?.rating || ""
    ];
    csvRows.push(row.join(","));
  });

  const csvContent = csvRows.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `cfb_sp_ratings_${year}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function renderWPLocalCalculator(game) {
  const home = game.home_team || game.homeTeam || game.home;
  const away = game.away_team || game.awayTeam || game.away;
  return `
    <div style="display: flex; flex-direction: column; gap: 12px; font-family: inherit;">
      <div style="font-size: 11px; opacity: 0.7; text-align: center; text-transform: uppercase; letter-spacing: 0.5px;">Live Win Probability Calculator</div>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
        <div>
          <label style="font-size: 9px; opacity: 0.6; display: block; margin-bottom: 4px; color: white;">Possession</label>
          <select id="wpHomeBall" style="width:100%; box-sizing:border-box; background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.1); border-radius:6px; padding:6px; color:white; font-size:11px; font-family:inherit;">
            <option value="away">${away}</option>
            <option value="home" selected>${home}</option>
          </select>
        </div>
        <div>
          <label style="font-size: 9px; opacity: 0.6; display: block; margin-bottom: 4px; color: white;">Score Lead (Home - Away)</label>
          <input type="number" id="wpScoreDiff" value="0" style="width:100%; box-sizing:border-box; background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.1); border-radius:6px; padding:6px; color:white; font-size:11px; font-family:inherit;" />
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px;">
        <div>
          <label style="font-size: 9px; opacity: 0.6; display: block; margin-bottom: 4px; color: white;">Down</label>
          <select id="wpDown" style="width:100%; box-sizing:border-box; background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.1); border-radius:6px; padding:6px; color:white; font-size:11px; font-family:inherit;">
            <option value="1">1st</option>
            <option value="2">2nd</option>
            <option value="3">3rd</option>
            <option value="4">4th</option>
          </select>
        </div>
        <div>
          <label style="font-size: 9px; opacity: 0.6; display: block; margin-bottom: 4px; color: white;">Distance</label>
          <input type="number" id="wpDistance" value="10" min="1" max="99" style="width:100%; box-sizing:border-box; background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.1); border-radius:6px; padding:6px; color:white; font-size:11px; font-family:inherit;" />
        </div>
        <div>
          <label style="font-size: 9px; opacity: 0.6; display: block; margin-bottom: 4px; color: white;">Yds to Goal</label>
          <input type="number" id="wpYardline" value="80" min="1" max="99" style="width:100%; box-sizing:border-box; background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.1); border-radius:6px; padding:6px; color:white; font-size:11px; font-family:inherit;" />
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
        <div>
          <label style="font-size: 9px; opacity: 0.6; display: block; margin-bottom: 4px; color: white;">Quarter</label>
          <select id="wpQuarter" style="width:100%; box-sizing:border-box; background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.1); border-radius:6px; padding:6px; color:white; font-size:11px; font-family:inherit;">
            <option value="1">1st Qtr</option>
            <option value="2">2nd Qtr</option>
            <option value="3">3rd Qtr</option>
            <option value="4">4th Qtr</option>
          </select>
        </div>
        <div>
          <label style="font-size: 9px; opacity: 0.6; display: block; margin-bottom: 4px; color: white;">Time Left in Qtr (Sec)</label>
          <input type="number" id="wpTimeSec" value="900" min="0" max="900" style="width:100%; box-sizing:border-box; background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.1); border-radius:6px; padding:6px; color:white; font-size:11px; font-family:inherit;" />
        </div>
      </div>

      <button id="localCalcBtn" style="width: 100%; padding: 10px; font-weight: 700; font-size: 12px; background: linear-gradient(45deg, #00b09b, #96c93d); border: none; border-radius: 8px; color: white; cursor: pointer; margin-top: 6px; box-shadow: 0 4px 12px rgba(0, 176, 155, 0.2); transition: all 0.2s;">Calculate Probability</button>

      <div id="wpCalcResult" style="display: none; background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 12px; text-align: center; margin-top: 8px;">
        <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.6;">Calculated Win Probability</div>
        <div id="wpCalcProbability" style="font-size: 22px; font-weight: 900; color: #2ecc71; margin: 6px 0;">50.0%</div>
        <div id="wpCalcExplanation" style="font-size: 11px; opacity: 0.8; line-height: 1.4;"></div>
      </div>
    </div>
  `;
}

function calculateLocalWP(game) {
  const home = game.home_team || game.homeTeam || game.home;
  const away = game.away_team || game.awayTeam || game.away;

  const homeBall = $("#wpHomeBall").value === "home";
  const scoreDiff = parseInt($("#wpScoreDiff").value || 0, 10);
  const down = parseInt($("#wpDown").value || 1, 10);
  const distance = parseInt($("#wpDistance").value || 10, 10);
  const yardline = parseInt($("#wpYardline").value || 80, 10);
  const quarter = parseInt($("#wpQuarter").value || 1, 10);
  const timeSec = parseInt($("#wpTimeSec").value || 900, 10);

  const totalSecondsRemaining = (4 - quarter) * 900 + timeSec;
  const tRatio = totalSecondsRemaining / 3600;
  const sd = 13.5 * Math.sqrt(Math.max(0.01, tRatio)) + 1.2;
  
  const possessionAdjustment = homeBall ? 1.5 : -1.5;
  const fieldPositionAdvantage = ((50 - yardline) / 100) * 2;

  const totalAdvantage = scoreDiff + possessionAdjustment + fieldPositionAdvantage;
  const zScore = totalAdvantage / sd;
  
  const cdf = (z) => 1 / (1 + Math.exp(-1.654 * z));
  let homeWP = cdf(zScore);
  
  homeWP = Math.min(0.999, Math.max(0.001, homeWP));
  
  const probPercentage = (homeWP * 100).toFixed(1);
  const awayPercentage = ((1 - homeWP) * 100).toFixed(1);

  const resultBox = $("#wpCalcResult");
  const probText = $("#wpCalcProbability");
  const explanationText = $("#wpCalcExplanation");

  if (resultBox && probText && explanationText) {
    resultBox.style.display = "block";
    
    if (homeWP >= 0.5) {
      probText.style.color = "#f43f5e";
      probText.textContent = `${probPercentage}% ${home}`;
      explanationText.textContent = `${home} has a ${probPercentage}% chance to win in this situation.`;
    } else {
      probText.style.color = "#60a5fa";
      probText.textContent = `${awayPercentage}% ${away}`;
      explanationText.textContent = `${away} has a ${awayPercentage}% chance to win in this situation.`;
    }
  }
}

// Initialize when DOM is ready

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}