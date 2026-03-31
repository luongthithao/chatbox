import app from "./app.js";
import validateEnv, { getEnv } from "./config/env.js";
import { initializeDatabase } from "./config/db.js";

const startServer = async () => {
  validateEnv();
  await initializeDatabase();

  const { PORT } = getEnv();

  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
};

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
