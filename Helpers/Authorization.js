import { promisify } from '../src/Promisify';

export class AuthorizationHelper {
  constructor(dbConnection) {
    this.dbConnection = dbConnection;
  }

  async useInviteCode(user, invitationCode) {
    const inviteCode = await this.dbConnection('user_invitations')
        .select('channel_id', 'status', 'id')
        .where('invitation_code', '=', invitationCode);

    if (!inviteCode || !inviteCode.length) {
      return false;
    }

    const inviteCodeRecord = inviteCode[0];

    if (inviteCodeRecord.status !== 'created') {
      return false;
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
    }

    return true;
  }
}