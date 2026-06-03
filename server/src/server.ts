import dotenv from 'dotenv';
dotenv.config();

import express, { Express, Request, Response } from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';

import route from './routes/index';
import connectDB from './Config/db';
import { connectionRedis } from './Config/redis';
import { askQuestion } from './utils/chatbot';
import {
    helmetMiddleware,
    generalRateLimit,
    chatRateLimit,
    globalErrorHandler,
} from './middlewares/security';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 5001;

const app: Express = express();
const server = http.createServer(app);

const io = new SocketIOServer(server, {
    cors: {
        origin: process.env.REACT_APP_URL,
        methods: ['GET', 'POST'],
        allowedHeaders: ['my-custom-header'],
        credentials: true,
    },
});

// ─── Trust Proxy (nginx sits in front) ───────────────────────────────────────
app.set('trust proxy', 1);

// ─── Security Middleware (first) ─────────────────────────────────────────────
app.use(helmetMiddleware);
app.use(generalRateLimit);

// ─── Core Middleware ──────────────────────────────────────────────────────────
app.use(cookieParser());
app.use(cors({ origin: process.env.REACT_APP_URL, credentials: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '')));

// ─── Routes ───────────────────────────────────────────────────────────────────
route(app);

// ─── Chat endpoint ────────────────────────────────────────────────────────────
app.post('/chat', chatRateLimit, async (req: Request, res: Response) => {
    const { question } = req.body as { question: string };
    const data = await askQuestion(question);
    return res.status(200).json(data);
});

// ─── Global Error Handler (last) ─────────────────────────────────────────────
app.use(globalErrorHandler);

// ─── Database Connections ─────────────────────────────────────────────────────
connectDB();
connectionRedis();

// ─── Start Server ─────────────────────────────────────────────────────────────
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

export default app;
