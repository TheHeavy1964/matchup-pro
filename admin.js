// admin.js
document.addEventListener("DOMContentLoaded", async () => {
    const statusEl = document.getElementById("status");
    const dashboardEl = document.getElementById("dashboard");
    const tbody = document.querySelector("#activityTable tbody");

    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (!session) {
        statusEl.innerText = "Access Denied: You must be logged in.";
        return;
    }

    try {
        statusEl.innerText = "Loading analytics...";
        
        // Fetch all activity (requires RLS policy to allow this user)
        const { data: activities, error } = await supabaseClient
            .from('user_activity')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) throw error;

        statusEl.style.display = "none";
        dashboardEl.style.display = "block";

        activities.forEach(act => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${new Date(act.created_at).toLocaleString()}</td>
                <td style="font-size: 10px; opacity: 0.7;">${act.user_id}</td>
                <td><strong>${act.event_name}</strong></td>
                <td>${act.sport || '-'}</td>
                <td style="font-size: 11px;">${JSON.stringify(act.details)}</td>
            `;
            tbody.appendChild(tr);
        });

    } catch (err) {
        statusEl.innerText = "Error: " + err.message + " (Are you an admin?)";
    }
});
