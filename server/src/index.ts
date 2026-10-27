import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { setupWebSocketServer } from './websocket.js';
import { authRouter } from './routes/auth.routes.js';
import { chatsRouter } from './routes/chats.routes.js';
import { usersRouter } from './routes/users.routes.js';
import { mediaRouter } from './routes/media.routes.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;

// Enable CORS for client development
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check & API info
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'OromoChat Backend API',
    version: '1.0.0',
    languages: ['om', 'en'],
    time: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/chats', chatsRouter);
app.use('/api/users', usersRouter);
app.use('/api/media', mediaRouter);

// Initialize WebSocket server
setupWebSocketServer(server);

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`  🟢 OromoChat Server running on http://localhost:${PORT}`);
  console.log(`  📡 WebSocket Server ready at ws://localhost:${PORT}/ws`);
  console.log(`  🌍 Supported Languages: Afaan Oromoo (om) & English (en)`);
  console.log(`======================================================\n`);
});
