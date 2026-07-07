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

        return res.status(400).json({ error: 'Invalid payload type' });

    } catch (error) {
        console.error('Vapi Tool Call Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

// --- Tool Implementations (Stubs to be expanded in Phase 2) ---

async function getTeamAdvancedStats(args) {
    const { team, year } = args;
    const targetYear = year || new Date().getFullYear();
    const cfbdApiKey = process.env.CFBD_API_KEY;

    if (!cfbdApiKey) {
        console.warn('Missing CFBD_API_KEY in environment');
        return { error: 'API configuration missing on backend.' };
    }

    console.log(`Fetching advanced stats for ${team} in ${targetYear}`);
    
    try {
        // Fetch SP+ ratings from CFBD
        const response = await fetch(`https://api.collegefootballdata.com/ratings/sp?year=${targetYear}&team=${encodeURIComponent(team)}`, {
            headers: {
                'Authorization': `Bearer ${cfbdApiKey}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            return { error: `CFBD API returned ${response.status}` };
        }

        const data = await response.json();
        
        if (!data || data.length === 0) {
            return { message: `No SP+ advanced stats found for ${team} in ${targetYear}.` };
        }

        const teamData = data[0];

        // Return a highly condensed payload for the LLM
        return {
            team: teamData.team,
            year: teamData.year,
            overall_sp_plus_rating: teamData.rating,
            national_ranking: teamData.ranking,
            offensive_rating: teamData.offense?.rating,
            defensive_rating: teamData.defense?.rating
        };
    } catch (error) {
        console.error('CFBD Fetch Error:', error);
        return { error: 'Failed to fetch data from CFBD.' };
    }
}

async function getNflAdvancedStats(args) {
    const { team_abbreviation, year } = args;
    const targetYear = year || new Date().getFullYear();
    const sdioApiKey = process.env.SPORTS_DATA_IO_KEY;

    if (!sdioApiKey) {
        console.warn('Missing SPORTS_DATA_IO_KEY in environment');
        return { error: 'NFL API configuration missing on backend.' };
    }

    console.log(`Fetching NFL stats for ${team_abbreviation} in ${targetYear}`);
    
    try {
        // SportsDataIO NFL Team Season Stats endpoint (using standard regular season)
        const response = await fetch(`https://api.sportsdata.io/v3/nfl/scores/json/TeamSeasonStats/${targetYear}REG?key=${sdioApiKey}`);

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
