import express from 'express';
import { leadRouter } from './routes/lead.routes.ts';
import { errorHandler } from './middleware/error.middleware.ts';

export function createApp() {
  const app = express();

  // Basic middleware
  app.use(express.json());

  // API Health Check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'LeadPilot API',
      timestamp: new Date().toISOString(),
    });
  });

  // REST API Routes
  app.use('/api/leads', leadRouter);

  // Centralized Error Handler for API
  app.use(errorHandler);

  return app;
}
