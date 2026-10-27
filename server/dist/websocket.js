"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupWebSocketServer = setupWebSocketServer;
exports.broadcastToUser = broadcastToUser;
exports.broadcastToChat = broadcastToChat;
exports.broadcastPresence = broadcastPresence;
const ws_1 = require("ws");
const auth_js_1 = require("./auth.js");
const db_js_1 = require("./db.js");
let wss = null;
const userSockets = new Map();
function setupWebSocketServer(server) {
    wss = new ws_1.WebSocketServer({ server, path: '/ws' });
    wss.on('connection', (ws) => {
        ws.isAlive = true;
        ws.on('pong', () => {
            ws.isAlive = true;
        });
        ws.on('message', (data) => {
            try {
                const parsed = JSON.parse(data.toString());
                handleWsMessage(ws, parsed);
            }
            catch (err) {
                console.error('[WS Parse Error]:', err);
            }
        });
        ws.on('close', () => {
            if (ws.userId) {
                const set = userSockets.get(ws.userId);
                if (set) {
                    set.delete(ws);
                    if (set.size === 0) {
                        userSockets.delete(ws.userId);
                        // Mark user offline
                        db_js_1.db.updateUser(ws.userId, { status: 'offline', lastSeen: new Date().toISOString() });
                        broadcastPresence(ws.userId, 'offline', new Date().toISOString());
                    }
                }
            }
        });
    });
    // Ping interval to maintain keep-alive
    const interval = setInterval(() => {
        if (!wss)
            return;
        wss.clients.forEach((client) => {
            const authWs = client;
            if (!authWs.isAlive) {
                return authWs.terminate();
            }
            authWs.isAlive = false;
            authWs.ping();
        });
    }, 30000);
    wss.on('close', () => {
        clearInterval(interval);
    });
    console.log('📡 WebSocket server initialized on path /ws');
    return wss;
}
function handleWsMessage(ws, message) {
    switch (message.type) {
        case 'AUTH': {
            const { token } = message.payload;
            const decoded = (0, auth_js_1.verifyToken)(token);
            if (decoded && decoded.id) {
                const uid = decoded.id;
                ws.userId = uid;
                if (!userSockets.has(uid)) {
                    userSockets.set(uid, new Set());
                }
                userSockets.get(uid).add(ws);
                // Update user status
                db_js_1.db.updateUser(uid, { status: 'online', lastSeen: new Date().toISOString() });
                broadcastPresence(uid, 'online', new Date().toISOString());
                ws.send(JSON.stringify({ type: 'AUTH_SUCCESS', payload: { userId: uid } }));
                console.log(`[WS] User authenticated: ${uid}`);
            }
            else {
                ws.send(JSON.stringify({ type: 'AUTH_ERROR', payload: { message: 'Invalid token' } }));
            }
            break;
        }
        case 'TYPING': {
            // payload: { chatId, isTyping }
            if (!ws.userId)
                return;
            const { chatId, isTyping } = message.payload;
            broadcastToChat(chatId, {
                type: 'TYPING',
                payload: { chatId, userId: ws.userId, isTyping },
            }, ws.userId);
            break;
        }
        case 'MESSAGE_STATUS': {
            // payload: { chatId, messageId, status: 'delivered' | 'read' }
            if (!ws.userId)
                return;
            const { chatId, messageId, status } = message.payload;
            db_js_1.db.updateMessage(chatId, messageId, { status });
            broadcastToChat(chatId, {
                type: 'MESSAGE_STATUS',
                payload: { chatId, messageId, status, updatedBy: ws.userId },
            });
            break;
        }
        default:
            break;
    }
}
function broadcastToUser(userId, payload) {
    const sockets = userSockets.get(userId);
    if (sockets) {
        const data = JSON.stringify(payload);
        sockets.forEach((s) => {
            if (s.readyState === ws_1.WebSocket.OPEN) {
                s.send(data);
            }
        });
    }
}
function broadcastToChat(chatId, payload, excludeUserId) {
    const chat = db_js_1.db.getChatById(chatId);
    if (!chat)
        return;
    // In a direct or group chat, send to participants
    // For channels, send to all participants or connected users
    const recipients = chat.type === 'channel'
        ? Array.from(userSockets.keys()) // public channel broadcast
        : chat.participantIds;
    recipients.forEach((userId) => {
        if (excludeUserId && userId === excludeUserId)
            return;
        broadcastToUser(userId, payload);
    });
}
function broadcastPresence(userId, status, lastSeen) {
    const payload = {
        type: 'PRESENCE_UPDATE',
        payload: { userId, status, lastSeen },
    };
    if (!wss)
        return;
    const data = JSON.stringify(payload);
    wss.clients.forEach((client) => {
        if (client.readyState === ws_1.WebSocket.OPEN) {
            client.send(data);
        }
    });
}
