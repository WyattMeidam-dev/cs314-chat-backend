const mongoose = require("mongoose");

const TEST_DB_URI =
  process.env.TEST_DATABASE_URI ||
  "mongodb://localhost:27017/cs314_chat_test";

const connect = async () => {
  await mongoose.connect(TEST_DB_URI);
};

const close = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
};

const clear = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
};

module.exports = { connect, close, clear };
