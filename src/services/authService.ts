// src/services/authService.ts
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import { query } from "../db";
import {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  compareTokenHash,
  verifyRefreshToken,
} from "../auth/jwt";
import { userService } from "./userService";
import { User, UserDevice } from "../models";
import { auditLogService } from "../logging/auditLogService";
import { REFRESH_TOKEN_EXPIRY } from "../config";

export const authService = {
  async registerUser(
    email: string, 
    passwordPlain: string, 
    ipAddress?: string, 
    userAgent?: string
  ): Promise<{ accessToken: string; refreshToken: string; user: User }> { // FIX: Return proper object structure
    const existingUser = await userService.findUserByEmail(email);
    if (existingUser) {
      throw new Error("User with this email already exists.");
    }
    
    const newUser = await userService.createUser(email, passwordPlain);
    
    // Generate tokens for the new user
    const accessToken = generateAccessToken(
      newUser.id,
      newUser.email,
      newUser.global_status
    );

    // Save device info and get refresh token
    const { refreshToken, deviceId } = await this.saveUserDevice(
      newUser.id,
      ipAddress,
      userAgent
    );

    await auditLogService.info("REGISTER_SUCCESS", newUser.id, ipAddress, {
      email,
      deviceId,
    });

    return { 
      accessToken, 
      refreshToken, 
      user: newUser // This now includes the full user object with global_status
    };
  },

  // ... rest of your authService methods remain the same
  async loginUser(
    email: string,
    passwordPlain: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ accessToken: string; refreshToken: string; user: User }> {
    const user = await userService.findUserByEmail(email);

    if (!user || !(await bcrypt.compare(passwordPlain, user.password_hash))) {
      await auditLogService.security("LOGIN_FAILURE", user?.id, ipAddress, {
        email,
      });
      throw new Error("Invalid credentials.");
    }

    if (user.global_status === "BANNED") {
      await auditLogService.security(
        "LOGIN_FAILURE_BANNED",
        user.id,
        ipAddress,
        { email, status: "BANNED" }
      );
      throw new Error("Your account has been banned.");
    }

    // Generate tokens
    const accessToken = generateAccessToken(
      user.id,
      user.email,
      user.global_status
    );

    // Save device info and get a deviceId
    const { refreshToken, deviceId } = await this.saveUserDevice(
      user.id,
      ipAddress,
      userAgent
    );

    await auditLogService.activity("LOGIN_SUCCESS", user.id, {
      ipAddress,
      userAgent,
      deviceId,
    });

    return { accessToken, refreshToken, user };
  },

  async saveUserDevice(
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ refreshToken: string; deviceId: string }> {
    const refreshToken = generateRefreshToken(userId, uuidv4());
    const refreshTokenHash = await hashToken(refreshToken);
    const expiresAt = new Date(
      Date.now() + require("ms")(REFRESH_TOKEN_EXPIRY)
    );

    const result = await query(
      `INSERT INTO user_devices (user_id, refresh_token_hash, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [
        userId,
        refreshTokenHash,
        ipAddress || null,
        userAgent || null,
        expiresAt,
      ]
    );

    const deviceId = result.rows[0].id;
    return { refreshToken, deviceId };
  },

  async refreshAccessToken(
    oldRefreshToken: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{
    accessToken: string;
    newRefreshToken: string;
    user: User;
  } | null> {
    const decodedRefreshToken = verifyRefreshToken(oldRefreshToken);
    if (!decodedRefreshToken) {
      await auditLogService.security(
        "REFRESH_TOKEN_INVALID",
        undefined,
        ipAddress,
        { reason: "malformed_or_expired" }
      );
      return null; // Invalid or expired refresh token
    }

    const { userId, deviceId } = decodedRefreshToken;

    // Check if the refresh token exists and is not revoked in the database
    const deviceResult = await query(
      "SELECT * FROM user_devices WHERE id = $1 AND user_id = $2 AND is_revoked = FALSE AND expires_at > NOW()",
      [deviceId, userId]
    );
    const userDevice: UserDevice | null = deviceResult.rows[0];

    if (!userDevice) {
      await auditLogService.security(
        "REFRESH_TOKEN_INVALID",
        userId,
        ipAddress,
        { reason: "not_found_or_revoked", deviceId }
      );
      return null;
    }

    // Compare the hash of the provided token with the stored hash
    const isTokenValid = await compareTokenHash(
      oldRefreshToken,
      userDevice.refresh_token_hash
    );
    if (!isTokenValid) {
      await auditLogService.security(
        "REFRESH_TOKEN_INVALID",
        userId,
        ipAddress,
        { reason: "hash_mismatch", deviceId }
      );
      // Potentially revoke the device if a mismatch indicates token theft attempt
      await this.revokeUserDevice(userId, deviceId);
      return null;
    }

    const user = await userService.findUserById(userId);
    if (!user || user.global_status === "BANNED") {
      await auditLogService.security(
        "REFRESH_TOKEN_FAILURE",
        userId,
        ipAddress,
        { reason: "user_not_found_or_banned", deviceId }
      );
      // Revoke the refresh token if user is no longer valid
      await this.revokeUserDevice(userId, deviceId);
      return null;
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken(
      user.id,
      user.email,
      user.global_status
    );
    const newRefreshToken = generateRefreshToken(user.id, deviceId); // Keep the same deviceId for the session
    const newRefreshTokenHash = await hashToken(newRefreshToken);
    const newExpiresAt = new Date(
      Date.now() + require("ms")(REFRESH_TOKEN_EXPIRY)
    );

    // Update the refresh token hash and expiry in the database
    await query(
      "UPDATE user_devices SET refresh_token_hash = $1, expires_at = $2, user_agent = $3, ip_address = $4 WHERE id = $5",
      [
        newRefreshTokenHash,
        newExpiresAt,
        userAgent || userDevice.user_agent,
        ipAddress || userDevice.ip_address,
        deviceId,
      ]
    );

    await auditLogService.activity("TOKEN_REFRESH_SUCCESS", user.id, {
      deviceId,
    });

    return { accessToken: newAccessToken, newRefreshToken, user };
  },

  async logoutUser(
    userId: string,
    deviceId: string,
    ipAddress?: string
  ): Promise<void> {
    await this.revokeUserDevice(userId, deviceId);
    await auditLogService.activity("LOGOUT_SUCCESS", userId, {
      ipAddress,
      deviceId,
    });
  },

  async revokeUserDevice(userId: string, deviceId: string): Promise<void> {
    await query(
      "UPDATE user_devices SET is_revoked = TRUE, expires_at = NOW() WHERE id = $1 AND user_id = $2",
      [deviceId, userId]
    );
    await auditLogService.activity("DEVICE_REVOKED", userId, { deviceId });
  },
};
