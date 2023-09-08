// Because the content script does not have access to the url, need to grab it here and send it over there

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url) {
    console.log('<---------------Hello from background.js------------------->');
    // const url = tab.url;
    // const id = url.split('/').at(-2);
    // console.log('id from the background.js', id);

    // chrome.tabs.sendMessage(tabId, {
    //   type: 'NEW',
    //   eventId: id
    // })
  }
})