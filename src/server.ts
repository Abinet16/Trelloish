// src/server.ts
import { httpServer } from "./app";
import { PORT } from "./config";
import logger from "./logging/logger";
import pool,{ query } from "./db"; // Import query to test DB connection

// Simple DB connection test
async function testDbConnection() {
  try {
    await query("SELECT 1+1 AS result;");
    logger.info("Database connection successful!");
  } catch (error: any) {
    logger.error("Failed to connect to database:", {
      action: "DB_CONNECTION_FAILED",
      details: { message: error.message },
      error: error,
    });
    process.exit(1); // Exit if DB connection fails
  }
}

async function startServer() {
  // Ensure DB connection before starting the server
  await testDbConnection();

  httpServer.listen(PORT, () => {
    logger.info(`Server is running on http://localhost:${PORT}`);
    logger.info(`GraphQL endpoint: http://localhost:${PORT}/graphql`);
    logger.info(`REST endpoint: http://localhost:${PORT}/rest`);
    // logger.info(
    //   `GraphQL Subscriptions endpoint: ws://localhost:${PORT}/graphql`
    // );
  });
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  await httpServer.close(() => {
    logger.info('HTTP server closed.');
    // Close DB connections
    pool.end().then(() => { // Explicitly end the pool
      logger.info('Database pool ended.');
      process.exit(0);
    }).catch(err => {
      logger.error('Error ending database pool:', { error: err.message });
      process.exit(1);
    });
  });
});


startServer();
