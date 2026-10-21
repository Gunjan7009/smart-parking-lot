module.exports = {
  testEnvironment: "node",
  testMatch: ["<rootDir>/tests/integration/**/*.test.js"],
  setupFilesAfterEnv: ["<rootDir>/tests/concurrency.setup.js"],
};
