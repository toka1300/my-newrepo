console.log('<------------------app.js script here------------------->');

const createElementWithConfig = (type, config = {}) => {
  const element = document.createElement(type);
  element.classList.add(config.class || '');
  element.textContent = config.textContent || '';
  return element;
}

let priceAlerts

const fetchAllPriceAlerts = async () => {
  return new Promise((resolve) => {
    priceAlerts = chrome.storage.sync.get(null, (result) => {
      priceAlerts = result
      resolve()
    })
  })
}

const getCurrentTab = async () => {
  const [tab] = await chrome.tabs.query({ active: true });
  const url = tab.url;
  console.log(url);
  const activePageEventId = url.split('/').at(-2);
  return activePageEventId;
}

const clearButton = document.querySelector('.clear-storage');
const updateButton = document.querySelector('.update');
const trackButton = document.querySelector('.btn-track');
const listWrapper = document.querySelector('.price-alert-list') ;
const activePageEventId = await getCurrentTab();
console.log(activePageEventId);

const getEventInfo = async (id) => {
  try {
    const endpoint = `https://stubhub-pricing-api.onrender.com/get-event-info?id=${id}`
    console.log('fetching from', endpoint);
    const response = await fetch(endpoint)
    const json = await response.json();
    return json
  } catch (e) {
    console.log('Error:', e);
  }
}

const removeTrackButton = () => trackButton.remove();

export const updatePriceAlerts = async (priceAlerts) => {
  const ids = Object.keys(priceAlerts)[0]
  const eventObject = await getEventInfo(ids);
  clearStorage();
  chrome.storage.sync.set({[ids]: eventObject}).then(() => {
    console.log(`I have updated event:, ${ids} - ${eventObject.name}`);
  })
}

const buildAlertElement = (key) => {
  const alertData = priceAlerts[key];
  if (!alertData) return;
  const alertWrapper = createElementWithConfig('div', { class: 'alert-wrapper' });
  const eventName = createElementWithConfig('span', { class: 'event-name', textContent: alertData.name });
  const alertPrice = createElementWithConfig('span', { class: 'alert-price', textContent: alertData.userSetPriceAlert || alertData.minPrice });
  const liveMinPrice = createElementWithConfig('span', { class: 'live-min-price', textContent: alertData.minPrice });
  const date = createElementWithConfig('span', { class: 'date', textContent: alertData.date });
  const venue = createElementWithConfig('span',{class: 'venue', textContent: alertData.venue })
  const eventDetails = createElementWithConfig('a', { class: 'event-details' });
  const dateVenueWrapper = createElementWithConfig('div', { class: 'date-venue-wrapper' });

  alertPrice.contentEditable = "true";
  alertPrice.tabIndex = "0";
  dateVenueWrapper.append(date, venue);
  eventDetails.append(eventName, dateVenueWrapper)
  alertWrapper.id = key;
  alertWrapper.append(eventDetails, alertPrice, liveMinPrice);
  listWrapper.append(alertWrapper);

  alertPrice.addEventListener('blur', (e) => {
    const priceAlertTarget = e.target;
    const editedValue = priceAlertTarget.textContent;
    const wrapper = priceAlertTarget.closest('div')
    const id = wrapper.id;
    const priceAlert = wrapper.querySelector('.alert-price');

    console.log('id: ', id);

    chrome.storage.sync.get(id, (result) => {
      const eventObject = result[id];
      console.log(eventObject);
      eventObject.userSetPriceAlert = editedValue;
      console.log(eventObject);
      chrome.storage.sync.set({ [id]: eventObject })
      priceAlert.textContent = editedValue;
    })
  })
}

const addNewPriceAlert = async () => {
  if (!priceAlerts[activePageEventId]) {
    const eventObject = await getEventInfo(activePageEventId);
    chrome.storage.sync.set({ [activePageEventId]: eventObject });
    await fetchAllPriceAlerts();
    buildAlertElement(activePageEventId);
    removeTrackButton();
  }
}

export const clearStorage = () => {
  console.log('Clearing storage now');
  chrome.storage.sync.clear(() => {
    var error = chrome.runtime.lastError;
    if (error) {
      console.log('Error:', error);
    } else {
      console.log('All clear here!');
    }
  }); 
}

const init = async() => {
  await fetchAllPriceAlerts();
  Object.keys(priceAlerts).forEach((key) => {
    buildAlertElement(key)
  })
  if (priceAlerts[activePageEventId]) removeTrackButton();
}

init();

clearButton.addEventListener('click', clearStorage);
updateButton.addEventListener('click', () => updatePriceAlerts(priceAlerts));
trackButton.addEventListener('click', addNewPriceAlert)

