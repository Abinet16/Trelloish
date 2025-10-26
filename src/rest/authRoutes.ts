// src/rest/authRoutes.ts
import { Router, Response } from "express";
import { authService } from "../services/authService";
import { AuthenticatedRequest, authenticateRest } from "../auth/authMiddleware";
import { auditLogService } from "../logging/auditLogService";
import { verifyRefreshToken } from "../auth/jwt"; // To extract deviceId from refresh token for logout

const authRouter = Router();

// Utility to set HTTP-only refresh token cookie
const setRefreshTokenCookie = (res: Response, token: string) => {
  res.cookie("refreshToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // Use secure in production
    sameSite: "strict", // CSRF protection
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days, matches REFRESH_TOKEN_EXPIRY
  });
};

// Utility to clear HTTP-only refresh token cookie
const clearRefreshTokenCookie = (res: Response) => {
  res.cookie("refreshToken", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    expires: new Date(0), // Expire immediately
  });
};

/**
 * @route POST /rest/login
 * @description Logs in a user, returns accessToken and sets refreshToken as HTTP-only cookie.
 */
authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const ipAddress = req.ip;
  const userAgent = req.headers["user-agent"];

  if (!email || !password) {
    await auditLogService.security(
      "LOGIN_FAILURE_MISSING_CREDENTIALS",
      undefined,
      ipAddress,
      { email }
    );
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const { accessToken, refreshToken, user } = await authService.loginUser(
      email,
      password,
      ipAddress,
      userAgent
    );
    setRefreshTokenCookie(res, refreshToken);
    return res
      .status(200)
      .json({
        accessToken,
        user: { id: user.id, email: user.email, status: user.global_status },
      });
  } catch (error: any) {
    console.error("Login error:", error);
    // Error handling already includes logging in authService.loginUser for invalid credentials/banned status
    return res.status(401).json({ message: error.message });
  }
});

/**
 * @route POST /rest/logout
 * @description Invalidates the refreshToken server-side and clears the cookie.
 * Requires an access token for authentication (to identify the user), but uses refresh token from cookie for invalidation.
 */
authRouter.post(
  "/logout",
  authenticateRest,
  async (req: AuthenticatedRequest, res) => {
    const refreshToken = req.cookies.refreshToken;
    const ipAddress = req.ip;
    const userId = req.userId; // From authenticateRest middleware

    if (!userId) {
      await auditLogService.security("LOGOUT_FAILURE", undefined, ipAddress, {
        reason: "No authenticated user for logout",
      });
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!refreshToken) {
      // If no refresh token in cookie, but user is authenticated via access token,
      // still proceed to clear cookie and log, just no server-side invalidation.
      clearRefreshTokenCookie(res);
      await auditLogService.info("LOGOUT_NO_REFRESH_TOKEN", userId, ipAddress, {
        reason: "No refresh token in cookie",
      });
      return res
        .status(200)
        .json({ message: "Logged out successfully (no refresh token found)" });
    }

    const decodedRefreshToken = verifyRefreshToken(refreshToken);
    if (!decodedRefreshToken || decodedRefreshToken.userId !== userId) {
      // If the refresh token is invalid or belongs to a different user, clear cookie but don't try to invalidate.
      clearRefreshTokenCookie(res);
      await auditLogService.security("LOGOUT_FAILURE", userId, ipAddress, {
        reason: "Invalid or mismatched refresh token during logout",
      });
      return res
        .status(403)
        .json({ message: "Invalid or mismatched refresh token" });
    }

    try {
      // Revoke the specific device session associated with this refresh token
      await authService.logoutUser(
        userId,
        decodedRefreshToken.deviceId,
        ipAddress
      );
      clearRefreshTokenCookie(res);
      return res.status(200).json({ message: "Logged out successfully" });
    } catch (error: any) {
      console.error("Logout error:", error);
      await auditLogService.error("LOGOUT_ERROR", userId, ipAddress, {
        error: error.message,
      });
      return res.status(500).json({ message: "Failed to logout" });
    }
  }
);

/**
 * @route POST /rest/refresh_token
 * @description Accepts refreshToken (from HTTP-only cookie), issues a new accessToken and new refreshToken.
 */
authRouter.post("/refresh_token", async (req, res) => {
  const oldRefreshToken = req.cookies.refreshToken;
  const ipAddress = req.ip;
  const userAgent = req.headers["user-agent"];

  if (!oldRefreshToken) {
    await auditLogService.security(
      "TOKEN_REFRESH_FAILURE",
      undefined,
      ipAddress,
      { reason: "No refresh token in cookie" }
    );
    return res.status(401).json({ message: "Refresh token not found" });
  }

  try {
    const result = await authService.refreshAccessToken(
      oldRefreshToken,
      ipAddress,
      userAgent
    );

    if (!result) {
      clearRefreshTokenCookie(res); // Clear potentially invalid/revoked refresh token
      return res
        .status(403)
        .json({
          message: "Invalid or expired refresh token. Please login again.",
        });
    }

    const { accessToken, newRefreshToken, user } = result;
    setRefreshTokenCookie(res, newRefreshToken); // Set the new refresh token
    return res
      .status(200)
      .json({
        accessToken,
        user: { id: user.id, email: user.email, status: user.global_status },
      });
  } catch (error:any) {
    console.error("Refresh token error:", error);
    await auditLogService.error("TOKEN_REFRESH_ERROR", undefined, ipAddress, {
      error: error.message,
    });
    clearRefreshTokenCookie(res); // Ensure cookie is cleared on unexpected errors
    return res.status(500).json({ message: "Failed to refresh token" });
  }
});

export default authRouter;
