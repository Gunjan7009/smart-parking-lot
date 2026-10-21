const connectDB = require("./config/db");
const app = require("./app");

async function startServer() {
  try {
    await connectDB();

    const PORT = process.env.PORT || 3000;

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
}

startServer();
