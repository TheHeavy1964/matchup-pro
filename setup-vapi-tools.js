/**
 * setup-vapi-tools.js
 * ───────────────────────────────────────────────────────────────────────────
 * One-time setup script: creates all 3 server tools in Vapi and attaches
 * them to the Live Stat Producer assistant.
 *
 * Usage:
 *   node setup-vapi-tools.js <YOUR_VAPI_PRIVATE_KEY>
 *
 * Get your private key at: dashboard.vapi.ai → API Keys (left sidebar)
 * ───────────────────────────────────────────────────────────────────────────
 */

const VAPI_PRIVATE_KEY = process.argv[2];
const ASSISTANT_ID     = '852fe68f-bc23-484f-ba74-7e97bd291f4b';

// ─── Backend URL: the Vercel project that has the env vars ─────────────────
// Point this at the matchup-pro project (has CFBD_API_KEY already)
const SERVER_URL = 'https://matchup-pro.vercel.app/api/vapi-tools';

if (!VAPI_PRIVATE_KEY) {
    console.error('❌  Usage: node setup-vapi-tools.js <YOUR_VAPI_PRIVATE_KEY>');
    console.error('   Get it at: dashboard.vapi.ai → API Keys');
    process.exit(1);
}

const VAPI_BASE = 'https://api.vapi.ai';

const headers = {
    'Authorization': `Bearer ${VAPI_PRIVATE_KEY}`,
    'Content-Type':  'application/json'
};

// ─── Tool Definitions ───────────────────────────────────────────────────────

const TOOLS = [
    {
        type: 'function',
        async: false,
        server: { url: SERVER_URL },
        function: {
            name:        'get_team_advanced_stats',
            description: 'Retrieves real CFB team season statistics from the College Football Data API. Returns rushing yards, passing yards, touchdowns, turnovers, SP+ ratings, and more for a given team and year. ALWAYS call this when asked about any CFB team stat.',
            parameters: {
                type: 'object',
                properties: {
                    team: {
                        type:        'string',
                        description: 'The full team name, e.g. "Alabama", "Clemson", "Ohio State"'
                    },
                    year: {
                        type:        'integer',
                        description: 'The season year, e.g. 2024. Defaults to 2024 if not specified. Use 2024 for "current season" or "this year" queries.'
                    }
                },
                required: ['team']
            }
        }
    },
    {
        type: 'function',
        async: false,
        server: { url: SERVER_URL },
        function: {
            name:        'get_nfl_advanced_stats',
            description: 'Retrieves real NFL team season statistics from the SportsDataIO API. Returns rushing yards, passing yards, points scored, turnover differential, and third-down percentage for a given team and year. ALWAYS call this for NFL team stat questions.',
            parameters: {
                type: 'object',
                properties: {
                    team_abbreviation: {
                        type:        'string',
                        description: 'The NFL team abbreviation, e.g. "KC" for Chiefs, "DAL" for Cowboys, "PHI" for Eagles, "SF" for 49ers, "BUF" for Bills'
                    },
                    year: {
                        type:        'integer',
                        description: 'The season year, e.g. 2024. Defaults to 2024 if not specified.'
                    }
                },
                required: ['team_abbreviation']
            }
        }
    },
    {
        type: 'function',
        async: false,
        server: { url: SERVER_URL },
        function: {
            name:        'get_player_injury_status',
            description: 'Retrieves the current injury status and practice report for a specific player. Returns injury designation (Questionable, Doubtful, Out, IR) and notes. Call this when asked about player health, availability, or injury.',
            parameters: {
                type: 'object',
                properties: {
                    player: {
                        type:        'string',
                        description: 'The player\'s full name, e.g. "Bryce Young", "Josh Allen", "Jalen Hurts"'
                    },
                    team: {
                        type:        'string',
                        description: 'The team the player is on, e.g. "Carolina Panthers", "Buffalo Bills"'
                    }
                },
                required: ['player', 'team']
            }
        }
    }
];

// ─── Helpers ────────────────────────────────────────────────────────────────

async function vapiPost(path, body) {
    const res = await fetch(`${VAPI_BASE}${path}`, {
        method:  'POST',
        headers,
        body:    JSON.stringify(body)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`POST ${path} failed: ${JSON.stringify(json)}`);
    return json;
}

async function vapiPatch(path, body) {
    const res = await fetch(`${VAPI_BASE}${path}`, {
        method:  'PATCH',
        headers,
        body:    JSON.stringify(body)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`PATCH ${path} failed: ${JSON.stringify(json)}`);
    return json;
}

async function vapiGet(path) {
    const res = await fetch(`${VAPI_BASE}${path}`, { headers });
    const json = await res.json();
    if (!res.ok) throw new Error(`GET ${path} failed: ${JSON.stringify(json)}`);
    return json;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
    console.log('\n🚀  Matchup Pro — Vapi Tool Setup');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`   Assistant ID : ${ASSISTANT_ID}`);
    console.log(`   Server URL   : ${SERVER_URL}`);
    console.log('');

    // Step 1: Verify the private key works
    console.log('🔑  Verifying API key…');
    try {
        await vapiGet('/assistant/' + ASSISTANT_ID);
        console.log('   ✅  Key valid — assistant found\n');
    } catch (e) {
        console.error('   ❌  Could not reach assistant. Check your private key.');
        console.error('  ', e.message);
        process.exit(1);
    }

    // Step 2: Create each tool
    const createdToolIds = [];
    for (const toolDef of TOOLS) {
        const name = toolDef.function.name;
        console.log(`🔧  Creating tool: ${name}…`);
        try {
            const tool = await vapiPost('/tool', toolDef);
            console.log(`   ✅  Created  → ID: ${tool.id}`);
            createdToolIds.push(tool.id);
        } catch (e) {
            console.error(`   ❌  Failed to create ${name}`);
            console.error('  ', e.message);
            process.exit(1);
        }
    }

    // Step 3: Attach all tools to the assistant
    // We must GET first — Vapi requires model.provider when PATCHing model fields.
    console.log(`\n🔗  Attaching ${createdToolIds.length} tools to assistant…`);
    try {
        const assistant = await vapiGet(`/assistant/${ASSISTANT_ID}`);
        const currentModel = assistant.model || {};

        const updated = await vapiPatch(`/assistant/${ASSISTANT_ID}`, {
            model: {
                ...currentModel,          // preserve provider, model name, system prompt, etc.
                toolIds: createdToolIds   // inject the new tool IDs
            }
        });

        const attachedCount = updated?.model?.toolIds?.length ?? '?';
        console.log(`   ✅  Assistant updated — ${attachedCount} tool(s) now attached`);
    } catch (e) {
        console.error('   ❌  Failed to attach tools to assistant');
        console.error('  ', e.message);
        process.exit(1);
    }

    // Step 4: Summary
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅  DONE — All tools created and attached!\n');
    console.log('   Tool IDs created:');
    createdToolIds.forEach((id, i) => {
        console.log(`   ${i + 1}. ${TOOLS[i].function.name} → ${id}`);
    });
    console.log('\n   ⚠️  Go to dashboard.vapi.ai → your assistant → Publish');
    console.log('      to activate the changes.\n');
}

main().catch(err => {
    console.error('\n💥  Unexpected error:', err.message);
    process.exit(1);
});
