let priceAlerts;
const listWrapper = document.querySelector('.price-alert-list');
const clearButton = document.querySelector('.clear-storage');
const updateButton = document.querySelector('.update');
const trackButton = document.querySelector('.btn-track');

const createElementWithConfig = (type, config = {}) => {
  const element = document.createElement(type);
  element.classList.add(config.class || '');
  element.textContent = config.textContent || '';
  return element;
};

const fetchAllPriceAlerts = async () => new Promise((resolve) => {
  priceAlerts = chrome.storage.sync.get(null, (result) => {
    priceAlerts = result;
    resolve();
  });
});

const clearStorage = () => {
  chrome.storage.sync.clear(() => {
    const error = chrome.runtime.lastError;
    if (error) console.log('Error:', error);
  });
  listWrapper.innerHTML = '';
};

const getCurrentTab = async () => {
  const [tab] = await chrome.tabs.query({ active: true });
  const { url } = tab;
  const activePageEventId = url.split('/').at(-2);
  return activePageEventId;
};

const activePageEventId = await getCurrentTab();

const getEventInfo = async (ids) => {
  try {
    const csvIds = ids.toString();
    const endpoint = `https://stubhub-pricing-api.onrender.com/get-event-info?id=${csvIds}`;
    console.log('fetching from', endpoint);
    const response = await fetch(endpoint);
    console.log('response: ', response);
    const json = await response.json();
    return json;
  } catch (e) {
    console.log('Error:', e);
    return null;
  }
};

const saveNewAlertPrice = (e) => {
  const priceAlertTarget = e.target;
  const newValue = priceAlertTarget.textContent;
  const wrapper = priceAlertTarget.closest('div');
  const priceAlert = wrapper.querySelector('.alert-price');
  const { id } = wrapper;

  chrome.storage.sync.get(id, (result) => {
    const eventObject = result[id];
    eventObject.userSetPriceAlert = newValue;
    chrome.storage.sync.set({ [id]: eventObject });
    priceAlert.textContent = newValue;
  });
};

const alertUser = (alertPrice, alertData, alertWrapper) => {
  if (alertData.minPrice < alertPrice.textContent) {
    alertWrapper.classList.add('alert');
    chrome.action.setBadgeText({ text: ' ' });
    chrome.action.setBadgeBackgroundColor({ color: '#06d6a0' });
  } else {
    alertWrapper.classList.remove('alert');
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
  const alertPrice = createElementWithConfig('span', { class: 'alert-price', textContent: alertData.userSetPriceAlert || alertData.minPrice });
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

  dateVenueWrapper.append(date, venue);
  eventDetails.append(eventName, dateVenueWrapper);
  alertWrapper.append(eventDetails, alertPrice, liveMinPrice, trashIcon);
  listWrapper.append(alertWrapper);
  alertUser(alertPrice, alertData, alertWrapper);

  alertPrice.addEventListener('blur', (e) => {
    saveNewAlertPrice(e);
    alertUser(alertPrice, alertData, alertWrapper);
  });

  trashIcon.addEventListener('click', (e) => {
    deleteAlert(e);
  });
};

const addNewPriceAlert = async () => {
  if (!priceAlerts[activePageEventId]) {
    const eventObject = await getEventInfo(activePageEventId);
    chrome.storage.sync.set({ [activePageEventId]: eventObject[0] });
    await fetchAllPriceAlerts();
    buildAlertElement(activePageEventId);
  }
};

const updatePriceAlerts = async () => {
  if (priceAlerts === undefined) return;
  const ids = Object.keys(priceAlerts);
  const eventDataArray = await getEventInfo(ids);
  clearStorage();
  eventDataArray.forEach((alert) => {
    chrome.storage.sync.set({ [alert.id]: alert }).then(() => {
    });
  });
  // TODO: only fetch prices and replace those vales vs. building new elements
  await fetchAllPriceAlerts();
  Object.keys(priceAlerts).forEach((key) => {
    buildAlertElement(key);
  });
  // TODO: popup saying all updated
};

const init = async () => {
  await fetchAllPriceAlerts();
  Object.keys(priceAlerts).forEach((key) => {
    buildAlertElement(key);
  });
  if (priceAlerts[activePageEventId]) trackButton.classList.add('hide');

  clearButton.addEventListener('click', clearStorage);
  updateButton.addEventListener('click', () => updatePriceAlerts());
  trackButton.addEventListener('click', addNewPriceAlert);
};

init();
