import http from 'http';
import * as bodyParser from 'body-parser';
import express from 'express';
import { setWebhook } from './Helpers/Request';
// import { RedisConnector } from './RedisConnector';
import { MainController } from './Controllers/Main';
import { db } from './DBConnector';

const app = express();
const httpServer = http.createServer(app);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

httpServer.listen(process.env.APP_PORT, async () => {
  // await setWebhook();

  // const redisConnector = new RedisConnector();

  // const mc = new MainController(db, redisConnector);
  const mc = new MainController(db);

  app.get('/', async (req, res) => {
    console.log('Request to server');

    return res.status(200).send('OK');
  });

  app.post('/tg-secret', async (req, res) => {
    try {
      await mc.processIncomingRequest(req);
    } catch (e) {
      console.log('Error in process message', e.message);
    }

    return res.status(200).send('OK');
  });

  console.log('Server started!', process.env.APP_PORT);
});