/**
 * Stripe Subscription Verification Endpoint (Vercel Serverless Function)
 * 
 * Dependencies:
 *   npm install stripe
 * 
 * Environment Variables Required:
 *   STRIPE_SECRET_KEY=sk_live_... (Your live or test Stripe Secret Key from dashboard)
 */

const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  // Enable CORS for Chrome Extension access
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ error: 'Email parameter is required' });
    }

    const searchEmail = email.trim().toLowerCase();
    console.log(`[Stripe Verification] Checking subscription for: ${searchEmail}`);

    // Admin / Developer whitelist bypass
    if (searchEmail === 'derrick@innov8edge.sbs' || searchEmail === 'test@test.com') {
      console.log(`[Stripe Verification] Whitelisted email bypass triggered for: ${searchEmail}`);
      return res.status(200).json({ active: true, message: 'Developer admin whitelisted bypass activated.' });
    }

    // 1. Search for customer in Stripe by email
    const customers = await stripe.customers.list({
      email: searchEmail,
      limit: 1
    });

    if (customers.data.length === 0) {
      console.log(`[Stripe Verification] No customer found for email: ${searchEmail}`);
      return res.status(200).json({ active: false, message: 'No Stripe customer found.' });
    }

    const customerId = customers.data[0].id;

    // 2. Fetch active subscriptions for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active', // Only match active subscriptions
      limit: 1
    });

    if (subscriptions.data.length > 0) {
      console.log(`[Stripe Verification] Active subscription found for: ${searchEmail}`);
      return res.status(200).json({ 
        active: true, 
        customerId: customerId,
        subscriptionId: subscriptions.data[0].id
      });
    }

    // 3. Fallback: Check for completed one-time checkout sessions (lifetime purchase)
    const sessions = await stripe.checkout.sessions.list({
      customer: customerId,
      limit: 5
    });

    const paidSession = sessions.data.find(s => s.payment_status === 'paid');
    if (paidSession) {
      console.log(`[Stripe Verification] One-time paid purchase found for: ${searchEmail}`);
      return res.status(200).json({
        active: true,
        customerId: customerId,
        message: 'Lifetime product purchase verified.'
      });
    }

    console.log(`[Stripe Verification] No active subscription or paid checkout found for customer ID: ${customerId}`);
    return res.status(200).json({ active: false, message: 'Customer exists but has no active subscription or purchase.' });

  } catch (error) {
    console.error('[Stripe Verification] Error handling request:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
};
