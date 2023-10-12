let priceAlerts;

const fetchAllPriceAlerts = async () => new Promise((resolve, reject) => {
  priceAlerts = chrome.storage.sync.get(null, (result) => {
    const error = chrome.runtime.lastError;
    if (error) {
      console.log('Error fetching price alerts from Chrome storage:', error);
      reject(chrome.runtime.lastError);
    } else {
      priceAlerts = result;
      resolve();
    }
  });
});

const getEventInfo = async (ids) => {
  try {
    const csvIds = ids.toString();
    const endpoint = `https://stubhub-pricing-api.onrender.com/get-event-info?id=${csvIds}`;
    console.log('fetching from', endpoint);
    const response = await fetch(endpoint);
    console.log(response);
    const json = await response.json();
    return json;
  } catch (e) {
    console.log('Error:', e);
    return null;
  }
};

const sendEmailNotification = (alert) => {
  chrome.storage.sync.get('emailAddress', async (result) => {
    const email = result.emailAddress;
    const endpoint = `https://stubhub-pricing-api.onrender.com/notify-user?email=${email}&alert=${alert}`;
    const response = await fetch(endpoint);
    const json = await response.json();
    console.log(json);
  });
};

const alertUser = async (inTheMoney) => {
  if (inTheMoney === 'yes') {
    chrome.action.setBadgeText({ text: ' ' });
    chrome.action.setBadgeBackgroundColor({ color: '#06d6a0' });
    sendEmailNotification(alert);
  } else if (inTheMoney === 'no') {
    chrome.action.setBadgeText({ text: '' });
  }
};

const updatePriceAlerts = async () => {
  console.log('Updating prices');
  let inTheMoney;
  await fetchAllPriceAlerts();
  if (priceAlerts === undefined) return;
  const ids = Object.keys(priceAlerts);
  const fetchedDataArray = await getEventInfo(ids);
  fetchedDataArray.forEach((alert) => {
    sendEmailNotification(alert); // To be deleted
    if (alert.minPrice !== priceAlerts[alert.id].minPrice) {
      inTheMoney = 'no';
      chrome.storage.sync.get(String(alert.id), (result) => {
        const eventObject = result[alert.id];
        eventObject.minPrice = alert.minPrice;
        chrome.storage.sync.set({ [alert.id]: eventObject });
      });
      if (alert.minPrice < priceAlerts[alert.id].priceAlert) {
        inTheMoney = 'yes';
        sendEmailNotification(alert);
      }
    }
  });
  alertUser(inTheMoney);
};

chrome.alarms.create('checkPrices', { periodInMinutes: 60 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'checkPrices') {
    updatePriceAlerts();
  }
});
