import fetch from 'node-fetch';

const makeRequest = async (action, params) => {
  const baseUrl = `https://api.telegram.org/bot${process.env.BOT_TOKEN}/${action}?${params}`;

  const requestData = await fetch(baseUrl);

  return await requestData.json();
};

const setWebhook = async ({ endpoint, token }) => {
  await fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${process.env.SERVER_URL}/${endpoint}`);
  console.log('Webhook set!', endpoint);
};

export { makeRequest, setWebhook };