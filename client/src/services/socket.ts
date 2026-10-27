import { WsMessagePayload } from '../types.js';
import { api } from './api.js';

type MessageHandler = (payload: any) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, Set<MessageHandler>>();
  private reconnectTimeout: any = null;
  private isConnecting = false;

  constructor() {
    this.handlers.set('*', new Set());
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isConnecting = true;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Use window.location.host with Vite proxy or direct port 5000
    const host = window.location.port === '5173' ? 'localhost:5000' : window.location.host;
    const url = `${protocol}//${host}/ws`;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('📡 Connected to OromoChat WebSocket');
        this.isConnecting = false;
        const token = api.getToken();
        if (token) {
          this.send('AUTH', { token });
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data: WsMessagePayload = JSON.parse(event.data);
          this.emit(data.type, data.payload);
          this.emit('*', data);
        } catch (err) {
          console.error('[WS Client] Parse error:', err);
        }
      };

      this.ws.onclose = () => {
        this.ws = null;
        this.isConnecting = false;
        // Reconnect after 3 seconds
        if (!this.reconnectTimeout) {
          this.reconnectTimeout = setTimeout(() => {
            this.reconnectTimeout = null;
            this.connect();
          }, 3000);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('[WS Client] Connection warning:', err);
      };
    } catch (err) {
      this.isConnecting = false;
    }
  }

  authenticate(token: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send('AUTH', { token });
    } else {
      this.connect();
    }
  }

  send(type: WsMessagePayload['type'], payload: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    }
  }

  sendTyping(chatId: string, isTyping: boolean) {
    this.send('TYPING', { chatId, isTyping });
  }

  on(type: string, handler: MessageHandler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);

    return () => {
      this.handlers.get(type)?.delete(handler);
    };
  }

  private emit(type: string, payload: any) {
    const list = this.handlers.get(type);
    if (list) {
      list.forEach((handler) => handler(payload));
    }
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const socket = new WebSocketClient();
