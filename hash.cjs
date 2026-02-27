const crypto = require("crypto");
const { promisify } = require("util");
const scrypt = promisify(crypto.scrypt);

(async () => {
  const salt = crypto.randomBytes(16).toString("hex");
  const buf = await scrypt("password123", salt, 64);
  console.log(buf.toString("hex") + "." + salt);
})();
