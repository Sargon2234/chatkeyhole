import http from 'http';
import * as bodyParser from 'body-parser';
import express from 'express';
import { setWebhook } from './Helpers/Request';
import { db } from './DBConnector';
import { ListenBotController } from './Controllers/ListenBot';
import { BotEventEmitter } from './Helpers/BotEventEmitter';
import { PublisherBot } from './Controllers/PublisherBot';

const app = express();
const httpServer = http.createServer(app);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

httpServer.listen(process.env.APP_PORT, async () => {
  await Promise.all([
    setWebhook({ token: process.env.BOT_PUBLISHER_TOKEN, endpoint: 'submitter' }),
    setWebhook({ token: process.env.BOT_WATCHER_TOKEN, endpoint: 'listener' }),
  ]);

  const listenBotController = new ListenBotController(db, BotEventEmitter);
  const submitterBotController = new PublisherBot(db);

  try {
    BotEventEmitter.on('group_message', async (data) => {
      await submitterBotController.publishMessageToDependentChannels(data);
    });
  } catch (e) {
    console.log('EE submitter error', e.message);
  }

  // Bot who push messages to channel
  app.post('/submitter', async (req, res) => {
    try {
      await submitterBotController.processIncomingRequest(req);
    } catch (e) {
      console.log('Error in process message', e.message);
    }

    return res.status(200).send('OK');
  });

  // Bot who listen for messages in group
  app.post('/listener', async (req, res) => {
    try {
      await listenBotController.processIncomingRequest(req);
    } catch (e) {
      console.log('Error in process message', e.message);
    }

    return res.status(200).send('OK');
  });

  console.log('Server started!', process.env.APP_PORT);
});