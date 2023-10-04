// const getEventInfo = async (id) => {
//   try {
//     const endpoint = `https://stubhub-pricing-api.onrender.com/get-event-info?id=${id}`
//     console.log('fetching from', endpoint);
//     const response = await fetch(endpoint)
//     const json = await response.json();
//     return json
//   } catch (e) {
//     console.log('Error:', e);
//   }
// }

// export const updatePriceAlerts = async (priceAlerts) => {
//   const ids = Object.keys(priceAlerts)[0]
//   const eventObject = await getEventInfo(ids);
//   initClearStorage();
//   chrome.storage.sync.set({[ids]: eventObject}).then(() => {
//     console.log(`I have updated event:, ${ids} - ${eventObject.name}`);
//   })
// }

// export const initClearStorage = () => {
//   console.log('Clearing storage now');
//   chrome.storage.sync.clear(() => {
//     var error = chrome.runtime.lastError;
//     if (error) {
//       console.log('Error:', error);
//     } else {
//       console.log('All clear here!');
//     }
//   }); 
// }

// export const test = () => {
//   console.log('Hi from utitlity test');
// }