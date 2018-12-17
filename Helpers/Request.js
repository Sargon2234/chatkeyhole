import fetch from 'node-fetch';

const makeRequest = async (action, params) => {
  const baseUrl = `https://api.telegram.org/bot${process.env.BOT_TOKEN}/${action}?${params}`;

  const requestData = await fetch(baseUrl);

  return await requestData.json();
};

const setWebhook = async () => {
  await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/setWebhook?url=${process.env.SERVER_URL}/tg-secret`);
  console.log('Webhook set!');
};

export { makeRequest, setWebhook };