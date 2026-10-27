export type LanguageCode = 'en' | 'om' | 'am';

export type ThemeMode = 'telegram-dark' | 'telegram-night' | 'telegram-light';

export type UserStatus = 'online' | 'offline' | 'away';

export interface User {
  id: string; // Firebase Authentication UID
  uid?: string; // Explicit Firebase UID alias
  phone: string;
  username: string;
  displayName: string;
  bio?: string;
  avatarUrl: string;
  status: UserStatus;
  lastSeen: string;
  language: LanguageCode;
  theme: ThemeMode;
  notificationsEnabled: boolean;
  privacyLastSeen: 'everybody' | 'contacts' | 'nobody';
  createdAt: string;
}

export type ChatType = 'direct' | 'group' | 'channel';

export interface Chat {
  id: string;
  type: ChatType;
  title: string;
  avatarUrl: string;
  username?: string;
  description?: string;
  participantIds: string[];
  adminIds: string[];
  creatorId: string;
  unreadCount: number;
  isPinned: boolean;
  isMuted: boolean;
  lastMessage?: Message;
  memberCount?: number;
  subscriberCount?: number;
  updatedAt: string;
}

export type MessageType = 'text' | 'image' | 'voice' | 'file' | 'system';
export type MessageDeliveryStatus = 'sending' | 'sent' | 'delivered' | 'read';

export interface MessageReaction {
  emoji: string;
  count: number;
  users: string[];
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  senderUsername?: string;
  type: MessageType;
  content: string;
  mediaUrl?: string;
  mediaDuration?: number;
  fileName?: string;
  fileSize?: string;
  replyToId?: string;
  replyToMessage?: {
    id: string;
    senderName: string;
    content: string;
  };
  status: MessageDeliveryStatus;
  reactions: Record<string, string[]>;
  isPinned?: boolean;
  views?: number;
  createdAt: string;
}

export interface WsMessagePayload {
  type:
    | 'AUTH'
    | 'AUTH_SUCCESS'
    | 'MESSAGE_SEND'
    | 'MESSAGE_NEW'
    | 'MESSAGE_STATUS'
    | 'MESSAGE_REACT'
    | 'TYPING'
    | 'PRESENCE_UPDATE'
    | 'PIN_MESSAGE'
    | 'DELETE_MESSAGE'
    | 'NOTIFICATION';
  payload: any;
}
