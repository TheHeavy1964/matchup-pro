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

    // Handle Google Login
    const googleLoginBtn = document.getElementById("googleLoginBtn");
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener("click", async () => {
            authError.style.color = "#a5b4fc";
            authError.innerText = "Redirecting to Google...";
            try {
                // Check if we are running in extension context with identity API available
                const isExtension = typeof chrome !== 'undefined' && chrome.identity && chrome.identity.launchWebAuthFlow;
                
                if (isExtension) {
                    const redirectUrl = chrome.identity.getRedirectURL();
                    console.log("[Auth] Extension Redirect URL:", redirectUrl);
                    
                    const { data, error } = await supabaseClient.auth.signInWithOAuth({
                        provider: 'google',
                        options: {
                            redirectTo: redirectUrl,
                            skipBrowserRedirect: true
                        }
                    });
                    
                    if (error) throw error;
                    if (!data?.url) throw new Error("No OAuth URL returned from Supabase.");

                    chrome.identity.launchWebAuthFlow(
                        {
                            url: data.url,
                            interactive: true
                        },
                        async (redirectResultUrl) => {
                            if (chrome.runtime.lastError) {
                                authError.style.color = "#ff6b6b";
                                authError.innerText = chrome.runtime.lastError.message;
                                return;
                            }
                            
                            try {
                                console.log("[Auth] Redirect Result URL:", redirectResultUrl);
                                const parsedUrl = new URL(redirectResultUrl);
                                
                                // PKCE flow code param
                                const code = parsedUrl.searchParams.get('code');
                                if (code) {
                                    authError.style.color = "#a5b4fc";
                                    authError.innerText = "Completing authentication...";
                                    const { error: sessionError } = await supabaseClient.auth.exchangeCodeForSession(code);
                                    if (sessionError) throw sessionError;
                                    authError.style.color = "#2ecc71";
                                    authError.innerText = "Success! Logged in.";
                                } else {
                                    // Implicit flow tokens from hash params
                                    const hash = parsedUrl.hash;
                                    if (hash) {
                                        const params = new URLSearchParams(hash.substring(1));
                                        const accessToken = params.get('access_token');
                                        const refreshToken = params.get('refresh_token');
                                        if (accessToken && refreshToken) {
                                            authError.style.color = "#a5b4fc";
                                            authError.innerText = "Setting session...";
                                            const { error: sessionError } = await supabaseClient.auth.setSession({
                                                access_token: accessToken,
                                                refresh_token: refreshToken
                                            });
                                            if (sessionError) throw sessionError;
                                            authError.style.color = "#2ecc71";
                                            authError.innerText = "Success! Logged in.";
                                        } else {
                                            throw new Error("No session tokens found in redirect URL.");
                                        }
                                    } else {
                                        throw new Error("No authorization code or session tokens returned.");
                                    }
                                }
                            } catch (err) {
                                authError.style.color = "#ff6b6b";
                                authError.innerText = err.message;
                            }
                        }
                    );
                } else {
                    // Fallback for standard web context
                    const { error } = await supabaseClient.auth.signInWithOAuth({
                        provider: 'google',
                        options: {
                            redirectTo: window.location.origin
                        }
                    });
                    if (error) throw error;
                }
            } catch (err) {
                authError.style.color = "#ff6b6b";
                authError.innerText = err.message;
            }
        });
    }

    // Handle Logout (if we add a button somewhere)
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
            await supabaseClient.auth.signOut();
        });
    }
});
