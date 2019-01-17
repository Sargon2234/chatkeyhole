import { UserHelper } from './User';
import { TelegramInteractor } from './TelegramInteractor';

export class VoteInteractor {
  constructor(db) {
    this.dbConnection = db;
    this.userHelper = new UserHelper(db);
    this.telegramInteractor = new TelegramInteractor();
  }

  async processVote({ from, chat_instance, data, message }) {
    const actionName = data.split(':')[1];
    // const lookInDbForCounter
    const userTgId = from.id;
    const inChatName = message.chat.username;
    const messageId = message.message_id;

    const trx = await this.promisify(this.dbConnection.transaction);

    try {
      const userData = await this.userHelper.getUserData(from, userTgId, message.chat.id);
      const channelData = await trx('channels').where('chat', '=', `@${inChatName}`).pluck('id');

      if (!channelData.length) {
        console.log('No channel, something went wrong', JSON.stringify(channelData));
        return;
      }

      const channelId = channelData[0];

      const userAlreadyVoted = await trx('channel_message_results')
          .where('user_id', '=', userData.id)
          .where('channel_message_id', '=', messageId)
          .where('channel', '=', channelId)
          .pluck('id');

      if (userAlreadyVoted.length) {
        return;
      }

      // Insert this user vote result
      await trx('channel_message_results').insert({
        channel_message_id: messageId,
        channel: channelId,
        status: actionName,
        user_id: userData.id,
      });

      const totalVotedLikes = await trx('channel_message_results')
          .where('channel_message_id', '=', messageId)
          .where('channel', '=', channelId)
          .where('status', '=', 'like')
          .count('id as total');

      const totalVotedDislikes = await trx('channel_message_results')
          .where('channel_message_id', '=', messageId)
          .where('channel', '=', channelId)
          .where('status', '=', 'dislike')
          .count('id as total');

      await trx.commit();

      console.log('TV', totalVotedLikes, totalVotedDislikes);
      // Here we can update inline button.
      const updateMessageData = {
        chat_id: message.chat.id,
        message_id: message.message_id,
        likes: totalVotedLikes[0].total,
        dislikes: totalVotedDislikes[0].total,
      };

      console.log('Update message data', updateMessageData);

      await this.telegramInteractor.updateInlineMessage(updateMessageData);
    } catch (e) {
      console.log('Error in vote process', e.message);
      await trx.rollback();
    }
  }

  promisify(fn) {
    return new Promise(resolve => fn(resolve));
  }
}