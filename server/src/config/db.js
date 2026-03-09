import pg from "pg";
import { getEnv } from "./env.js";

const { Pool } = pg;
const env = getEnv();

const pool = new Pool({
  user: env.DB_USER,
  host: env.DB_HOST,
  database: env.DB_NAME,
  password: env.DB_PASSWORD,
  port: env.DB_PORT,
});

export default pool;