import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler.js';
import { sendError } from './utils/apiResponse.js';

dotenv.config();

const app = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Sanitize MongoDB operators from request body/query/params
app.use(mongoSanitize());

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      mailMode: (process.env.MAIL_MODE || 'dev').toLowerCase(),
      aiProvider: (process.env.AI_PROVIDER || 'mock').toLowerCase(),
      cronEnabled: process.env.ENABLE_CRON === 'true',
      timestamp: new Date().toISOString()
    }
  });
});

// App routes
import authRoutes from './routes/auth.routes.js';
import jobRoutes from './routes/job.routes.js';
import recruiterRoutes from './routes/recruiter.routes.js';
import candidateRoutes from './routes/candidate.routes.js';
import applicationRoutes from './routes/application.routes.js';
import resumeRoutes from './routes/resume.routes.js';
import adminRoutes from './routes/admin.routes.js';
import interviewRoutes from './routes/interview.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import devRoutes from './routes/dev.routes.js';

app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/recruiter', recruiterRoutes);
app.use('/api/candidate', candidateRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dev', devRoutes);

// Catch-all 404 for unknown endpoints
app.use((req, res) => {
  sendError(res, { code: 'NOT_FOUND', message: `Cannot ${req.method} ${req.originalUrl}` }, 404);
});

// Central error handler
app.use(errorHandler);

export default app;
