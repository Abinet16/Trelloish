import dotenv from "dotenv";
dotenv.config();

export const PORT = process.env.PORT || 4000;
export const DATABASE_URL =
  process.env.DATABASE_URL;
export const JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET || "supersecretaccesskey";
export const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "supersecretrefreshkey";
export const ACCESS_TOKEN_EXPIRY = "15m"; // 15 minutes
export const REFRESH_TOKEN_EXPIRY = "7d"; // 7 days
export const LOG_FILE_PATH = process.env.LOG_FILE_PATH || "./logs/audit.log";
export const IS_PRODUCTION = process.env.NODE_ENV === "production";
