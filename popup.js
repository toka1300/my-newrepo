let priceAlerts;
const listWrapper = document.querySelector('.price-alert-list');
const updateButton = document.querySelector('.update');
const trackButton = document.querySelector('.btn-track');
const emailButton = document.querySelector('.btn-add-email');
const setPriceWindow = document.querySelector('.set-price-alert-window');
const emailWindow = document.querySelector('.add-email-window');
const wrongUrlWindow = document.querySelector('.non-stubhub-page');
const trackNewEventButton = document.querySelector('.btn-submit-tracking');
const submitEmail = document.querySelector('.btn-submit-email');
const emailInput = document.getElementById('email-input');
const currencyCheckbox = document.querySelector('.switch input');
const loadingDialog = document.querySelector('.loading-dialog');
const doneLoadingDialog = document.querySelector('.done-loading-dialog');

const createElementWithConfig = (type, config = {}) => {
  const element = document.createElement(type);
  element.classList.add(config.class || '');
  element.textContent = config.textContent || '';
  return element;
};

const removePastEvents = async (setAlerts) => new Promise((resolve) => {
  if (setAlerts.keys === undefined) resolve();
  Object.keys(setAlerts).forEach((key) => {
    if (new Date() > new Date(setAlerts[key].date)) {
      chrome.storage.sync.remove(key);
    }
    resolve();
  });
});

const inTheMoney = (row) => {
  const liveMinPrice = Number(row.querySelector('.live-min-price').textContent);
  const alertPrice = Number(row.querySelector('.alert-price').textContent);
  return liveMinPrice < alertPrice;
};

const fetchAllPriceAlerts = async () => new Promise((resolve, reject) => {
  priceAlerts = chrome.storage.sync.get(null, async (result) => {
    const error = chrome.runtime.lastError;
    if (error) {
      console.error('Error fetching price alerts from Chrome storage:', error);
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

const fetchEmail = async () => new Promise((resolve) => {
  chrome.storage.sync.get('email', (result) => {
    const { email } = result;
    resolve(email);
  });
});

const setCurrency = async () => new Promise((resolve) => {
  chrome.storage.sync.get('currency', (result) => {
    const { currency } = result;
    if (currency === 'usd') currencyCheckbox.checked = true;
    resolve();
  });
});

const fetchCad = async (id) => new Promise((resolve) => {
  chrome.storage.sync.get(id, (result) => {
    const { minPrice } = result[id];
    resolve(minPrice);
  });
});

const fetchUsd = async (id) => new Promise((resolve) => {
  chrome.storage.sync.get(id, (result) => {
    const { minPriceUsd } = result[id];
    resolve(minPriceUsd);
  });
});

const loadingAnimationStart = () => {
  updateButton.classList.add('rotate');
  loadingDialog.classList.remove('hidden');
};

const loadingAnimationEnd = () => {
  updateButton.classList.remove('rotate');
  loadingDialog.classList.add('hidden');
  doneLoadingDialog.classList.remove('hidden');
  setTimeout(() => {
    doneLoadingDialog.classList.add('hidden');
  }, '2000');
};

const getCurrentTabId = async () => {
  const [tab] = await chrome.tabs.query({ active: true });
  const urlObject = new URL(tab.url);
  const { href, host, pathname } = urlObject;
  if (!host.includes('stubhub') || !pathname.includes('event')) return null;
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
    chrome.storage.sync.set({ [id]: eventObject });
    priceAlert.textContent = newValue;
  });
};

const alertUser = (alertWrapper) => {
  const alertPrice = Number(alertWrapper.querySelector('.alert-price').textContent);
  const minPrice = Number(alertWrapper.querySelector('.live-min-price').textContent);
  if (minPrice < alertPrice) {
    alertWrapper.classList.add('alert');
  } else {
    alertWrapper.classList.remove('alert');
  }
};

const addBadge = () => {
  chrome.action.setBadgeText({ text: ' ' });
  chrome.action.setBadgeBackgroundColor({ color: '#06d6a0' });
};

const removeBadge = () => {
  chrome.action.setBadgeText({ text: '' });
};

const checkAllRowsInTheMoney = (rows) => {
  if (rows.some(inTheMoney)) {
    addBadge();
  } else {
    removeBadge();
  }
};

const buildAlertElement = (key) => {
  const alertData = priceAlerts[key];
  if (!alertData) return;
  const alertWrapper = createElementWithConfig('div', { class: 'alert-wrapper' });
  const eventName = createElementWithConfig('span', { class: 'event-name', textContent: alertData.name });
  const alertPrice = createElementWithConfig('span', { class: 'alert-price', textContent: alertData.priceAlert });
  const liveMinPrice = currencyCheckbox.checked === false
    ? createElementWithConfig('span', { class: 'live-min-price', textContent: alertData.minPrice })
    : createElementWithConfig('span', { class: 'live-min-price', textContent: alertData.minPriceUsd });
  const date = createElementWithConfig('span', { class: 'date', textContent: alertData.date });
  const venue = createElementWithConfig('span', { class: 'venue', textContent: alertData.venue });
  const eventDetails = createElementWithConfig('a', { class: 'event-details' });
  const dateVenueWrapper = createElementWithConfig('div', { class: 'date-venue-wrapper' });
  const trashIcon = createElementWithConfig('img', { class: 'trash-icon' });

  // TODO: Add all properties to createElement function
  trashIcon.src = '/images/trash.svg';
  trashIcon.title = 'Delete this price alert';
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
    if (liveMinPrice.textContent < alertPrice.textContent) {
      addBadge();
    } else {
      removeBadge();
    }
  });

  trashIcon.addEventListener('click', (e) => {
    const div = e.target.closest('div');
    chrome.storage.sync.remove(div.id);
    div.remove();
  });
};

const addNewPriceAlert = async (priceAlertValue) => {
  if (!priceAlerts[activePageEventId]) {
    loadingAnimationStart();
    const eventObject = await getEventInfo(activePageEventId);
    eventObject[0].priceAlert = priceAlertValue;
    chrome.storage.sync.set({ [activePageEventId]: eventObject[0] });
    await fetchAllPriceAlerts();
    buildAlertElement(activePageEventId);
    loadingAnimationEnd();
  }
};

const updatePriceAlerts = (eventDataArray) => {
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
  checkAllRowsInTheMoney([...rows]);
  eventDataArray.forEach((alert) => {
    chrome.storage.sync.set({ [alert.id]: alert });
  });
};

const closeDialogs = (e) => {
  const outsideTrackClick = !setPriceWindow.contains(e.target) && e.target !== trackButton;
  const outsideEmailClick = !emailWindow.contains(e.target) && e.target !== emailButton;
  const outsideWrongUrlClick = !emailWindow.contains(e.target) && e.target !== trackButton;

  if ((outsideTrackClick && setPriceWindow.classList.contains('show')) || e.target === trackNewEventButton) {
    setPriceWindow.classList.remove('show');
  }
  if ((outsideEmailClick && emailWindow.classList.contains('show')) || e.target === submitEmail) {
    emailWindow.classList.remove('show');
  }
  if ((outsideWrongUrlClick && wrongUrlWindow.classList.contains('show'))) {
    wrongUrlWindow.classList.remove('show');
  }
};

const subscribedEmail = createElementWithConfig('span', { class: 'subscribed-email' });

const replaceEmailInput = () => {
  emailInput.replaceWith(subscribedEmail);
  subscribedEmail.contentEditable = true;
};

const checkForExistingEmail = async () => {
  const email = await fetchEmail();
  if (email) {
    subscribedEmail.textContent = email;
    replaceEmailInput();
  }
};

const swapCadUsd = async () => {
  if (priceAlerts === undefined) return;
  const rows = document.querySelectorAll('.alert-wrapper');
  rows.forEach(async (row) => {
    const livePriceElement = row.querySelector('.live-min-price');
    const usd = await fetchUsd(row.id);
    livePriceElement.textContent = usd;
  });
  chrome.storage.sync.set({ currency: 'usd' });
};

const swapUsdCad = () => {
  if (priceAlerts === undefined) return;
  const rows = document.querySelectorAll('.alert-wrapper');
  rows.forEach(async (row) => {
    const livePriceElement = row.querySelector('.live-min-price');
    const cad = await fetchCad(row.id);
    livePriceElement.textContent = cad;
  });
  chrome.storage.sync.set({ currency: 'cad' });
};

// --------Event Listeners-------------
submitEmail.addEventListener('click', () => {
  const email = emailInput.value || subscribedEmail.textContent;
  chrome.storage.sync.set({ email });
  subscribedEmail.textContent = email;
  if (emailInput) replaceEmailInput();
});

updateButton.addEventListener('click', async () => {
  if (!priceAlerts) return;
  const ids = Object.keys(priceAlerts);
  loadingAnimationStart();
  const eventDataArray = await getEventInfo(ids);
  updatePriceAlerts(eventDataArray);
  loadingAnimationEnd();
});

emailButton.addEventListener('click', () => {
  emailWindow.classList.add('show');
});

document.addEventListener('click', (e) => {
  closeDialogs(e);
});

trackNewEventButton.addEventListener('click', () => {
  const priceAlertSet = setPriceWindow.querySelector('input').value;
  addNewPriceAlert(priceAlertSet);
});

currencyCheckbox.addEventListener('change', (e) => {
  if (e.target.checked) {
    swapCadUsd();
  } else {
    swapUsdCad();
  }
});

const init = async () => {
  const currentTabId = await getCurrentTabId();
  await fetchAllPriceAlerts();
  await checkForExistingEmail();
  await setCurrency();

  Object.keys(priceAlerts).forEach((key) => buildAlertElement(key));
  if (priceAlerts[activePageEventId]) trackButton.classList.add('hide');
  const rows = [...document.querySelectorAll('.alert-wrapper')];
  checkAllRowsInTheMoney(rows);

  trackButton.addEventListener('click', () => {
    if (currentTabId) {
      setPriceWindow.classList.add('show');
      document.querySelector('input#alert-price').focus();
    } else {
      wrongUrlWindow.classList.add('show');
    }
  });
};

init();
