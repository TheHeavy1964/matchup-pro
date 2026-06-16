// auth.js
document.addEventListener("DOMContentLoaded", async () => {
    const authOverlay = document.getElementById("authOverlay");
    const loginForm = document.getElementById("loginForm");
    const signupBtn = document.getElementById("signupBtn");
    const authError = document.getElementById("authError");
    const logoutBtn = document.getElementById("logoutBtn");
    const emailInput = document.getElementById("authEmail");
    const passwordInput = document.getElementById("authPassword");

    // Check existing session
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        authOverlay.style.display = "none";
        trackEvent('app_opened');
    } else {
        authOverlay.style.display = "flex";
    }

    // Listen for auth state changes
    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN') {
            authOverlay.style.display = "none";
            trackEvent('user_login');
        } else if (event === 'SIGNED_OUT') {
            authOverlay.style.display = "flex";
        }
    });

    // Handle Login
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        authError.innerText = "Authenticating...";
        const { error } = await supabaseClient.auth.signInWithPassword({
            email: emailInput.value,
            password: passwordInput.value
        });
        if (error) {
            authError.innerText = error.message;
        } else {
            authError.innerText = "";
        }
    });

    // Handle Signup
    signupBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        if (!emailInput.value || !passwordInput.value) {
            authError.innerText = "Please enter an email and password to sign up.";
            return;
        }
        authError.innerText = "Creating account...";
        const { data, error } = await supabaseClient.auth.signUp({
            email: emailInput.value,
            password: passwordInput.value
        });
        
        if (error) {
            authError.innerText = error.message;
        } else if (data.session == null) {
            authError.style.color = "#3b82f6";
            authError.innerText = "Check your email for the confirmation link!";
        } else {
            authError.style.color = "#2ecc71";
            authError.innerText = "Success! Logging you in...";
        }
    });

    // Handle Logout (if we add a button somewhere)
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
            await supabaseClient.auth.signOut();
        });
    }
});
