const endpoint = 'http://localhost:3000/fetch-url?url=https://www.stubhub.ca/bruce-springsteen-montreal-tickets-11-20-2023/event/151473141/?quantity=2' //update this

const onMessage = (e) => {
  if (e.data === 'startFetching') {
    setInterval(() => {
        const priceObject = fetch(endpoint);
        postMessage(priceObject)
      }, 1800000)
  }
}
