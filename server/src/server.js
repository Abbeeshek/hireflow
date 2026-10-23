import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { connectDB } from './config/db.js';
import { startCron, stopCron } from './services/cronService.js';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    startCron();
    const server = app.listen(PORT, () => {
      console.log(`[Server] HireFlow API listening on http://localhost:${PORT}`);
    });

    const shutdown = () => {
      console.log('[Server] Gracefully shutting down...');
      stopCron();
      server.close(() => {
        console.log('[Server] Closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (err) {
    console.error('[Server] Failed to start:', err);
    process.exit(1);
  }
};

startServer();
