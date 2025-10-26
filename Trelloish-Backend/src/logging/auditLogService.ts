import { query } from "../db";
import { LogLevel } from "../models";
import logger from "./logger";

interface LogEntry {
  level: LogLevel;
  userId?: string;
  ipAddress?: string;
  action: string;
  details?: Record<string, any>;
  message?: string; // For file logging primarily
}

export const auditLogService = {

  async log(entry: LogEntry) {
    const { level, userId, ipAddress, action, details, message } = entry;

    // 1. Log to File (using Winston)
    logger.log({
      level: level,
      message: message || action,
      userId: userId,
      ipAddress: ipAddress,
      action: action,
      details: details,
    });

    // 2. Log to Database for specific levels/actions
    const dbLevels: LogLevel[] = ["security", "error", "activity"];
    const dbActions: string[] = [
      "LOGIN_FAILURE",
      "ADMIN_USER_BANNED",
      "ADMIN_USER_UNBANNED",
      "ADMIN_PASSWORD_RESET",
      "TASK_STATUS_UPDATE",
      "WORKSPACE_CREATED",
      "WORKSPACE_DELETED",
      "WORKSPACE_MEMBER_ADDED",
      "WORKSPACE_MEMBER_REMOVED",
      "WORKSPACE_MEMBER_ROLE_UPDATED",
      "PROJECT_CREATED",
      "PROJECT_DELETED",
      "PROJECT_MEMBER_ADDED",
      "PROJECT_MEMBER_REMOVED",
      "PROJECT_MEMBER_ROLE_UPDATED",
      "LOGIN_SUCCESS",
      "LOGOUT_SUCCESS",
      "DEVICE_REVOKED",
      "PASSWORD_RESET_REQUEST",
      "PASSWORD_UPDATE",
    ];

    if (dbLevels.includes(level) || dbActions.includes(action)) {
      try {
        await query(
          `INSERT INTO audit_logs (level, user_id, ip_address, action, details)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            level,
            userId || null,
            ipAddress || null,
            action,
            details ? JSON.stringify(details) : null,
          ]
        );
      } catch (dbError: any) {
        logger.error(
          `Failed to write audit log to database: ${dbError.message}`,
          {
            level: "error",
            action: "AUDIT_DB_WRITE_FAILURE",
            details: { originalLog: entry, dbErrorMessage: dbError.message },
          }
        );
      }
    }
  },

  // Helper methods for specific log types
  async security(
    action: string,
    userId?: string,
    ipAddress?: string,
    details?: Record<string, any>
  ) {
    await this.log({ level: "security", action, userId, ipAddress, details });
  },

  async error(
    action: string,
    userId?: string,
    ipAddress?: string,
    details?: Record<string, any>,
    error?: Error
  ) {
    await this.log({
      level: "error",
      action,
      userId,
      ipAddress,
      details: {
        ...details,
        errorMessage: error?.message,
        stack: error?.stack,
      },
      message: error?.message || action,
    });
  },

  async activity(
    action: string,
    userId: string,
    details?: Record<string, any>
  ) {
    await this.log({ level: "activity", action, userId, details });
  },

  async info(
    action: string,
    userId?: string,
    ipAddress?: string,
    details?: Record<string, any>
  ) {
    await this.log({ level: "info", action, userId, ipAddress, details });
  },
};
