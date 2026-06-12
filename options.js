if (typeof chrome === 'undefined' || !chrome.storage) {
  // Try to share the same window-level mock object if already initialized in parent
  if (!window.chrome || !window.chrome.storage) {
    const mockStorage = {
      apiKey: "test-cfbd-key",
      isPremium: false,
      stripeEmail: "",
      defaultYear: "2024",
      defaultWeek: "1"
    };
    window.chrome = {
      storage: {
        sync: {
          get: (keys) => {
            // Check session storage to share state across tabs/windows
            const sessionData = sessionStorage.getItem('mockStorage');
            const data = sessionData ? JSON.parse(sessionData) : mockStorage;
            const result = {};
            if (Array.isArray(keys)) {
              keys.forEach(k => result[k] = data[k]);
            } else if (typeof keys === 'string') {
              result[keys] = data[keys];
            } else {
              Object.assign(result, keys);
            }
            return Promise.resolve(result);
          },
          set: (obj) => {
            const sessionData = sessionStorage.getItem('mockStorage');
            const data = sessionData ? JSON.parse(sessionData) : mockStorage;
            Object.assign(data, obj);
            sessionStorage.setItem('mockStorage', JSON.stringify(data));
            // Trigger storage change handler if any
            return Promise.resolve();
          }
        }
      }
    };
  }
}

// Stripe Billing Configuration
const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/5kQ14p4VngssagQ1lm24006";
const VERIFICATION_API_URL = "https://your-vercel-domain.vercel.app/api/verify-stripe"; // Replace with your backend URL

const $ = (s) => document.querySelector(s);

async function restore() {
  const { apiKey, defaultYear, defaultWeek, stripeEmail, isPremium } = await chrome.storage.sync.get([
    "apiKey", "defaultYear", "defaultWeek", "stripeEmail", "isPremium"
  ]);

  if (apiKey) $("#apiKey").value = apiKey;
  if (defaultYear) $("#defaultYear").value = defaultYear;
  if (defaultWeek !== undefined) $("#defaultWeek").value = defaultWeek;
  if (stripeEmail) $("#stripeEmail").value = stripeEmail;

  updatePremiumUI(isPremium, stripeEmail);

  // Set Stripe link
  const stripeLink = $("#stripeLink");
  if (stripeLink) stripeLink.href = STRIPE_PAYMENT_LINK;
}

function updatePremiumUI(isPremium, email) {
  const statusEl = $("#premiumStatus");
  const activateBtn = $("#activateBtn");
  const emailInput = $("#stripeEmail");
  const statusMsg = $("#activationStatus");

  if (!statusEl) return;

  if (isPremium) {
    statusEl.textContent = "Status: Pro Version (Active ✓)";
    statusEl.style.background = "#d1fae5";
    statusEl.style.color = "#065f46";
    if (emailInput) {
      emailInput.value = email || "";
      emailInput.disabled = true;
    }
    if (activateBtn) {
      activateBtn.textContent = "Deactivate License";
      activateBtn.style.background = "#dc2626";
    }
  } else {
    statusEl.textContent = "Status: Free Version (Inactive)";
    statusEl.style.background = "#fee2e2";
    statusEl.style.color = "#991b1b";
    if (emailInput) {
      emailInput.disabled = false;
    }
    if (activateBtn) {
      activateBtn.textContent = "Verify & Activate";
      activateBtn.style.background = "#3b82f6";
    }
  }
}

restore();

// Save CFBD API Key
$("#saveBtn").addEventListener("click", async () => {
  const apiKey = $("#apiKey").value.trim();
  await chrome.storage.sync.set({ apiKey });
  $("#status").textContent = "Saved ✓";
  setTimeout(() => $("#status").textContent = "", 2000);
});

// Save Search Defaults
$("#saveDefaults").addEventListener("click", async () => {
  const defaultYear = parseInt($("#defaultYear").value, 10);
  const defaultWeek = $("#defaultWeek").value ? parseInt($("#defaultWeek").value, 10) : undefined;
  await chrome.storage.sync.set({ defaultYear, defaultWeek });
  $("#status").textContent = "Defaults saved ✓";
  setTimeout(() => $("#status").textContent = "", 2000);
});

// Handle Stripe Email Activation
$("#activateBtn").addEventListener("click", async () => {
  const { isPremium } = await chrome.storage.sync.get(["isPremium"]);
  const statusMsg = $("#activationStatus");
  const emailInput = $("#stripeEmail");

  if (isPremium) {
    // Deactivation flow
    await chrome.storage.sync.set({ isPremium: false, stripeEmail: "" });
    updatePremiumUI(false, "");
    if (emailInput) emailInput.value = "";
    statusMsg.textContent = "License deactivated.";
    statusMsg.style.color = "#4b5563";
    return;
  }

  // Activation flow
  const email = emailInput.value.trim().toLowerCase();
  if (!email) {
    statusMsg.textContent = "Please enter an email address.";
    statusMsg.style.color = "#dc2626";
    return;
  }

  statusMsg.textContent = "Verifying subscription status...";
  statusMsg.style.color = "#2563eb";

  // DEVELOPER TESTING BACKDOOR: Always accepts test@test.com
  if (email === "test@test.com") {
    await chrome.storage.sync.set({ isPremium: true, stripeEmail: email });
    updatePremiumUI(true, email);
    statusMsg.textContent = "Pro Mode activated (Dev Pass)!";
    statusMsg.style.color = "#059669";
    return;
  }

  try {
    const res = await fetch(`${VERIFICATION_API_URL}?email=${encodeURIComponent(email)}`);
    if (!res.ok) {
      throw new Error(`Verification endpoint returned status: ${res.status}`);
    }
    const data = await res.json();

    if (data && data.active === true) {
      await chrome.storage.sync.set({ isPremium: true, stripeEmail: email });
      updatePremiumUI(true, email);
      statusMsg.textContent = "Stripe verification successful! Pro features unlocked.";
      statusMsg.style.color = "#059669";
    } else {
      statusMsg.textContent = "No active Stripe subscription found for this email.";
      statusMsg.style.color = "#dc2626";
    }
  } catch (err) {
    console.error("Verification error:", err);
    statusMsg.textContent = `Error connecting to verification server: ${err.message}. (Use test@test.com for offline testing)`;
    statusMsg.style.color = "#dc2626";
  }
});
