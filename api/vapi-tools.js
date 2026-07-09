module.exports = async (req, res) => {
    // Vapi webhook endpoint for Server Tool Calls
    // Set CORS headers just in case
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const payload = req.body;

        // Vapi sends tool calls with payload.message.type === 'tool-calls'
        if (payload?.message?.type === 'tool-calls') {
            const toolCalls = payload.message.toolCalls;
            const results = [];

            for (const toolCall of toolCalls) {
                const { id, function: fn } = toolCall;
                const { name, arguments: args } = fn;
                
                // args might already be parsed depending on the framework, but handle string just in case
                const parsedArgs = typeof args === 'string' ? JSON.parse(args) : args;

                let result;

                // Route to the appropriate tool logic
                switch (name) {
                    case 'get_team_advanced_stats':
                        result = await getTeamAdvancedStats(parsedArgs);
                        break;
                    case 'get_nfl_advanced_stats':
                        result = await getNflAdvancedStats(parsedArgs);
                        break;
                    case 'get_player_injury_status':
                        result = await getPlayerInjuryStatus(parsedArgs);
                        break;
                    default:
                        result = { error: `Tool ${name} not found` };
                }

                results.push({
                    toolCallId: id,
                    result: result
                });
            }

            // Return the array of tool call results back to Vapi
            return res.status(200).json({
                results: results
            });
        }

        // Acknowledge other webhook types gracefully (e.g. status-update) so Vapi doesn't crash/hang up
        return res.status(200).json({ message: 'Webhook received successfully' });

    } catch (error) {
        console.error('Vapi Tool Call Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Wraps fetch with an AbortController timeout so a slow upstream API
// fails fast with a clean error instead of hanging until Vapi gives up.
function fetchWithTimeout(url, options = {}, timeoutMs = 7000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { ...options, signal: controller.signal })
        .finally(() => clearTimeout(timer));
}

// ─── Tool Implementations ─────────────────────────────────────────────────────

async function getTeamAdvancedStats(args) {
    const { team, year } = args;
    const targetYear = year || 2023;
    const cfbdApiKey = process.env.CFBD_API_KEY;

    if (!cfbdApiKey) {
        console.warn('Missing CFBD_API_KEY in environment');
        return { error: 'API configuration missing on backend.' };
    }

    console.log(`Fetching stats for ${team} in ${targetYear}`);

    try {
        const headers = {
            'Authorization': `Bearer ${cfbdApiKey}`,
            'Accept': 'application/json'
        };

        // Fetch SP+ ratings AND actual season stats in parallel (7s timeout each)
        const [spResponse, statsResponse] = await Promise.all([
            fetchWithTimeout(
                `https://api.collegefootballdata.com/ratings/sp?year=${targetYear}&team=${encodeURIComponent(team)}`,
                { headers }
            ),
            fetchWithTimeout(
                `https://api.collegefootballdata.com/stats/season?year=${targetYear}&team=${encodeURIComponent(team)}`,
                { headers }
            )
        ]);

        const spData   = spResponse.ok   ? await spResponse.json()   : [];
        const rawStats = statsResponse.ok ? await statsResponse.json() : [];

        // CFBD /stats/season returns rows like { statName, statValue } — flatten into an object
        const stats = {};
        for (const row of rawStats) {
            stats[row.statName] = row.statValue;
        }

        const sp = spData[0];

        // Return a rich payload so the LLM can answer any common stat question
        return {
            team,
            year: targetYear,
            // Offensive season totals
            rushing_yards:            stats.rushingYards           ?? null,
            rushing_yards_per_game:   stats.rushingYardsPerGame    ?? null,
            rushing_attempts:         stats.rushingAttempts         ?? null,
            rushing_tds:              stats.rushingTDs              ?? null,
            net_passing_yards:        stats.netPassingYards         ?? null,
            passing_yards_per_game:   stats.passingYardsPerGame     ?? null,
            completions:              stats.completions             ?? null,
            pass_attempts:            stats.passAttempts            ?? null,
            passing_tds:              stats.passingTDs              ?? null,
            total_yards:              stats.totalYards              ?? null,
            yards_per_play:           stats.yardsPerPlay            ?? null,
            points_per_game:          stats.pointsPerGame           ?? null,
            first_downs:              stats.firstDowns              ?? null,
            // Defensive / turnover
            turnovers:                stats.turnovers               ?? null,
            interceptions_thrown:     stats.interceptions           ?? null,
            fumbles_lost:             stats.fumblesLost             ?? null,
            sacks_allowed:            stats.sacksAllowed            ?? null,
            tackles_for_loss_allowed: stats.tacklesForLossAllowed   ?? null,
            // SP+ efficiency ratings
            sp_plus_rating:           sp?.rating                    ?? null,
            sp_plus_national_ranking: sp?.ranking                   ?? null,
            offensive_sp_plus:        sp?.offense?.rating           ?? null,
            defensive_sp_plus:        sp?.defense?.rating           ?? null
        };
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error('CFBD API timed out after 7s');
            return { error: 'CFBD API timed out. Try again in a moment.' };
        }
        console.error('CFBD Fetch Error:', error);
        return { error: 'Failed to fetch data from CFBD.' };
    }
}

async function getNflAdvancedStats(args) {
    const { team_abbreviation, year } = args;
    const targetYear = year || 2023; // Hardcode to 2023 for reliable historical data if not specified
    const sdioApiKey = process.env.SPORTS_DATA_IO_KEY;

    if (!sdioApiKey) {
        console.warn('Missing SPORTS_DATA_IO_KEY in environment');
        return { error: 'NFL API configuration missing on backend.' };
    }

    console.log(`Fetching NFL stats for ${team_abbreviation} in ${targetYear}`);
    
    try {
        // SportsDataIO NFL Team Season Stats endpoint (7s timeout)
        const response = await fetchWithTimeout(
            `https://api.sportsdata.io/v3/nfl/scores/json/TeamSeasonStats/${targetYear}REG?key=${sdioApiKey}`
        );

        if (!response.ok) {
            return { error: `SportsDataIO API returned ${response.status}` };
        }

        const data = await response.json();
        
        // Find the specific team by abbreviation (e.g., 'DAL', 'KC')
        const teamData = data.find(t => t.Team.toLowerCase() === team_abbreviation.toLowerCase());

        if (!teamData) {
            return { message: `No NFL stats found for team abbreviation ${team_abbreviation}.` };
        }

        // Return a condensed payload for the LLM
        return {
            team: teamData.TeamName,
            abbreviation: teamData.Team,
            total_points_scored: teamData.Score,
            passing_yards: teamData.PassingYards,
            rushing_yards: teamData.RushingYards,
            turnover_differential: teamData.TurnoverDifferential,
            third_down_percentage: teamData.ThirdDownPercentage
        };
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error('SportsDataIO API timed out after 7s');
            return { error: 'NFL API timed out. Try again in a moment.' };
        }
        console.error('SportsDataIO Fetch Error:', error);
        return { error: 'Failed to fetch data from SportsDataIO.' };
    }
}

async function getPlayerInjuryStatus(args) {
    const { player, team } = args;
    // TODO: Implement actual CFBD / SportsDataIO injury fetching here
    console.log(`Fetching injury status for ${player} on ${team}`);
    
    // Mock response to feed back to the LLM
    return {
        player: player,
        team: team,
        status: "Questionable",
        notes: "Limited practice this week due to an ankle sprain. Expected to be a game-time decision."
    };
}
