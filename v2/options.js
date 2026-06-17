
const $ = (s) => document.querySelector(s);

async function restore() {
  const { apiKey, defaultYear, defaultWeek } = await chrome.storage.sync.get(["apiKey", "defaultYear", "defaultWeek"]);
  if (apiKey) $("#apiKey").value = apiKey;
  if (defaultYear) $("#defaultYear").value = defaultYear;
  if (defaultWeek !== undefined) $("#defaultWeek").value = defaultWeek;
}
restore();

$("#saveBtn").addEventListener("click", async () => {
  const apiKey = $("#apiKey").value.trim();
  await chrome.storage.sync.set({ apiKey });
  $("#status").textContent = "Saved ✓";
  setTimeout(() => $("#status").textContent = "", 2000);
});

$("#saveDefaults").addEventListener("click", async () => {
  const defaultYear = parseInt($("#defaultYear").value, 10);
  const defaultWeek = $("#defaultWeek").value ? parseInt($("#defaultWeek").value, 10) : undefined;
  await chrome.storage.sync.set({ defaultYear, defaultWeek });
  $("#status").textContent = "Defaults saved ✓";
  setTimeout(() => $("#status").textContent = "", 2000);
});
