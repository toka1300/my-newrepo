console.log('<------------------Content script here------------------->');

const alertButton = document.createElement('button');

// const getElementByXpath = (path) => {
//   return document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
// }

const path = window.location.pathname;
const activePageEventId = path.split('/').at(-2);
const listingGrid = document.getElementById('stubhub-event-detail-listings-grid')

const fetchActivePriceAlert = async () => {
  return new Promise((resolve) => {
    chrome.storage.sync.get(activePageEventId, (priceAlerts) => {
      const activePriceAlert = priceAlerts[activePageEventId]
      resolve(activePriceAlert)
    });
  })
}

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

const insertAlertButton = async () => {
  alertButton.textContent = 'Set Price Alert';
  alertButton.classList.add('button', 'btn-create-alert')
  console.log(alertButton);
  console.log(listingGrid);
  listingGrid?.insertAdjacentElement("beforebegin", alertButton);
}

const insertEditButton = () => {
  const editButton = document.createElement('button');
  editButton.classList.add('button', 'btn-edit');
  editButton.textContent = 'Existing Price Alert, edit in extension'
  console.log(editButton);
  console.log(listingGrid);
  listingGrid?.insertAdjacentElement("beforebegin", editButton);
}

const addNewPriceAlert = async () => {
  const eventObject = await getEventInfo(activePageEventId);
  chrome.storage.sync.set({[activePageEventId]: eventObject}).then(() => {
    console.log(`I have saved event:, ${activePageEventId} - ${eventObject.name}`);
  })
}

const initContentScript = async () => {
  const existingAlert = await fetchActivePriceAlert();
  console.log(existingAlert);
  if (!existingAlert) {
    insertAlertButton();
  } else {
    insertEditButton();
  }
  alertButton.addEventListener('click', addNewPriceAlert)
}

// initContentScript();
