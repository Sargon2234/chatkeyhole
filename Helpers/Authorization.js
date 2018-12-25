import { promisify } from '../src/Promisify';
import { UserHelper } from './User';

export class AuthorizationHelper {
  constructor(dbConnection, TextHelper, TelegramInteractor) {
    this.dbConnection = dbConnection;
    this.textHelper = TextHelper;
    this.telegramInteractor = TelegramInteractor;
    this.userHelper = new UserHelper(dbConnection);
  }

  async useInviteCode(user, { data }) {
    const inviteCode = await this.dbConnection('group_channel_invitations')
        .select('group_to_join', 'status', 'id')
        .where('invitation_code', '=', data);

    if (!inviteCode || !inviteCode.length) {
      const text = await this.textHelper.getText('wrong_invitation_code', user);

      await this.telegramInteractor.sendMessage(user.chat_id, 'sendMessage', text, 'text', process.env.BOT_PUBLISHER_TOKEN);
      return;
    }

    const inviteCodeRecord = inviteCode[0];

    if (inviteCodeRecord.status !== 'created') {
      const text = await this.textHelper.getText('invitation_code_used', user);

      await this.telegramInteractor.sendMessage(user.chat_id, 'sendMessage', text, 'text', process.env.BOT_PUBLISHER_TOKEN);
      return;
    }

    const userIsInThisChannel = await this.dbConnection('user_channels')
        .select('id')
        .where('user_id', '=', user.id)
        .where('channel_id', '=', inviteCodeRecord.channel_id);

    if (userIsInThisChannel.length) {
      const text = await this.textHelper.getText('user_already_in', user);

      await this.telegramInteractor.sendMessage(user.chat_id, 'sendMessage', text, 'text', process.env.BOT_PUBLISHER_TOKEN);
      return;
    }

    const trx = await promisify(this.dbConnection.transaction);

    //  Here we add user to channel, and set invitation code as used.
    try {
      const updateUserInvitations = trx('group_channel_invitations')
          .update({
            status: 'activated',
            channel_used: inviteCodeRecord.channel_id,
          })
          .where('id', '=', inviteCodeRecord.id);

      const addGroupWithChannelBinding = trx('groups_with_channels')
          .insert({
            channel_id: inviteCodeRecord.channel_id,
            group_id: inviteCode[0].group_to_join,
          });

      await Promise.all([
        updateUserInvitations,
        addGroupWithChannelBinding,
      ]);

      await trx.commit();
    } catch (e) {
      await trx.rollback();

      const text = await this.textHelper.getText('error', user);
      await this.telegramInteractor.sendMessage(user.chat_id, 'sendMessage', text, 'text', process.env.BOT_PUBLISHER_TOKEN);
      return;
    }

    const [channelInfo, groupInfo] = await Promise.all([
        this.dbConnection('channels').where('id', '=', inviteCodeRecord.channel_id).select('chat'),
        this.dbConnection('groups').where('id', '=', inviteCode[0].group_to_join).select('group'),
    ]);

    const text = await this.textHelper.getText('invitation_code_success', user);

    const formattedText = text.replace('_channel_name_', channelInfo[0].chat).replace('_group_name_', groupInfo[0].group);

    await this.telegramInteractor.sendMessage(user.chat_id, 'sendMessage', formattedText, 'text', process.env.BOT_PUBLISHER_TOKEN);
  }

  async verifyUserAndChannel(channel, user) {
    const channelId = await this.dbConnection('channels')
        .where('chat', '=', channel)
        .select('id');

    if (!channelId || !channelId.length) {
      const text = await this.textHelper.getText('no_channel', user);

      await this.telegramInteractor.sendMessage(user.chat_id, 'sendMessage', text, 'text', process.env.BOT_PUBLISHER_TOKEN);
      return false;
    }

    const currentUserName = await this.dbConnection('user_channels')
        .where('user_id', '=', user.id)
        .where('channel_id', '=', channelId[0].id)
        .select('name');

    if (!currentUserName || !currentUserName.length) {
      const text = await this.textHelper.getText('not_registered_in_channel', user);

      await this.telegramInteractor.sendMessage(user.chat_id, 'sendMessage', text, 'text', process.env.BOT_PUBLISHER_TOKEN);
      return false;
    }

    const channelData = {
      name: channel,
      id: channelId[0].id,
    };

    user.channel_name = currentUserName[0].name;

    return { channel: channelData, user };
  }

  async getUser(body) {
    let accessMessageData = 'message';
    let tgUserId;

    if ('callback_query' in body) {
      accessMessageData = 'callback_query';
      tgUserId = body[accessMessageData].message.from.id;
    } else {
      tgUserId = body.message.from.id;
    }

    return this.userHelper.getUserData(body[accessMessageData].from, tgUserId);
  }
}