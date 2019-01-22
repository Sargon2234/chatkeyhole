# Telegram Keyhole Bot
The main idea behind this bot was introduced in update v 1.5.8. (01-22-2019).<br>
First push to this repo was on 12-16-2018.
<br>
Which means idea was good enough to be implemented as native feature.<br>

### Bot purpose
Bot handle goal to send content from group chats to channels.<br>
Just three simple steps:
1. Add bot to group
2. Add bot to channel
3. Bind group and channel

Now you'll receive messages published in group in channel with sender name and possibility to "like" the message.

### Technologies
Server provisioned with Ansible playbook. ([deployment folder](https://github.com/Sargon2234/chatkeyhole/tree/master/deployment))<br>
Just two docker containers:
- with database
- with server data
