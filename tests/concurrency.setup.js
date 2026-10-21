const { connectTestDB, disconnectTestDB } = require("./helpers/testDb");

beforeAll(async () => {
  await connectTestDB();
}, 15000);

afterAll(async () => {
  await disconnectTestDB();
});
