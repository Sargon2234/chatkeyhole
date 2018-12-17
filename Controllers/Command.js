export class CommandController {
  constructor() {
    this.availableCommands = [
      '/start',
      '/addUser',
      '/addChannel',
      '/help',
    ];
  }

  async handleReceivedCommand(command) {
    if (!this.availableCommands.includes(command)) {
      return false;
    }

    switch (command) {

    }
  }

  async handleStart() {

  }

  async handleAddUser() {

  }

  async handleHelp() {

  }

  async handleAddChannel() {

  }
}