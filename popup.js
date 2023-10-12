let priceAlerts;
const listWrapper = document.querySelector('.price-alert-list');
const clearButton = document.querySelector('.clear-storage');
const updateButton = document.querySelector('.update');
const trackButton = document.querySelector('.btn-track');
const emailButton = document.querySelector('.btn-add-email');

const createElementWithConfig = (type, config = {}) => {
  const element = document.createElement(type);
  element.classList.add(config.class || '');
  element.textContent = config.textContent || '';
  return element;
};

const fetchAllPriceAlerts = async () => new Promise((resolve, reject) => {
  priceAlerts = chrome.storage.sync.get(null, (result) => {
    const error = chrome.runtime.lastError;
    if (error) {
      console.log('Error fetching price alerts from Chrome storage:', error);
      reject(chrome.runtime.lastError);
    } else {
      priceAlerts = result;
      delete priceAlerts.emailAddress;
      resolve();
    }
  });
});

const clearStorage = () => {
  chrome.storage.sync.clear(() => {
    const error = chrome.runtime.lastError;
    if (error) console.log('Error:', error);
  });
  listWrapper.innerHTML = '';
};

const getCurrentTabId = async () => {
  const [tab] = await chrome.tabs.query({ active: true });
  const urlObject = new URL(tab.url);
  const { href, host } = urlObject;
  if (!host.includes('stubhub')) return null;
  const activePageEventId = href.split('/').at(-2);
  return activePageEventId;
};

const activePageEventId = await getCurrentTabId();

const getEventInfo = async (ids) => {
  try {
    const csvIds = ids.toString();
    const endpoint = `https://stubhub-pricing-api.onrender.com/get-event-info?id=${csvIds}`;
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

const saveNewAlertPrice = (e) => {
  const priceAlertTarget = e.target;
  const newValue = Number(priceAlertTarget.textContent);
  const wrapper = priceAlertTarget.closest('div');
  const priceAlert = wrapper.querySelector('.alert-price');
  const { id } = wrapper;

  chrome.storage.sync.get(id, (result) => {
    const eventObject = result[id];
    eventObject.priceAlert = newValue;
    console.log(eventObject);
    chrome.storage.sync.set({ [id]: eventObject });
    priceAlert.textContent = newValue;
  });
};

const alertUser = (alertWrapper) => {
  const alertPrice = Number(alertWrapper.querySelector('.alert-price').textContent);
  const minPrice = Number(alertWrapper.querySelector('.live-min-price').textContent);
  if (minPrice < alertPrice) {
    alertWrapper.classList.add('alert');
    chrome.action.setBadgeText({ text: ' ' });
    chrome.action.setBadgeBackgroundColor({ color: '#06d6a0' });
  } else {
    alertWrapper.classList.remove('alert');
    chrome.action.setBadgeText({ text: '' });
  }
};

const deleteAlert = (e) => {
  const alert = e.target.closest('div');
  chrome.storage.sync.remove(alert.id, () => {
    if (chrome.storage.lastError) {
      console.log(chrome.runtime.lastError);
    } else {
      console.log('error:', e);
    }
  });
  alert.remove();
};

const buildAlertElement = (key) => {
  const alertData = priceAlerts[key];
  if (!alertData) return;
  const alertWrapper = createElementWithConfig('div', { class: 'alert-wrapper' });
  const eventName = createElementWithConfig('span', { class: 'event-name', textContent: alertData.name });
  const alertPrice = createElementWithConfig('span', { class: 'alert-price', textContent: alertData.priceAlert });
  const liveMinPrice = createElementWithConfig('span', { class: 'live-min-price', textContent: alertData.minPrice });
  const date = createElementWithConfig('span', { class: 'date', textContent: alertData.date });
  const venue = createElementWithConfig('span', { class: 'venue', textContent: alertData.venue });
  const eventDetails = createElementWithConfig('a', { class: 'event-details' });
  const dateVenueWrapper = createElementWithConfig('div', { class: 'date-venue-wrapper' });
  const trashIcon = createElementWithConfig('img', { class: 'trash-icon' });
  trashIcon.src = '/images/trash.svg';
  alertPrice.contentEditable = 'true';
  alertPrice.tabIndex = '0';
  alertWrapper.id = key;
  eventDetails.href = alertData.url;
  eventDetails.target = '_blank';

  dateVenueWrapper.append(date, venue);
  eventDetails.append(eventName, dateVenueWrapper);
  alertWrapper.append(eventDetails, alertPrice, liveMinPrice, trashIcon);
  listWrapper.append(alertWrapper);
  alertUser(alertWrapper);

  alertPrice.addEventListener('blur', (e) => {
    saveNewAlertPrice(e);
    alertUser(alertWrapper);
  });

  trashIcon.addEventListener('click', (e) => {
    deleteAlert(e);
  });
};

const addNewPriceAlert = async (priceAlertValue) => {
  if (!priceAlerts[activePageEventId]) {
    // TODO: Add a loading dialog with warning that first one takes some time
    const eventObject = await getEventInfo(activePageEventId);
    eventObject[0].priceAlert = priceAlertValue;
    chrome.storage.sync.set({ [activePageEventId]: eventObject[0] });
    await fetchAllPriceAlerts();
    buildAlertElement(activePageEventId);
  }
};

const updatePriceAlerts = async (eventDataArray) => {
  if (priceAlerts === undefined) return;
  const rows = document.querySelectorAll('.alert-wrapper');
  rows.forEach((row) => {
    const livePriceElement = row.querySelector('.live-min-price');
    const updatedEventData = eventDataArray.find((item) => item.id === Number(row.id));
    const updatedPrice = updatedEventData ? Number(updatedEventData.minPrice) : null;
    if (updatedPrice !== livePriceElement.textContent) {
      livePriceElement.textContent = updatedPrice;
      chrome.storage.sync.get(row.id, (result) => {
        const eventObject = result[row.id];
        eventObject.minPrice = updatedPrice;
        chrome.storage.sync.set({ [row.id]: eventObject });
      });
      alertUser(row);
    }
  });
  eventDataArray.forEach((alert) => {
    chrome.storage.sync.set({ [alert.id]: alert });
  });
  // TODO: popup saying all updated
};

const init = async () => {
  const setPriceWindow = document.querySelector('.set-price-alert-window');
  const emailWindow = document.querySelector('.add-email-window');
  const wrongUrlWindow = document.querySelector('.non-stubhub-page');
  const trackNewEventButton = document.querySelector('.btn-submit-tracking');
  const submitEmail = document.querySelector('.btn-submit-email');
  const currentTabId = await getCurrentTabId();
  await fetchAllPriceAlerts();
  Object.keys(priceAlerts).forEach((key) => {
    buildAlertElement(key);
  });
  if (priceAlerts[activePageEventId]) trackButton.classList.add('hide');

  clearButton.addEventListener('click', clearStorage);

  updateButton.addEventListener('click', async () => {
    const ids = Object.keys(priceAlerts);
    const eventDataArray = await getEventInfo(ids);
    updatePriceAlerts(eventDataArray);
  });

  trackButton.addEventListener('click', () => {
    if (currentTabId) {
      setPriceWindow.classList.add('show');
    } else {
      wrongUrlWindow.classList.add('show');
    }
  });

  emailButton.addEventListener('click', () => {
    emailWindow.classList.add('show');
  });

  document.addEventListener('click', (e) => {
    const outsideTrackClick = !setPriceWindow.contains(e.target) && e.target !== trackButton;
    const outsideEmailClick = !emailWindow.contains(e.target) && e.target !== emailButton;

    if ((outsideTrackClick && setPriceWindow.classList.contains('show')) || e.target === trackNewEventButton) {
      setPriceWindow.classList.remove('show');
    }
    if ((outsideEmailClick && emailWindow.classList.contains('show')) || e.target === submitEmail) {
      emailWindow.classList.remove('show');
    }
  });

  trackNewEventButton.addEventListener('click', () => {
    const priceAlertSet = setPriceWindow.querySelector('input').value;
    addNewPriceAlert(priceAlertSet);
  });

  submitEmail.addEventListener('click', () => {
    const emailAddress = emailWindow.querySelector('input').value;
    chrome.storage.sync.set({ emailAddress });
  });
};

init();
