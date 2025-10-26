import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { WebSocketServer } from "ws";
import { useServer } from "graphql-ws/lib/use/ws";
import http from "http";
import { verifyAccessToken } from "./auth/jwt";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { resolvers } from "./graphql/resolvers";
import { typeDefs } from "./graphql/schema";
import { auditLogService } from "./logging/auditLogService";
import {
  buildGraphQLContext,
  GraphQLContext,
  AuthenticatedRequest,
} from "./auth/authMiddleware";
import logger from "./logging/logger";
import { PubSub } from "graphql-subscriptions"; // For real-time updates
import rateLimit from "express-rate-limit";
import restRouter from "./rest";

export const pubsub = new PubSub(); // Initialize PubSub here

const app = express();
const httpServer = http.createServer(app);

// GraphQL schema
const schema = makeExecutableSchema({ typeDefs, resolvers });

// Set up WebSocket server for subscriptions
const wsServer = new WebSocketServer({
  server: httpServer,
  path: "/graphql", // WebSocket endpoint for subscriptions
});

// `useServer` will take care of managing the WebSocket connection and executing subscriptions
const serverCleanup = useServer(
  {
    schema,
    context: async (ctx) => {
      // context for subscriptions
      const connectionParams = ctx.connectionParams;
      let user = null;
      if (connectionParams && connectionParams.authorization) {
        const token = (connectionParams.authorization as string).split(" ")[1];
        const decoded = verifyAccessToken(token);
        if (decoded) {
          user = {
            id: decoded.userId,
            email: decoded.email,
            status: decoded.status,
          };
        }
      }
      return { user, pubsub }; // Pass pubsub to subscription resolvers
    },
  },
  wsServer
);

// Apollo Server setup
const apolloServer = new ApolloServer<GraphQLContext>({
  schema,
  plugins: [
    ApolloServerPluginDrainHttpServer({ httpServer }),
    {
      async serverWillStart() {
        return {
          async drainServer() {
            await serverCleanup.dispose();
          },
        };
      },
    },
  ],
});

await apolloServer.start();

// Express Middleware
app.use(
  cors<cors.CorsRequest>({
    origin: process.env.CORS_ORIGIN || "*", // Adjust for your frontend URL in production
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json()); // For parsing application/json

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 attempts per windowMs for these sensitive actions
  message:
    "Too many authentication attempts from this IP, please try again after 15 minutes",
  // You can also add a custom handler to log these events
  handler: (req, res, next, options) => {
    auditLogService.security("RATE_LIMIT_EXCEEDED", undefined, req.ip, {
      path: req.path,
      limit: options.max,
    });
    res.status(options.statusCode).send(options.message);
  },
});

// REST API routes
app.use("/rest",restRouter);



// GraphQL API route
app.use(
  "/graphql",
  expressMiddleware(apolloServer, {
    context: buildGraphQLContext, // Use the buildGraphQLContext for requests
  })
);

// Basic health check or root route
app.get("/", (req, res) => {
  res.send("Collaborative Platform Backend is running!");
});

// Global error handler (optional, but good practice)
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error("Unhandled application error:", {
    level: "error",
    action: "UNHANDLED_ERROR",
    details: { message: err.message, stack: err.stack, path: req.path },
  });
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({ message: "Internal Server Error" });
});

export { httpServer }; // Export httpServer to be started by server.ts
