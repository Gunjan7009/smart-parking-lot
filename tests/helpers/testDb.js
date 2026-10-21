const mongoose = require("mongoose");
require("dotenv").config();

async function connectTestDB() {
  const testURI = process.env.MONGO_TEST_URI;

  if (!testURI) {
    throw new Error("MONGO_TEST_URI is missing in .env");
  }

  const databaseName = new URL(testURI).pathname.slice(1);

  if (databaseName !== "smart_parking_lot_test") {
    throw new Error("Tests must use the smart_parking_lot_test database");
  }

  await mongoose.connect(testURI);
  console.log("Connected to test database");
}

async function disconnectTestDB() {
  await mongoose.disconnect();
}

module.exports = {
  connectTestDB,
  disconnectTestDB,
};
