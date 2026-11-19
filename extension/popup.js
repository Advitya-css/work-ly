chrome.storage.sync.get("origin").then((stored) => {
  const link = document.getElementById("open");
  if (link && typeof stored?.origin === "string" && /^https?:\/\//.test(stored.origin)) {
    link.href = `${stored.origin}/dashboard`;
  }
});
