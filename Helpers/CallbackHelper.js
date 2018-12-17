import { RedisHelper } from './Redis';
import { userFlow } from '../src/user-flow';
import UrlParser from '../Helpers/UrlParser';
import { messageOptions } from '../src/messageOptions';

export class CallbackHelper {
  constructor(redisUserConnection, redisUserStepConnection, redisUserReportConnection, textHelper, userHelper, messageActions) {
    this.redisUserConnection = redisUserConnection;
    this.redisUserStepConnection = redisUserStepConnection;
    this.redisUserReportConnection = redisUserReportConnection;
    this.redisHelper = new RedisHelper();
    this.userHelper = userHelper;
    this.textHelper = textHelper;
    this.messageActions = messageActions;
  }

  async setLanguage(message) {
    const { chat_id, data } = message;
    const languageName = data.replace('lang:', '');

    await Promise.all([
      this.redisHelper.updateHash(this.redisUserConnection, chat_id, 'language', languageName),
      this.userHelper.updateUser(chat_id, { language: languageName }),
    ]);
  }

  async setCity(message) {
    const { chat_id, data } = message;
    const citySelected = data.replace('city:', '');

    await this.addDataToUserReport(chat_id, 'city', citySelected);
  }

  async processAction({ chat_id, data }) {
    const actionName = data.replace('action:', '');

    if (actionName === 'skip') {
      return;
    }

    if (actionName === 'anon') {
      await this.addDataToUserReport(chat_id, 'anon', true);
    }

    const userCacheData = await this.redisHelper.getByKey(this.redisUserConnection, 'hash', chat_id);
    const textToSend = await this.textHelper.getText('done', userCacheData.language);

    try {
      await this.userHelper.saveUserReport(chat_id);
    } catch (e) {
      console.log('Error in report save', e.message);
    }

    // Set user next step to start
    await this.setUserNextStep(chat_id, 'master');

    return this.messageActions.sendTextWithOptions(chat_id, textToSend, 'done', userCacheData.language);
  }

  async processText(chatId, text) {
    let userCurrentStep = await this.redisHelper.getByKey(this.redisUserStepConnection, 'val', chatId);

    const currentStepIndex = userFlow.findIndex(flow => flow === userCurrentStep);

    const userStepToWriteTo = userFlow[currentStepIndex - 1];

    await this.addDataToUserReport(chatId, userStepToWriteTo, text);
  }

  async processAgain({ chat_id, data }) {
    await this.setUserNextStep(chat_id, 'master');
    await this.getMessageAccordingToStep(chat_id);
  }

  async getMessageAccordingToStep(chatId) {
    let [userDataInHash, userCurrentStep] = await Promise.all([
      this.redisHelper.getByKey(this.redisUserConnection, 'hash', chatId),
      this.redisHelper.getByKey(this.redisUserStepConnection, 'val', chatId),
    ]);

    if (!userCurrentStep || userCurrentStep === 'undefined') {
      userCurrentStep = 'master';
    }

    const textToSend = await this.textHelper.getText(userCurrentStep, userDataInHash.language);

    const currentStepIndexInFlow = userFlow.findIndex(flowStep => flowStep === userCurrentStep);

    let nextStep;

    if (currentStepIndexInFlow === userFlow.length + 1) {
      nextStep = 'master';
    } else {
      nextStep = userFlow[currentStepIndexInFlow + 1];
    }

    await this.redisHelper.setKey(this.redisUserStepConnection, chatId, nextStep);

    return this.generateMessageAccordingToStep(userCurrentStep, chatId, textToSend);
  }

  async addImageToReport(chatId, imageId) {
    // Try to get user images for current report
    const currentReport = await this.redisHelper.getByKey(this.redisUserReportConnection, 'hash', chatId);

    // If no images, add the first one
    if (!currentReport || !currentReport.images) {
      await this.addDataToUserReport(chatId, 'images', JSON.stringify([imageId]));
      return;
    }

    const imagesAlreadyIn = JSON.parse(currentReport.images);

    // If we have images, we have to check for duplicates first
    if (imagesAlreadyIn.includes(imageId)) {
      return;
    }

    // Then add image to list
    imagesAlreadyIn.push(imageId);

    // And save
    await this.addDataToUserReport(chatId, 'images', JSON.stringify(imagesAlreadyIn));
  }

  async generateMessageAccordingToStep(userCurrentStep, chatId, textToSend) {
    const userData = await this.userHelper.getUser(chatId, null);

    switch (userCurrentStep) {
      case 'city':
        return this.messageActions.sendTextWithOptions(chatId, textToSend, 'city', userData.language);
      case 'links':
      case 'photo':
        return this.messageActions.sendTextWithOptions(chatId, textToSend, 'skip', userData.language);
      case 'congrats':
        const userReportData = await this.redisHelper.getByKey(this.redisUserReportConnection, 'hash', chatId);

        return this.messageActions.finalText(chatId, textToSend, userData, userReportData);
      default:
        return this.messageActions.sendTextMessage(chatId, textToSend);
    }
  }

  async addDataToUserReport(chatId, keyToBind, dataToAdd) {
    const userReportData = await this.redisHelper.getByKey(this.redisUserReportConnection, 'hash', chatId);

    if (!userReportData) {
      await this.redisHelper.setHash(this.redisUserReportConnection, chatId, { [keyToBind]: dataToAdd });
      return;
    }

    await this.redisHelper.updateHash(this.redisUserReportConnection, chatId, keyToBind, dataToAdd);
  }

  async setUserNextStep(chatId, userNextStep) {
    await this.redisHelper.setKey(this.redisUserStepConnection, chatId, userNextStep);
  }

  async removeLatestOptionsResponse(chatId) {
    const responseMessageId = await this.textHelper.getLatestOptionsMessage(chatId);
    if (!responseMessageId) {
      return;
    }

    const messageId = parseInt(responseMessageId);

    await this.messageActions.sendMessage(chatId, messageOptions.removeCallback,
        {
          message_id: messageId,
          reply_markup: '',
        },
    );
  }
}