
import { Pool } from "pg";
import dotenv from "dotenv";

// Load .env for local dev; in production this just does nothing
dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set in environment");
}

export const pool = new Pool({
  connectionString,
});