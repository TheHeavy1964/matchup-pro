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
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        authOverlay.style.display = "none";
        trackEvent('app_opened');
    } else {
        authOverlay.style.display = "flex";
    }

    // Listen for auth state changes
    supabase.auth.onAuthStateChange((event, session) => {
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
        const { error } = await supabase.auth.signInWithPassword({
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
        const { error } = await supabase.auth.signUp({
            email: emailInput.value,
            password: passwordInput.value
        });
        
        if (error) {
            authError.innerText = error.message;
        } else {
            authError.innerText = "Success! You are now logged in.";
        }
    });

    // Handle Logout (if we add a button somewhere)
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
            await supabase.auth.signOut();
        });
    }
});
