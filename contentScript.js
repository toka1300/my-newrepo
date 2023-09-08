console.log('<------------------Content script here------------------->');
let currentEvent;

chrome.runtime.onMessage.addEventListener((obj, sender, response) => {
  const { type, eventId } = obj;

  if (type === 'NEW') {
    currentEvent = eventId
    // newEventAdded();
  }
})

const getElementByXpath = (path) => {
  return document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
}

const alertButton = document.createElement('button');
const insertAlertButton = () => {
  const sellXPath = '//*[@id="stubhub-event-detail-listings-grid"]/div/div[1]'
  const sellElement = getElementByXpath(sellXPath);
  alertButton.textContent = 'Set Price Alert';
  alertButton.classList.add('btn-price-alert')
  sellElement.insertAdjacentElement("beforebegin", alertButton);
}

const getEventId = () => {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      const url = tabs[0].url;
      const id = url.split('/').at(-2);
      resolve(id);
    })
  })
}

const getMinPrice = async () => {
  try {
    const id = await getEventId();
    const endpoint = `https://stubhub-pricing-api.onrender.com/get-event-info?id=${id}`
    const response = await fetch(endpoint)
    const json = await response.json();
    const minPrice = json.minPrice;
    return minPrice
  } catch (e) {
    console.log('Error:', e);
  }
}

insertAlertButton();
console.log(alertButton);

alertButton.addEventListener('click', async () => {
  console.log('Let me grab that price for you');
  const minPrice = await getMinPrice();
  console.log(minPrice);
});