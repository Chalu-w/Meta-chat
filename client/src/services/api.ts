import { User, Chat, Message } from '../types.js';

const API_BASE = '/api';

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('oromochat_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('oromochat_token', token);
    } else {
      localStorage.removeItem('oromochat_token');
    }
  }

  getToken(): string | null {
    return this.token || localStorage.getItem('oromochat_token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Server error occurred');
      }
      return data;
    } catch (err: any) {
      console.warn(`[API] ${endpoint} request error:`, err.message);
      throw err;
    }
  }

  // Auth Endpoints
  async checkSmsStatus() {
    return this.request<{
      configured: boolean;
      provider: string;
      devSandboxAllowed: boolean;
      devSandboxNumber?: string;
    }>('/auth/sms-status');
  }

  async sendOtp(data: { phone?: string; countryCode?: string; localNumber?: string }) {
    return this.request<{
      success: boolean;
      delivered: boolean;
      provider: string;
      carrier?: string;
      phone: string;
      message: string;
      isSandbox?: boolean;
      error?: string;
    }>('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }


  async verifyOtp(phone: string, code: string) {
    const res = await this.request<{
      success: boolean;
      user?: User;
      token?: string;
      isNewUser: boolean;
      phone?: string;
    }>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
    });

    if (res.token) {
      this.setToken(res.token);
    }
    return res;
  }

  async firebaseLogin(idToken: string, phone: string, displayName?: string) {
    const res = await this.request<{
      success: boolean;
      user: User;
      token: string;
      isNewUser: boolean;
    }>('/auth/firebase-login', {
      method: 'POST',
      body: JSON.stringify({ idToken, phone, displayName }),
    });

    if (res.token) {
      this.setToken(res.token);
    }
    return res;
  }


  async login(identifier: string, password: string) {
    const res = await this.request<{ success: boolean; user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
    if (res.token) {
      this.setToken(res.token);
    }
    return res;
  }

  async register(data: {
    phone: string;
    displayName: string;
    username?: string;
    password: string;
    bio?: string;
    avatarUrl?: string;
    language?: string;
  }) {
    const res = await this.request<{ success: boolean; user: User; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.token) {
      this.setToken(res.token);
    }
    return res;
  }

  async getMe() {
    return this.request<{ user: User }>('/auth/me');
  }

  // Chats Endpoints
  async getChats(filter?: string, query?: string) {
    const params = new URLSearchParams();
    if (filter) params.append('filter', filter);
    if (query) params.append('q', query);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return this.request<{ chats: Chat[] }>(`/chats${queryString}`);
  }

  async createChat(data: {
    type: 'direct' | 'group' | 'channel';
    title?: string;
    username?: string;
    description?: string;
    participantIds?: string[];
    avatarUrl?: string;
  }) {
    return this.request<{ chat: Chat; isExisting?: boolean }>('/chats', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getChat(chatId: string) {
    return this.request<{ chat: Chat }>(`/chats/${chatId}`);
  }

  async getMessages(chatId: string) {
    return this.request<{ messages: Message[] }>(`/chats/${chatId}/messages`);
  }

  async sendMessage(
    chatId: string,
    message: {
      content: string;
      type?: 'text' | 'image' | 'voice' | 'file';
      mediaUrl?: string;
      mediaDuration?: number;
      fileName?: string;
      fileSize?: string;
      replyToId?: string;
    }
  ) {
    return this.request<{ message: Message }>(`/chats/${chatId}/messages`, {
      method: 'POST',
      body: JSON.stringify(message),
    });
  }

  async toggleReaction(chatId: string, messageId: string, emoji: string) {
    return this.request<{ success: boolean; message: Message }>(`/chats/${chatId}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ messageId, emoji }),
    });
  }

  async pinMessage(chatId: string, messageId: string, isPinned: boolean) {
    return this.request<{ success: boolean; message: Message }>(`/chats/${chatId}/pin`, {
      method: 'POST',
      body: JSON.stringify({ messageId, isPinned }),
    });
  }

  async deleteMessage(chatId: string, messageId: string) {
    return this.request<{ success: boolean }>(`/chats/${chatId}/messages/${messageId}`, {
      method: 'DELETE',
    });
  }

  // Users Endpoints
  async searchUsers(query: string) {
    return this.request<{ users: User[] }>(`/users/search?q=${encodeURIComponent(query)}`);
  }

  async getUser(id: string) {
    return this.request<{ user: User }>(`/users/${id}`);
  }

  async updateProfile(updates: Partial<User>) {
    return this.request<{ success: boolean; user: User }>('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // Media Endpoints
  async uploadMedia(data: {
    type: 'voice' | 'image' | 'file';
    data: string;
    fileName?: string;
    duration?: number;
  }) {
    return this.request<{
      success: boolean;
      mediaUrl: string;
      fileName?: string;
      duration?: number;
      externalConfigNote?: string;
    }>('/media/upload', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const api = new ApiService();
