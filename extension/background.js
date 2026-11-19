/**
 * The service worker exists so the toolbar icon has somewhere to live and
 * so the default Work-ly address is set once on install. The extension does
 * no background work: everything happens on the page the person is reading.
 */
chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.sync.get("origin");
  if (!stored?.origin) await chrome.storage.sync.set({ origin: "https://work-ly.in" });
});
