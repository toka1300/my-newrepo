let priceAlerts;
const keepAlive = () => setInterval(chrome.runtime.getPlatformInfo, 20e3);

chrome.runtime.onStartup.addListener(keepAlive);
keepAlive();

const removePastEvents = async (setAlerts) => new Promise((resolve) => {
  Object.keys(setAlerts).forEach((key) => {
    if (new Date() > new Date(setAlerts[key].date)) {
      chrome.storage.sync.remove(key);
    }
    resolve();
  });
});

const fetchAllPriceAlerts = async () => new Promise((resolve, reject) => {
  priceAlerts = chrome.storage.sync.get(null, async (result) => {
    const error = chrome.runtime.lastError;
    if (error) {
      console.log('Error fetching price alerts from Chrome storage:', error);
      reject(chrome.runtime.lastError);
    } else {
      await removePastEvents(result);
      priceAlerts = result;
      delete priceAlerts.email;
      delete priceAlerts.currency;
      resolve();
    }
  });
});

const getEventInfo = async (ids, country) => {
  try {
    const csvIds = ids.toString();
    const endpoint = `https://stubhub-pricing-api.onrender.com/get-event-info?id=${csvIds}&country=${country}`;
    console.log('fetching from', endpoint);
    const response = await fetch(endpoint);
    const json = await response.json();
    console.log(json);
    return json;
  } catch (e) {
    console.log('Error:', e);
    return null;
  }
};

const sendEmailNotification = (alert) => {
  chrome.storage.sync.get('email', async (result) => {
    const { email } = result;
    const { date, name, url } = alert;
    const endpoint = 'https://stubhub-pricing-api.onrender.com/email-user';
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        date,
        name,
        url,
      }),
    });
    const text = await resp.text();
    console.log(text);
  });
};

const addAlertBadge = () => {
  chrome.action.setBadgeText({ text: ' ' });
  chrome.action.setBadgeBackgroundColor({ color: '#06d6a0' });
};

const removeAlertBadge = () => {
  chrome.action.setBadgeText({ text: '' });
};

const updatePriceAlertsAuto = async () => {
  let inTheMoney = false;
  await fetchAllPriceAlerts();
  if (priceAlerts === undefined) return;
  const ids = Object.keys(priceAlerts);
  const fetchedDataArray = await getEventInfo(ids);
  if (fetchedDataArray) {
    fetchedDataArray.forEach((alert) => {
      if (alert.minPrice !== priceAlerts[alert.id].minPrice) {
        chrome.storage.sync.get(String(alert.id), (result) => {
          const eventObject = result[alert.id];
          eventObject.minPrice = alert.minPrice;
          chrome.storage.sync.set({ [alert.id]: eventObject });
        });
        if (alert.minPrice < priceAlerts[alert.id].priceAlert) {
          inTheMoney = true;
          sendEmailNotification(alert);
        }
      }
    });
  }

  if (inTheMoney) {
    addAlertBadge();
  } else {
    removeAlertBadge();
  }
};

updatePriceAlertsAuto();
chrome.alarms.create('checkPrices', { periodInMinutes: 60 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'checkPrices') {
    updatePriceAlertsAuto();
  }
});
