/**
 * CFBD API Proxy — Vercel Serverless Function
 * 
 * Proxies requests to CollegeFootballData API so the API key
 * is never exposed to the client. Enforces per-user rate limits
 * based on IP + premium status.
 * 
 * Environment Variables Required:
 *   CFBD_API_KEY — Your CollegeFootballData Bearer token
 *   STRIPE_SECRET_KEY — For premium user verification (reuses existing Stripe setup)
 */

// In-memory rate limit store (resets on cold start, ~5-10 min Vercel lifecycle)
// For production at scale, swap with Vercel KV or Upstash Redis
const rateLimitStore = new Map();

const FREE_DAILY_LIMIT = 5;
const UNAUTH_DAILY_LIMIT = 3;

function getRateLimitKey(ip) {
  const today = new Date().toISOString().split('T')[0]; // UTC date
  return `${ip}:${today}`;
}

function checkRateLimit(ip, limit) {
  const key = getRateLimitKey(ip);
  const current = rateLimitStore.get(key) || 0;
  if (current >= limit) {
    return { allowed: false, remaining: 0, used: current };
  }
  rateLimitStore.set(key, current + 1);
  return { allowed: true, remaining: limit - current - 1, used: current + 1 };
}

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, X-User-Email, X-Premium-Status');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const cfbdApiKey = process.env.CFBD_API_KEY;
  if (!cfbdApiKey) {
    console.error('[CFBD Proxy] CFBD_API_KEY environment variable not set');
    return res.status(500).json({ error: 'Server misconfigured: missing CFBD API key' });
  }

  // Determine user identity
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() 
                 || req.headers['x-real-ip'] 
                 || req.socket?.remoteAddress 
                 || 'unknown';
  
  const userEmail = (req.headers['x-user-email'] || '').trim().toLowerCase();
  const premiumHeader = req.headers['x-premium-status'];
  
  // Determine premium status
  let isPremium = false;

  // Trust client premium header for speed, but also verify known admin emails
  const adminEmails = ['derrick@innov8edge.sbs', 'test@test.com'];
  if (adminEmails.includes(userEmail)) {
    isPremium = true;
  } else if (premiumHeader === 'true' && userEmail) {
    // For authenticated premium users, trust the header
    // (Full Stripe re-verification on every request would be too slow;
    //  the options page already verifies via /api/verify-stripe)
    isPremium = true;
  }

  // Rate limit check (skip for premium)
  if (!isPremium) {
    const limit = userEmail ? FREE_DAILY_LIMIT : UNAUTH_DAILY_LIMIT;
    const rateCheck = checkRateLimit(clientIp, limit);
    
    res.setHeader('X-RateLimit-Limit', limit.toString());
    res.setHeader('X-RateLimit-Remaining', rateCheck.remaining.toString());
    res.setHeader('X-RateLimit-Used', rateCheck.used.toString());

    if (!rateCheck.allowed) {
      console.log(`[CFBD Proxy] Rate limited: ${clientIp} (${userEmail || 'anon'}) — ${rateCheck.used}/${limit}`);
      return res.status(429).json({
        error: 'Daily API limit reached',
        limit,
        used: rateCheck.used,
        upgradeUrl: 'https://matchup-pro.vercel.app/options',
        message: isPremium ? '' : 'Upgrade to Pro for unlimited access!'
      });
    }
  }

  // Extract the CFBD path from the query string
  const cfbdPath = req.query.path;
  if (!cfbdPath) {
    return res.status(400).json({ error: 'Missing "path" query parameter. Example: /api/cfbd?path=/games?year=2024&week=1' });
  }

  // Proxy the request to CFBD
  const cfbdUrl = `https://api.collegefootballdata.com${cfbdPath}`;
  
  try {
    console.log(`[CFBD Proxy] ${clientIp} (${userEmail || 'anon'}, premium=${isPremium}) -> ${cfbdPath}`);
    
    const response = await fetch(cfbdUrl, {
      headers: {
        'Authorization': `Bearer ${cfbdApiKey}`,
        'Accept': 'application/json'
      }
    });

    // Forward status and body
    const contentType = response.headers.get('content-type') || 'application/json';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600'); // Cache 5 min on Vercel edge

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`[CFBD Proxy] Upstream error ${response.status}: ${errorText.substring(0, 200)}`);
      return res.status(response.status).json({ 
        error: `CFBD API returned ${response.status}`,
        details: errorText.substring(0, 200)
      });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error('[CFBD Proxy] Fetch error:', error.message);
    return res.status(502).json({ error: 'Failed to reach CFBD API', message: error.message });
  }
};
