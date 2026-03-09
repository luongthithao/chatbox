import app from "./app.js";
import validateEnv, { getEnv } from "./config/env.js";

validateEnv();
const { PORT } = getEnv();

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

