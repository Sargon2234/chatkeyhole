import http from 'http';
import * as bodyParser from 'body-parser';
import express from 'express';
import { setWebhook } from './Helpers/Request';
import { db } from './DBConnector';
import { BotEventEmitter } from './Helpers/BotEventEmitter';
import { TotalBotController } from './Controllers/TotalBotController';

const app = express();
const httpServer = http.createServer(app);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

httpServer.listen(process.env.APP_PORT, async () => {
  await setWebhook({ token: process.env.KEYHOLE_SERVICE, endpoint: 'total' });

  const totalBot = new TotalBotController(db);

  try {
    BotEventEmitter.on('group_message', async (data) => {
      await totalBot.publishMessageToDependentChannels(data);
    });

    BotEventEmitter.on('save_message', async (data) => {
      try {
        await db('group_message_chat_message').insert(JSON.parse(data));
      } catch (e) {
        console.log('Save message error', e.message);
      }
    });

    BotEventEmitter.on('remove_from_chat', async (data) => {
      const { chatId } = JSON.parse(data);

      const channelData = await db('channels').where('chat', '=', chatId).select('id');

      if (!channelData.length) {
        return;
      }

      await db('channels').where('chat', '=', chatId).del();
      await db('group_message_chat_message').where('channel', '=', chatId).del();
    });
  } catch (e) {
    console.log('EE submitter error', e.message);
  }

  app.post('/total', async (req, res) => {
    try {
      await totalBot.processIncomingRequest(req);
    } catch (e) {
      console.log('Error in process message watcher', e.message);
    }

    return res.status(200).send('OK');
  });

  console.log('Server started!', process.env.APP_PORT);
});