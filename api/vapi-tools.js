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
    const { team, sport, year } = args;
    // TODO: Implement actual CFBD / SportsDataIO fetching here
    console.log(`Fetching advanced stats for ${team} (${sport}) in ${year || 'current year'}`);
    
    // Mock response to feed back to the LLM
    return {
        team: team,
        sport: sport,
        spPlusRanking: 5,
        epaPerPlay: 0.28,
        successRate: "48%",
        narrative: `${team} has an elite offense this season, ranking top 5 in SP+ and dominating third downs.`
    };
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
