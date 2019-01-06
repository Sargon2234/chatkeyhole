import fetch from 'node-fetch';
import { URL } from 'url';
import { Queue } from './QueueService';

const makeRequest = async (action, params) => {
  const baseUrl = `https://api.telegram.org/bot${process.env.KEYHOLE_SERVICE}/${action}?${params}`;
  console.log('BU', baseUrl, '\n');

  const urlPrepared = new URL(baseUrl);
  const chatId = urlPrepared.searchParams.get('chat_id');
  const queueKey = `message:${chatId}`;

  const currentlyProcessing = Queue.checkInQueue(queueKey);
  console.log('Queue lock!', currentlyProcessing);

  if(currentlyProcessing) {
    console.log('Request loop');
    await new Promise(resolve => setTimeout(resolve, 100));
    await this.makeRequest(action, params);
    return;
  }

  Queue.setLock(queueKey, true);

  try {
    const requestData = await fetch(baseUrl);

    const a = await requestData.json();

    console.log('a', JSON.stringify(a));
    return a;
  } catch (e) {
    console.log('Error in send message', e.message);
  } finally {
    Queue.setLock(queueKey, false);
  }
};

const setWebhook = async ({ endpoint, token }) => {
  const setUrl = `https://api.telegram.org/bot${token}/setWebhook?url=${process.env.SERVER_URL}/${endpoint}`;

  await fetch(setUrl);
  console.log('Webhook set!', setUrl);
};

export { makeRequest, setWebhook };