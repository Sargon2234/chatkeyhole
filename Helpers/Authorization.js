import { promisify } from '../src/Promisify';

export class AuthorizationHelper {
  constructor(dbConnection, TextHelper, TelegramInteractor) {
    this.dbConnection = dbConnection;
    this.textHelper = TextHelper;
    this.telegramInteractor = TelegramInteractor;
  }

  async useInviteCode(user, { data }) {
    const inviteCode = await this.dbConnection('user_invitations')
        .select('channel_id', 'status', 'id')
        .where('invitation_code', '=', data);

    if (!inviteCode || !inviteCode.length) {
      const text = await this.textHelper.getText('wrong_invitation_code', user);

      await this.telegramInteractor.sendMessage(user.chat_id, 'sendMessage', text, 'text');
      return;
    }

    const inviteCodeRecord = inviteCode[0];

    if (inviteCodeRecord.status !== 'created') {
      const text = await this.textHelper.getText('invitation_code_used', user);

      await this.telegramInteractor.sendMessage(user.chat_id, 'sendMessage', text, 'text');
      return;
    }

    const userIsInThisChannel = await this.dbConnection('user_channels')
        .select('id')
        .where('user_id', '=', user.id)
        .where('channel_id', '=', inviteCodeRecord.channel_id);

    if (userIsInThisChannel.length) {
      const text = await this.textHelper.getText('user_already_in', user);

      await this.telegramInteractor.sendMessage(user.chat_id, 'sendMessage', text, 'text');
      return;
    }

    const trx = await promisify(this.dbConnection.transaction);

    //  Here we add user to channel, and set invitation code as used.
    try {
      const updateUserInvitations = trx('user_invitations')
          .update({
            status: 'activated',
            invited_user_id: user.id,
          })
          .where('id', '=', inviteCodeRecord.id);

      const addNewUserToChannel = trx('user_channels')
          .insert({
            user_id: user.id,
            channel_id: inviteCodeRecord.channel_id,
            name: user.user_name,
          });

      await Promise.all([
        updateUserInvitations,
        addNewUserToChannel,
      ]);

      await trx.commit();
    } catch (e) {
      await trx.rollback();

      const text = await this.textHelper.getText('error', user);
      await this.telegramInteractor.sendMessage(user.chat_id, 'sendMessage', text, 'text');
      return;
    }

    const channelInfo = await this.dbConnection('channels').where('id', '=', inviteCodeRecord.channel_id).select('chat');

    const text = await this.textHelper.getText('invitation_code_success', user);

    const formattedText = text.replace('_channel_name_', channelInfo[0].chat);

    await this.telegramInteractor.sendMessage(user.chat_id, 'sendMessage', formattedText, 'text');
  }

  async verifyUserAndChannel(channel, user) {
    const channelId = await this.dbConnection('channels')
        .where('chat', '=', channel)
        .select('id');

    if (!channelId || !channelId.length) {
      const text = await this.textHelper.getText('no_channel', user);

      await this.telegramInteractor.sendMessage(user.chat_id, 'sendMessage', text, 'text');
      return false;
    }

    const currentUserName = await this.dbConnection('user_channels')
        .where('user_id', '=', user.id)
        .where('channel_id', '=', channelId[0].id)
        .select('name');

    if (!currentUserName || !currentUserName.length) {
      const text = await this.textHelper.getText('not_registered_in_channel', user);

      await this.telegramInteractor.sendMessage(user.chat_id, 'sendMessage', text, 'text');
      return false;
    }

    const channelData = {
      name: channel,
      id: channelId[0].id,
    };

    user.channel_name = currentUserName[0].name;

    return { channel: channelData, user };
  }
}