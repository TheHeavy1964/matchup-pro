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

    console.log(`[Stripe Verification] Checking subscription for: ${email}`);

    // 1. Search for customer in Stripe by email
    const customers = await stripe.customers.list({
      email: email.trim().toLowerCase(),
      limit: 1
    });

    if (customers.data.length === 0) {
      console.log(`[Stripe Verification] No customer found for email: ${email}`);
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
      console.log(`[Stripe Verification] Active subscription found for: ${email}`);
      return res.status(200).json({ 
        active: true, 
        customerId: customerId,
        subscriptionId: subscriptions.data[0].id
      });
    }

    console.log(`[Stripe Verification] No active subscription found for customer ID: ${customerId}`);
    return res.status(200).json({ active: false, message: 'Customer exists but has no active subscription.' });

  } catch (error) {
    console.error('[Stripe Verification] Error handling request:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
};
