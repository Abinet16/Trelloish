import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "./jwt";
import { AccessTokenPayload, UserGlobalStatus } from "../models";

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userEmail?: string;
  userStatus?: UserGlobalStatus;
  userIpAddress?: string; // Added to track IP for logging
  userAgent?: string; // Added to track User-Agent for logging
  deviceId?: string; // Added for logout
}

// Middleware for REST endpoints
export const authenticateRest = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: "Authorization header missing" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Bearer token missing" });
  }

  const decoded = verifyAccessToken(token);
  if (!decoded) {
    return res.status(403).json({ message: "Invalid or expired access token" }); // 403 Forbidden for invalid token
  }

  req.userId = decoded.userId;
  req.userEmail = decoded.email;
  req.userStatus = decoded.status;
  req.userIpAddress = req.ip; // Express's 'req.ip' gets client IP
  req.userAgent = req.headers["user-agent"];
  // For logout, we'll extract deviceId from the refresh token or send it in the body.
  // For now, it's not needed by authenticateRest itself.

  next();
};

// Middleware for GraphQL context
// This function will be called for every GraphQL request to build the context
export const buildGraphQLContext = async ({
  req,
  res,
}: {
  req: AuthenticatedRequest;
  res: Response;
}) => {
  const authHeader = req.headers.authorization;
  let user: { id: string; email: string; status: UserGlobalStatus } | null =
    null;
  let ipAddress: string | undefined = req.ip;
  let userAgent: string | undefined = req.headers["user-agent"];

  if (authHeader) {
    const token = authHeader.split(" ")[1];
    if (token) {
      const decoded = verifyAccessToken(token);
      if (decoded) {
        user = {
          id: decoded.userId,
          email: decoded.email,
          status: decoded.status,
        };
      }
    }
  }

  return {
    req,
    res,
    user, // The authenticated user or null
    ipAddress,
    userAgent,
    // Add pubsub for subscriptions later
    // pubsub: new PubSub(), // Example, actual PubSub instance will be created higher up
  };
};

// Type definition for GraphQL Context
export interface GraphQLContext {
  req: AuthenticatedRequest;
  res: Response;
  user: { id: string; email: string; status: UserGlobalStatus } | null;
  ipAddress?: string;
  userAgent?: string;
  pubsub?: any; // Will replace 'any' with actual PubSub type later
}
