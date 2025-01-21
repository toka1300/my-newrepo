// Fetch all existing price alerts saved to chrome storage
const fetchActivePriceAlert = async () => {
  return new Promise((resolve) => {
    chrome.storage.sync.get(activePageEventId, (priceAlerts) => {
      const activePriceAlert = priceAlerts[activePageEventId]
      resolve(activePriceAlert)
    });
  })
}

const initContentScript = async () => {
  const existingAlert = await fetchActivePriceAlert();
}
