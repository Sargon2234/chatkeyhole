import fetch from 'node-fetch';

const makeRequest = async (action, params, token) => {
  const baseUrl = `https://api.telegram.org/bot${token}/${action}?${params}`;

  const requestData = await fetch(baseUrl);

  const a = await requestData.json();

  // console.log('a', a);
  return a;
};

const setWebhook = async ({ endpoint, token }) => {
  await fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${process.env.SERVER_URL}/${endpoint}`);
  console.log('Webhook set!', endpoint);
};

export { makeRequest, setWebhook };