const newWindow = () => {
  chrome.tabs.create({url: 'popup.html'}) 
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

const button = document.querySelector('.track');
const popOutButton = document.querySelector('.pop-out')

button.addEventListener('click', async () => {
  const minPrice = await getMinPrice();
  console.log(minPrice);
});

popOutButton.addEventListener('click', newWindow);