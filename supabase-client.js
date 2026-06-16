// supabase-client.js
const SUPABASE_URL = 'https://ejvrbnffocgfromgzven.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqdnJibmZmb2NnZnJvbWd6dmVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MTk2OTAsImV4cCI6MjA5NzE5NTY5MH0.7IF75l8Z5PE7PqUI9KDeU4ONbbaWl3F8dRV9fRwdrro';

// Initialize the Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper function to track analytics
async function trackEvent(eventName, sport = null, details = null) {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return; // Only track authenticated users

        await supabase.from('user_activity').insert([
            {
                user_id: session.user.id,
                event_name: eventName,
                sport: sport,
                details: details
            }
        ]);
    } catch (err) {
        console.error("Supabase Tracking Error:", err);
    }
}
