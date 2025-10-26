import winston from "winston";
import { LOG_FILE_PATH, IS_PRODUCTION } from "../config";

const { combine, timestamp, printf, colorize, align } = winston.format;

const logFormat = printf(
  ({ level, message, timestamp, userId, ipAddress, action, details }) => {
    let logMessage = `${timestamp} ${level}: ${message}`;
    if (action) logMessage += ` | Action: ${action}`;
    if (userId) logMessage += ` | User: ${userId}`;
    if (ipAddress) logMessage += ` | IP: ${ipAddress}`;
    if (details) logMessage += ` | Details: ${JSON.stringify(details)}`;
    return logMessage;
  }
);

const logger = winston.createLogger({
  level: IS_PRODUCTION ? "info" : "debug",
  format: combine(
    timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    logFormat
  ),
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: combine(colorize({ all: true }), align(), logFormat),
      level: IS_PRODUCTION ? "info" : "debug",
    }),
    // File transport for all levels (audit.log)
    new winston.transports.File({
      filename: LOG_FILE_PATH,
      level: "info", // All info and above go to file
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 5,
      tailable: true,
    }),
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: "./logs/exceptions.log" }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: "./logs/rejections.log" }),
  ],
});

export default logger;
