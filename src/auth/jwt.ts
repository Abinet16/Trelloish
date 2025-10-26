import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import {
  JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET,
  ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY,
} from "../config";
import {
  AccessTokenPayload,
  RefreshTokenPayload,
  UserGlobalStatus,
} from "../models";

export const generateAccessToken = (
  userId: string,
  email: string,
  status: UserGlobalStatus
): string => {
  const payload: AccessTokenPayload = { userId, email, status };
  return jwt.sign(payload, JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
};

export const generateRefreshToken = (
  userId: string,
  deviceId: string
): string => {
  const payload: RefreshTokenPayload = { userId, deviceId };
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
};

export const verifyAccessToken = (token: string): AccessTokenPayload | null => {
  try {
    return jwt.verify(token, JWT_ACCESS_SECRET) as AccessTokenPayload;
  } catch (error: any) {
    console.error("Access Token Verification Failed:", error.message);
    return null;
  }
};

export const verifyRefreshToken = (
  token: string
): RefreshTokenPayload | null => {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as RefreshTokenPayload;
  } catch (error: any) {
    console.error("Refresh Token Verification Failed:", error.message);
    return null;
  }
};

export const hashToken = async (token: string): Promise<string> => {
  // This is a simple hash for demonstration. In a real app, use a more robust hashing algorithm
  // like bcrypt if you intend to compare raw tokens directly (though typically you'd hash at generation)
  // For refresh tokens, we hash them before storing in DB and compare the hash, not the raw token.
  const SALT_ROUNDS = 10; // Define salt rounds for bcrypt
  return bcrypt.hash(token, SALT_ROUNDS);
};

export const compareTokenHash = async (
  token: string,
  hashedToken: string
): Promise<boolean> => {
   return bcrypt.compare(token, hashedToken);
};
