require("dotenv").config({ quiet: true });
module.exports = {
  apiId: process.env.API_ID,
  apiHash: process.env.API_HASH,
  sessionString: process.env.SESSION_STRING,
};
