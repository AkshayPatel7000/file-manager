const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const input = require("input");
const config = require("./config");

async function authenticateUser() {
  const stringSession = new StringSession(config.sessionString);

  const client = new TelegramClient(
    stringSession,
    config.apiId,
    config.apiHash,
    {
      connectionRetries: 5,
    }
  );

  console.log("Starting authentication...");

  await client.start({
    phoneNumber: async () =>
      await input.text("Please enter your phone number: "),
    password: async () =>
      await input.text("Please enter your password (if 2FA enabled): "),
    phoneCode: async () =>
      await input.text("Please enter the code you received: "),
    onError: (err) => console.log("Authentication error:", err),
  });

  console.log("You should now be connected.");
  const sessionString = client.session.save();
  console.log("Save this session string for future use:", sessionString);

  return client;
}

module.exports = { authenticateUser };
