import { WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';
import { verifyToken } from './auth.js';
import { db } from './db.js';
import { WsMessagePayload } from './types.js';

interface AuthenticatedSocket extends WebSocket {
  userId?: string;
  isAlive?: boolean;
}

let wss: WebSocketServer | null = null;
const userSockets = new Map<string, Set<AuthenticatedSocket>>();

export function setupWebSocketServer(server: Server): WebSocketServer {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: AuthenticatedSocket) => {
    ws.isAlive = true;

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', (data: string) => {
      try {
        const parsed: WsMessagePayload = JSON.parse(data.toString());
        handleWsMessage(ws, parsed);
      } catch (err) {
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
            db.updateUser(ws.userId, { status: 'offline', lastSeen: new Date().toISOString() });
            broadcastPresence(ws.userId, 'offline', new Date().toISOString());
          }
        }
      }
    });
  });

  // Ping interval to maintain keep-alive
  const interval = setInterval(() => {
    if (!wss) return;
    wss.clients.forEach((client) => {
      const authWs = client as AuthenticatedSocket;
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

function handleWsMessage(ws: AuthenticatedSocket, message: WsMessagePayload) {
  switch (message.type) {
    case 'AUTH': {
      const { token } = message.payload;
      const decoded = verifyToken(token);
      if (decoded && decoded.id) {
        const uid = decoded.id;
        ws.userId = uid;
        if (!userSockets.has(uid)) {
          userSockets.set(uid, new Set());
        }
        userSockets.get(uid)!.add(ws);

        // Update user status
        db.updateUser(uid, { status: 'online', lastSeen: new Date().toISOString() });
        broadcastPresence(uid, 'online', new Date().toISOString());

        ws.send(JSON.stringify({ type: 'AUTH_SUCCESS', payload: { userId: uid } }));
        console.log(`[WS] User authenticated: ${uid}`);
      } else {
        ws.send(JSON.stringify({ type: 'AUTH_ERROR', payload: { message: 'Invalid token' } }));
      }
      break;
    }

    case 'TYPING': {
      // payload: { chatId, isTyping }
      if (!ws.userId) return;
      const { chatId, isTyping } = message.payload;
      broadcastToChat(
        chatId,
        {
          type: 'TYPING',
          payload: { chatId, userId: ws.userId, isTyping },
        },
        ws.userId
      );
      break;
    }

    case 'MESSAGE_STATUS': {
      // payload: { chatId, messageId, status: 'delivered' | 'read' }
      if (!ws.userId) return;
      const { chatId, messageId, status } = message.payload;
      db.updateMessage(chatId, messageId, { status });
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

export function broadcastToUser(userId: string, payload: WsMessagePayload) {
  const sockets = userSockets.get(userId);
  if (sockets) {
    const data = JSON.stringify(payload);
    sockets.forEach((s) => {
      if (s.readyState === WebSocket.OPEN) {
        s.send(data);
      }
    });
  }
}

export function broadcastToChat(chatId: string, payload: WsMessagePayload, excludeUserId?: string) {
  const chat = db.getChatById(chatId);
  if (!chat) return;

  // In a direct or group chat, send to participants
  // For channels, send to all participants or connected users
  const recipients = chat.type === 'channel'
    ? Array.from(userSockets.keys()) // public channel broadcast
    : chat.participantIds;

  recipients.forEach((userId) => {
    if (excludeUserId && userId === excludeUserId) return;
    broadcastToUser(userId, payload);
  });
}

export function broadcastPresence(userId: string, status: 'online' | 'offline' | 'away', lastSeen: string) {
  const payload: WsMessagePayload = {
    type: 'PRESENCE_UPDATE',
    payload: { userId, status, lastSeen },
  };

  if (!wss) return;
  const data = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}
