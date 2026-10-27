"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const websocket_js_1 = require("./websocket.js");
const auth_routes_js_1 = require("./routes/auth.routes.js");
const chats_routes_js_1 = require("./routes/chats.routes.js");
const users_routes_js_1 = require("./routes/users.routes.js");
const media_routes_js_1 = require("./routes/media.routes.js");
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const PORT = process.env.PORT || 5000;
// Enable CORS for client development
app.use((0, cors_1.default)({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
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
app.use('/api/auth', auth_routes_js_1.authRouter);
app.use('/api/chats', chats_routes_js_1.chatsRouter);
app.use('/api/users', users_routes_js_1.usersRouter);
app.use('/api/media', media_routes_js_1.mediaRouter);
// Initialize WebSocket server
(0, websocket_js_1.setupWebSocketServer)(server);
server.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`  🟢 OromoChat Server running on http://localhost:${PORT}`);
    console.log(`  📡 WebSocket Server ready at ws://localhost:${PORT}/ws`);
    console.log(`  🌍 Supported Languages: Afaan Oromoo (om) & English (en)`);
    console.log(`======================================================\n`);
});
