if (typeof chrome === 'undefined' || !chrome.storage) {
  // Try to share the same window-level mock object if already initialized in parent
  if (!window.chrome || !window.chrome.storage) {
    const mockStorage = {
      apiKey: "sPvlz6/2WFrMOb71/GS/KhpgLdWDxJhAQwBiaJLeSrPxRgtpYhvvezCF8pJvilA9",
      isPremium: false,
      stripeEmail: "",
      defaultYear: "2024",
      defaultWeek: "1"
    };
    window.chrome = {
      storage: {
        sync: {
          get: (keys) => {
            // Check local storage to share state across tabs/windows
            const localData = localStorage.getItem('mockStorage');
            let data;
            try {
              data = localData ? JSON.parse(localData) : mockStorage;
            } catch (e) {
              data = mockStorage;
            }
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
            const localData = localStorage.getItem('mockStorage');
            let data;
            try {
              data = localData ? JSON.parse(localData) : mockStorage;
            } catch (e) {
              data = mockStorage;
            }
            Object.assign(data, obj);
            localStorage.setItem('mockStorage', JSON.stringify(data));
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
const STRIPE_SEASON_PASS_LINK = "https://buy.stripe.com/YOUR_ONE_TIME_SEASON_PASS_LINK"; // TODO: Replace with your one-time Season Pass payment link from Stripe
const VERIFICATION_API_URL = "https://matchup-pro.vercel.app/api/verify-stripe"; // Replace with your backend URL

const $ = (s) => document.querySelector(s);

function getPricingPhase() {
  const SEASON_START_DATE = new Date("2026-08-24T00:00:00Z"); 
  const now = new Date();
  const diffTime = now - SEASON_START_DATE;
  const days = diffTime > 0 ? Math.floor(diffTime / (1000 * 60 * 60 * 24)) : 0;

  if (days <= 20) {
    return {
      phase: 1,
      standalonePrice: "$3.99",
      seasonPassPrice: "$19.99",
      pitchTitle: "The \"No-Brainer\" Early Bird",
      pitchText: "Price increases to $8.99, $14.99, and $19.99 later this season. Buy the Pass now for $19.99 and save over 60%.",
      badgeText: "Early Bird"
    };
  } else if (days <= 40) {
    return {
      phase: 2,
      standalonePrice: "$8.99",
      seasonPassPrice: "$24.99",
      pitchTitle: "The \"Last Chance\" Value",
      pitchText: "Lock in full access before the mid-season price spike.",
      badgeText: "Best Value"
    };
  } else if (days <= 60) {
    return {
      phase: 3,
      standalonePrice: "$14.99",
      seasonPassPrice: "$14.99",
      pitchTitle: "The \"Equalizer\"",
      pitchText: "Same price as one month, but covers the whole rest of the season. A true force multiplier.",
      badgeText: "Equalizer"
    };
  } else {
    return {
      phase: 4,
      standalonePrice: "$19.99",
      seasonPassPrice: "$9.99",
      pitchTitle: "The \"Stretch Run\" Pass",
      pitchText: "Time is running out. Get the rest of the season for just $9.99!",
      badgeText: "Stretch Run"
    };
  }
}

async function restore() {
  const { apiKey, defaultYear, defaultWeek, stripeEmail, isPremium } = await chrome.storage.sync.get([
    "apiKey", "defaultYear", "defaultWeek", "stripeEmail", "isPremium"
  ]);

  if (apiKey && apiKey !== "test-cfbd-key" && apiKey !== "test-valid-key" && apiKey !== "3db1e9c835b04d898461abb034c6c858") {
    $("#apiKey").value = apiKey;
  } else {
    $("#apiKey").value = "sPvlz6/2WFrMOb71/GS/KhpgLdWDxJhAQwBiaJLeSrPxRgtpYhvvezCF8pJvilA9";
  }
  if (defaultYear) $("#defaultYear").value = defaultYear;
  if (defaultWeek !== undefined) $("#defaultWeek").value = defaultWeek;
  if (stripeEmail) $("#stripeEmail").value = stripeEmail;

  updatePremiumUI(isPremium, stripeEmail);

  // Hide pricing card for premium users — no need to upsell
  const pricingCard = $("#pricingCard");
  if (pricingCard) {
    pricingCard.style.display = isPremium ? "none" : "block";
  }

  // Set Stripe link
  const stripeLink = $("#stripeLink");
  if (stripeLink) stripeLink.href = STRIPE_PAYMENT_LINK;

  const stripeBuyLink = $("#stripeBuyLink");
  if (stripeBuyLink) stripeBuyLink.href = STRIPE_SEASON_PASS_LINK;

  const pricing = getPricingPhase();
  const pricingContainer = $("#dynamicPricingContainer");
  if (pricingContainer) {
    pricingContainer.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span style="font-size: 16px; font-weight: bold; color: #10b981;">Season Pass: ${pricing.seasonPassPrice}</span>
        <span style="background: #10b981; color: #000; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">${pricing.badgeText}</span>
      </div>
      <div style="font-size: 12px; color: #a5b4fc; margin-bottom: 8px;">
        (Current Standalone Price: ${pricing.standalonePrice})
      </div>
      <div style="font-size: 13px; color: #e2e8f0; line-height: 1.5;">
        <strong style="color: white;">${pricing.pitchTitle}:</strong> ${pricing.pitchText}
      </div>
    `;
  }
}

function updatePremiumUI(isPremium, email) {
  const statusEl = $("#premiumStatus");
  const activateBtn = $("#activateBtn");
  const emailInput = $("#stripeEmail");

  if (!statusEl) return;

  if (isPremium) {
    statusEl.textContent = "Status: Pro Version (Active ✓)";
    statusEl.className = "active";
    if (emailInput) {
      emailInput.value = email || "";
      emailInput.disabled = true;
    }
    if (activateBtn) {
      activateBtn.textContent = "Deactivate License";
      activateBtn.className = "deactivate-btn";
    }
  } else {
    statusEl.textContent = "Status: Free Version (Inactive)";
    statusEl.className = "inactive";
    if (emailInput) {
      emailInput.disabled = false;
    }
    if (activateBtn) {
      activateBtn.textContent = "Verify & Activate";
      activateBtn.className = "";
    }
  }
}

restore();

// Save & Validate CFBD API Key
$("#saveBtn").addEventListener("click", async () => {
  const apiKey = $("#apiKey").value.trim();
  const statusEl = $("#status");
  if (!statusEl) return;

  statusEl.textContent = "Validating key... ⏳";
  statusEl.style.color = "#a5b4fc";

  if (!apiKey) {
    statusEl.textContent = "Please enter an API key. ✗";
    statusEl.style.color = "#ef4444";
    setTimeout(() => statusEl.textContent = "", 3000);
    return;
  }

  if (apiKey.startsWith("test-")) {
    // Save mock key directly without querying live server
    await chrome.storage.sync.set({ apiKey });
    statusEl.textContent = "Saved (Mock Key Mode) ✓";
    statusEl.style.color = "#fbbf24";
    setTimeout(() => statusEl.textContent = "", 3000);
    return;
  }

  try {
    const res = await fetch("https://api.collegefootballdata.com/games?year=2024&week=1", {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    if (res.ok) {
      await chrome.storage.sync.set({ apiKey });
      statusEl.textContent = "Key validated and saved successfully! ✓";
      statusEl.style.color = "#10b981";
    } else {
      statusEl.textContent = `Validation failed: API returned status ${res.status}. Key not saved. ✗`;
      statusEl.style.color = "#ef4444";
    }
  } catch (err) {
    statusEl.textContent = `Validation failed: ${err.message}. Key not saved. ✗`;
    statusEl.style.color = "#ef4444";
  }
  setTimeout(() => {
    statusEl.textContent = "";
  }, 4000);
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
    statusMsg.style.color = "#a5b4fc";
    return;
  }

  // Activation flow
  const email = emailInput.value.trim().toLowerCase();
  if (!email) {
    statusMsg.textContent = "Please enter an email address.";
    statusMsg.style.color = "#f87171";
    return;
  }

  statusMsg.textContent = "Verifying subscription status...";
  statusMsg.style.color = "#a5b4fc";

  // DEVELOPER TESTING BACKDOOR: Always accepts test@test.com and developer admin emails
  if (email === "test@test.com" || email === "derrick@innov8edge.sbs") {
    await chrome.storage.sync.set({ isPremium: true, stripeEmail: email });
    updatePremiumUI(true, email);
    statusMsg.textContent = "Pro Mode activated (Dev Pass)!";
    statusMsg.style.color = "#34d399";
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
