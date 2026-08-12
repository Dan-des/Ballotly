import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import pollRoutes from './routes/pollRoutes.js';
import voteRoutes from './routes/voteRoutes.js';
import { verifyTransporter } from './services/emailService.js';


dotenv.config();

const app = express();
let PORT = process.env.PORT || 5001;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/student_voting_db';

// Middleware Configuration
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api', pollRoutes);
app.use('/api', voteRoutes);

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    timestamp: new Date(),
    dbState: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

let memoryDbInstance = null;

// Database Connection & Server Initialization Function
export async function startServer(customMongoUri = null) {
  const uriToUse = customMongoUri || MONGO_URI;

  if (mongoose.connection.readyState === 0) {
    console.log(`[MongoDB] Attempting connection to ${uriToUse}...`);
    try {
      await mongoose.connect(uriToUse, { serverSelectionTimeoutMS: 2000 });
      console.log(`[MongoDB] Successfully connected to database.`);
    } catch (error) {
      console.log(`[MongoDB Notice] Could not connect to local MongoDB service (${error.message}).`);
      console.log(`[MongoDB Auto-Fallback] Initializing in-memory MongoDB server...`);

      try {
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        memoryDbInstance = await MongoMemoryServer.create({
          instance: { dbName: 'student_voting_db' }
        });
        const memUri = memoryDbInstance.getUri();
        await mongoose.connect(memUri);
        console.log(`[MongoDB Auto-Fallback] ✔ Connected to In-Memory MongoDB instance successfully!`);
      } catch (fallbackErr) {
        console.error(`[MongoDB Error] Fallback initialization failed: ${fallbackErr.message}`);
      }
    }
  }

  return new Promise((resolve, reject) => {
    const serverInstance = app.listen(PORT, '0.0.0.0', () => {
      console.log(`[Server Ready] Listening on http://0.0.0.0:${PORT} (Accessible on local Wi-Fi network)`);
      verifyTransporter();
      resolve({ app, serverInstance });
    });

    serverInstance.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`[Port Warning] Port ${PORT} is busy. Trying port ${Number(PORT) + 1}...`);
        PORT = Number(PORT) + 1;
        const retryServer = app.listen(PORT, '0.0.0.0', () => {
          console.log(`[Server Ready] Listening on http://0.0.0.0:${PORT}`);
          resolve({ app, serverInstance: retryServer });
        });
      } else {
        reject(err);
      }
    });
  });
}

// Only auto-start if run directly
if (process.argv[1] && process.argv[1].endsWith('server.js')) {
  startServer();
}

export default app;
