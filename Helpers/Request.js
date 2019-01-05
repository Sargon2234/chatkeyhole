import fetch from 'node-fetch';

const makeRequest = async (action, params) => {
  const baseUrl = `https://api.telegram.org/bot${process.env.KEYHOLE_SERVICE}/${action}?${params}`;
  // console.log('BU', baseUrl);

  const requestData = await fetch(baseUrl);

  const a = await requestData.json();

  // console.log('a', a);
  return a;
};

const setWebhook = async ({ endpoint, token }) => {
  const setUrl = `https://api.telegram.org/bot${token}/setWebhook?url=${process.env.SERVER_URL}/${endpoint}`;

  await fetch(setUrl);
  console.log('Webhook set!', setUrl);
};

export { makeRequest, setWebhook };