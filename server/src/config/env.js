import dotenv from "dotenv";

dotenv.config();

const requiredEnvVars = ["PORT", "DB_USER", "DB_PASSWORD", "DB_HOST", "DB_PORT", "DB_NAME"];

const validateEnv = () => {
  const missingVars = requiredEnvVars.filter(
    (envVar) => !process.env[envVar]
  );

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(", ")}`
    );
  }

  console.log("✅ All environment variables are configured");
};

export const getEnv = () => ({
  PORT: process.env.PORT || 5000,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT,
  DB_NAME: process.env.DB_NAME,
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:5173",
});

export default validateEnv;
