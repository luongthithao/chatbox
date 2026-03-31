import dotenv from "dotenv";

dotenv.config();

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toBoolean = (value, fallback = false) => {
  if (value === undefined) {
    return fallback;
  }

  return value === "true";
};

const env = Object.freeze({
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: toNumber(process.env.PORT, 5000),
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:5173",
  LLM_BASE_URL:
    process.env.LLM_BASE_URL || "http://localhost:1234/v1/chat/completions",
  LLM_MODEL: process.env.LLM_MODEL || "qwen2.5-7b-instruct",
  LLM_TIMEOUT_MS: toNumber(process.env.LLM_TIMEOUT_MS, 30000),
  LLM_API_KEY: process.env.LLM_API_KEY || "",
  JWT_SECRET: process.env.JWT_SECRET || "dev-secret-change-me",
  ACCESS_TOKEN_TTL: process.env.ACCESS_TOKEN_TTL || "15m",
  REFRESH_TOKEN_TTL_DAYS: toNumber(process.env.REFRESH_TOKEN_TTL_DAYS, 30),
  COOKIE_SECURE: toBoolean(process.env.COOKIE_SECURE, false),
  AUTH_RATE_LIMIT_WINDOW_MS: toNumber(
    process.env.AUTH_RATE_LIMIT_WINDOW_MS,
    60_000
  ),
  AUTH_RATE_LIMIT_MAX: toNumber(process.env.AUTH_RATE_LIMIT_MAX, 10),
  DB_USER: process.env.DB_USER || "",
  DB_PASSWORD: process.env.DB_PASSWORD || "",
  DB_HOST: process.env.DB_HOST || "",
  DB_PORT: toNumber(process.env.DB_PORT, 5432),
  DB_NAME: process.env.DB_NAME || "",
});

const requiredEnvVars = [
  "PORT",
  "CLIENT_URL",
  "LLM_BASE_URL",
  "LLM_MODEL",
  "JWT_SECRET",
  "ACCESS_TOKEN_TTL",
  "REFRESH_TOKEN_TTL_DAYS",
  "AUTH_RATE_LIMIT_WINDOW_MS",
  "AUTH_RATE_LIMIT_MAX",
];

const validateEnv = () => {
  const missingVars = requiredEnvVars.filter((key) => {
    const value = env[key];
    return value === "" || value === undefined || value === null;
  });

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(", ")}`
    );
  }
};

export const getEnv = () => env;

export default validateEnv;
