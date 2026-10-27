import { User, Chat, Message } from './types.js';
import bcrypt from 'bcryptjs';

export interface UserWithPassword extends User {
  passwordHash: string;
}

export interface OtpEntry {
  code: string;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
  hourlyCount: number;
  hourResetAt: number;
}

export interface DatabaseState {
  users: Map<string, UserWithPassword>;
  chats: Map<string, Chat>;
  messages: Map<string, Message[]>;
  otps: Map<string, OtpEntry>;
}

export class OromoChatDatabase {
  private users = new Map<string, UserWithPassword>();
  private chats = new Map<string, Chat>();
  private messages = new Map<string, Message[]>(); // chatId -> Message[]
  private otps = new Map<string, OtpEntry>();

  constructor() {
    this.seedInitialData();
  }

  private seedInitialData() {
    const passwordHash = bcrypt.hashSync('password123', 8);

    // Seed Users with authentic Afaan Oromoo and English profiles
    const seedUsers: UserWithPassword[] = [
      {
        id: 'user-chala',
        phone: '+251911223344',
        username: 'chala_b',
        displayName: 'Caalaa Bantii',
        bio: 'Injinara Sooftiweerii fi jaallataa Afaan Oromoo | Software Engineer & Open Source Advocate',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        status: 'online',
        lastSeen: new Date().toISOString(),
        language: 'om',
        theme: 'telegram-dark',
        notificationsEnabled: true,
        privacyLastSeen: 'everybody',
        createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
        passwordHash,
      },
      {
        id: 'user-hawani',
        phone: '+251922334455',
        username: 'hawani_d',
        displayName: 'Hawaanii Dastaa',
        bio: 'Dizaayinara UI/UX & Qorattuu Aadaa | Designing digital experiences for East Africa',
        avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
        status: 'online',
        lastSeen: new Date().toISOString(),
        language: 'om',
        theme: 'telegram-dark',
        notificationsEnabled: true,
        privacyLastSeen: 'everybody',
        createdAt: new Date(Date.now() - 25 * 86400000).toISOString(),
        passwordHash,
      },
      {
        id: 'user-gadaa',
        phone: '+251933445566',
        username: 'gadaa_t',
        displayName: 'Gadaa Tolasaa',
        bio: 'Qorataa Saayinsii Kompiitaraa fi AI | Finfinnee, Oromia',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        status: 'away',
        lastSeen: new Date(Date.now() - 15 * 60000).toISOString(),
        language: 'en',
        theme: 'telegram-night',
        notificationsEnabled: true,
        privacyLastSeen: 'contacts',
        createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
        passwordHash,
      },
      {
        id: 'user-bilisummaa',
        phone: '+251944556677',
        username: 'bilisummaa_k',
        displayName: 'Bilisummaa Kabbadaa',
        bio: 'Gulaalaa Oduu fi Gaazeexeessaa | Journalistic storytelling & cultural archives',
        avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
        status: 'offline',
        lastSeen: new Date(Date.now() - 120 * 60000).toISOString(),
        language: 'om',
        theme: 'telegram-dark',
        notificationsEnabled: true,
        privacyLastSeen: 'everybody',
        createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
        passwordHash,
      },
    ];

    seedUsers.forEach((u) => this.users.set(u.id, u));

    // Seed Chats: Direct, Groups, and Channels
    const seedChats: Chat[] = [
      {
        id: 'chat-hawani',
        type: 'direct',
        title: 'Hawaanii Dastaa',
        avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
        participantIds: ['user-chala', 'user-hawani'],
        adminIds: ['user-chala', 'user-hawani'],
        creatorId: 'user-hawani',
        unreadCount: 1,
        isPinned: true,
        isMuted: false,
        updatedAt: new Date(Date.now() - 2 * 60000).toISOString(),
      },
      {
        id: 'chat-tech-group',
        type: 'group',
        title: 'Oromia Tech Community 💻',
        avatarUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=80',
        description: 'Waldaa Teeknooloojii fi Dagaagina Sooftiweerii Oromiyaa. Welcome to the tech discussion hub!',
        participantIds: ['user-chala', 'user-hawani', 'user-gadaa', 'user-bilisummaa'],
        adminIds: ['user-chala', 'user-gadaa'],
        creatorId: 'user-chala',
        unreadCount: 3,
        isPinned: true,
        isMuted: false,
        memberCount: 1240,
        updatedAt: new Date(Date.now() - 8 * 60000).toISOString(),
      },
      {
        id: 'chat-oda-channel',
        type: 'channel',
        title: 'Odaa News & Culture 🌿',
        username: 'odaa_news',
        avatarUrl: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=150&auto=format&fit=crop&q=80',
        description: 'Oduuwwan haarawaa, Aadaa, Seenaa fi Odeeffannoowwan yeroo ammaa Afaan Oromootin.',
        participantIds: ['user-chala'],
        adminIds: ['user-bilisummaa'],
        creatorId: 'user-bilisummaa',
        unreadCount: 0,
        isPinned: false,
        isMuted: false,
        subscriberCount: 18500,
        updatedAt: new Date(Date.now() - 45 * 60000).toISOString(),
      },
      {
        id: 'chat-gadaa',
        type: 'direct',
        title: 'Gadaa Tolasaa',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        participantIds: ['user-chala', 'user-gadaa'],
        adminIds: ['user-chala', 'user-gadaa'],
        creatorId: 'user-gadaa',
        unreadCount: 0,
        isPinned: false,
        isMuted: false,
        updatedAt: new Date(Date.now() - 3 * 3600000).toISOString(),
      },
      {
        id: 'chat-finfinnee-channel',
        type: 'channel',
        title: 'Finfinnee Events & Meetups 📍',
        username: 'finfinnee_events',
        avatarUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=150&auto=format&fit=crop&q=80',
        description: 'Events, tech hackathons, cultural festivals, and networking meetings in Finfinnee.',
        participantIds: ['user-chala'],
        adminIds: ['user-hawani'],
        creatorId: 'user-hawani',
        unreadCount: 0,
        isPinned: false,
        isMuted: true,
        subscriberCount: 8420,
        updatedAt: new Date(Date.now() - 12 * 3600000).toISOString(),
      },
    ];

    seedChats.forEach((c) => this.chats.set(c.id, c));

    // Seed Messages
    const directHawaniMsgs: Message[] = [
      {
        id: 'msg-h1',
        chatId: 'chat-hawani',
        senderId: 'user-chala',
        senderName: 'Caalaa Bantii',
        senderAvatar: seedUsers[0].avatarUrl,
        type: 'text',
        content: 'Akkam jirta Hawaanii? Pirojektii haaraa OromoChat irratti dizaayiniin UI/UX garam geesse?',
        status: 'read',
        reactions: { '👍': ['user-hawani'] },
        createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
      },
      {
        id: 'msg-h2',
        chatId: 'chat-hawani',
        senderId: 'user-hawani',
        senderName: 'Hawaanii Dastaa',
        senderAvatar: seedUsers[1].avatarUrl,
        type: 'text',
        content: 'Nagaa kooti Caalaa! Dizaayinii Telegram irratti hundaaʼee Afaan Oromoo fi Ingiliffaa walfaana deeggaru qopheesseen jira. Baayʼee bareeda!',
        status: 'read',
        reactions: { '🔥': ['user-chala'], '❤️': ['user-chala'] },
        createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
      },
      {
        id: 'msg-h3',
        chatId: 'chat-hawani',
        senderId: 'user-chala',
        senderName: 'Caalaa Bantii',
        senderAvatar: seedUsers[0].avatarUrl,
        type: 'text',
        content: 'Baga gammaddan! Sagalee (Voice note) fi ergaa suuraas akka sirriitti hojjetu goona.',
        status: 'read',
        reactions: {},
        createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
      },
      {
        id: 'msg-h4',
        chatId: 'chat-hawani',
        senderId: 'user-hawani',
        senderName: 'Hawaanii Dastaa',
        senderAvatar: seedUsers[1].avatarUrl,
        type: 'voice',
        content: 'Sagalee ergame (0:14)',
        mediaUrl: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg',
        mediaDuration: 14,
        status: 'delivered',
        reactions: { '✨': ['user-chala'] },
        createdAt: new Date(Date.now() - 2 * 60000).toISOString(),
      },
    ];

    const groupTechMsgs: Message[] = [
      {
        id: 'msg-gt1',
        chatId: 'chat-tech-group',
        senderId: 'user-gadaa',
        senderName: 'Gadaa Tolasaa',
        senderAvatar: seedUsers[2].avatarUrl,
        type: 'text',
        content: 'Baga nagaan dhuftan miseensota haaraa! Welcome to the Oromia Tech Community! React + TypeScript + WebSocket architecture is amazing.',
        status: 'read',
        isPinned: true,
        reactions: { '👏': ['user-chala', 'user-hawani'] },
        createdAt: new Date(Date.now() - 120 * 60000).toISOString(),
      },
      {
        id: 'msg-gt2',
        chatId: 'chat-tech-group',
        senderId: 'user-chala',
        senderName: 'Caalaa Bantii',
        senderAvatar: seedUsers[0].avatarUrl,
        type: 'text',
        content: 'Eeyyee, OromoChat application ergaa saffisaa fi teeknooloojii ammayyaa irratti hundaaʼee hojjetamaa jira.',
        status: 'read',
        reactions: { '🚀': ['user-gadaa', 'user-hawani'] },
        createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
      },
      {
        id: 'msg-gt3',
        chatId: 'chat-tech-group',
        senderId: 'user-hawani',
        senderName: 'Hawaanii Dastaa',
        senderAvatar: seedUsers[1].avatarUrl,
        type: 'text',
        content: 'Namoonni Afaan Oromootin coding barachuu barbaaddan linkii kana ilaalaa: https://github.com/oromo-devs',
        status: 'delivered',
        reactions: { '❤️': ['user-chala', 'user-gadaa'] },
        createdAt: new Date(Date.now() - 8 * 60000).toISOString(),
      },
    ];

    const odaaChannelMsgs: Message[] = [
      {
        id: 'msg-oc1',
        chatId: 'chat-oda-channel',
        senderId: 'user-bilisummaa',
        senderName: 'Odaa News & Culture',
        senderAvatar: seedChats[2].avatarUrl,
        type: 'text',
        content: '📢 ODUU AMMEE: Applikeeshiniin ergaa Telegram-fakkaataa kan OromoChat jedhamu dhaloota haaraaf qophaaʼe. Afaan Oromoo fi Ingiliffaan tajaajila guutuu kenna.\n\n#OromoChat #TechInOromia #AfaanOromoo',
        status: 'delivered',
        views: 3420,
        reactions: { '🔥': ['user-chala', 'user-hawani', 'user-gadaa'], '👏': ['user-chala'] },
        createdAt: new Date(Date.now() - 45 * 60000).toISOString(),
      },
    ];

    const directGadaaMsgs: Message[] = [
      {
        id: 'msg-dg1',
        chatId: 'chat-gadaa',
        senderId: 'user-gadaa',
        senderName: 'Gadaa Tolasaa',
        senderAvatar: seedUsers[2].avatarUrl,
        type: 'text',
        content: 'Are we still having the database indexing review this afternoon?',
        status: 'read',
        reactions: { '👍': ['user-chala'] },
        createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
      },
    ];

    const finfinneeMsgs: Message[] = [
      {
        id: 'msg-ff1',
        chatId: 'chat-finfinnee-channel',
        senderId: 'user-hawani',
        senderName: 'Finfinnee Events',
        senderAvatar: seedChats[4].avatarUrl,
        type: 'text',
        content: '🎉 Meetup alert: Finfinnee Developers Meetup happening this Saturday at 2:00 PM. Don\'t miss out!',
        status: 'read',
        views: 1204,
        reactions: { '🎉': ['user-chala'] },
        createdAt: new Date(Date.now() - 12 * 3600000).toISOString(),
      },
    ];

    this.messages.set('chat-hawani', directHawaniMsgs);
    this.messages.set('chat-tech-group', groupTechMsgs);
    this.messages.set('chat-oda-channel', odaaChannelMsgs);
    this.messages.set('chat-gadaa', directGadaaMsgs);
    this.messages.set('chat-finfinnee-channel', finfinneeMsgs);

    // Update lastMessage on chats
    this.chats.get('chat-hawani')!.lastMessage = directHawaniMsgs[directHawaniMsgs.length - 1];
    this.chats.get('chat-tech-group')!.lastMessage = groupTechMsgs[groupTechMsgs.length - 1];
    this.chats.get('chat-oda-channel')!.lastMessage = odaaChannelMsgs[odaaChannelMsgs.length - 1];
    this.chats.get('chat-gadaa')!.lastMessage = directGadaaMsgs[directGadaaMsgs.length - 1];
    this.chats.get('chat-finfinnee-channel')!.lastMessage = finfinneeMsgs[finfinneeMsgs.length - 1];
  }

  // User Methods
  getUserById(id: string): UserWithPassword | undefined {
    return this.users.get(id);
  }

  getUserByPhoneOrUsername(identifier: string): UserWithPassword | undefined {
    const clean = identifier.trim().toLowerCase().replace('@', '');
    for (const user of this.users.values()) {
      if (
        user.phone.toLowerCase() === identifier.trim().toLowerCase() ||
        user.username.toLowerCase() === clean
      ) {
        return user;
      }
    }
    return undefined;
  }

  createUser(user: UserWithPassword): User {
    this.users.set(user.id, user);
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  updateUser(id: string, updates: Partial<User>): User | undefined {
    const existing = this.users.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.users.set(id, updated);
    const { passwordHash, ...safeUser } = updated;
    return safeUser;
  }

  searchUsers(query: string, currentUserId: string): User[] {
    const q = query.toLowerCase().trim();
    const results: User[] = [];
    for (const user of this.users.values()) {
      if (user.id === currentUserId) continue;
      if (
        user.displayName.toLowerCase().includes(q) ||
        user.username.toLowerCase().includes(q) ||
        user.phone.includes(q)
      ) {
        const { passwordHash, ...safeUser } = user;
        results.push(safeUser);
      }
    }
    return results;
  }

  // OTP Rate Limiting & Lifecycle Methods
  canRequestOtp(phone: string): { allowed: boolean; waitSeconds?: number; error?: string } {
    const entry = this.otps.get(phone);
    const now = Date.now();

    if (entry) {
      // 60-second cooldown between requests
      const elapsed = Math.floor((now - entry.lastSentAt) / 1000);
      if (elapsed < 60) {
        return {
          allowed: false,
          waitSeconds: 60 - elapsed,
          error: `Please wait ${60 - elapsed} seconds before requesting a new code.`,
        };
      }

      // Max 5 requests per hour limit
      if (now - entry.hourResetAt > 3600000) {
        entry.hourlyCount = 0;
        entry.hourResetAt = now;
      } else if (entry.hourlyCount >= 5) {
        return {
          allowed: false,
          error: 'Too many OTP requests for this phone number. Please wait an hour before trying again.',
        };
      }
    }

    return { allowed: true };
  }

  createOtp(phone: string): string {
    // Generate secure 6-digit random code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const now = Date.now();
    const existing = this.otps.get(phone);

    const hourlyCount = existing
      ? now - existing.hourResetAt > 3600000
        ? 1
        : existing.hourlyCount + 1
      : 1;

    const hourResetAt = existing && now - existing.hourResetAt <= 3600000
      ? existing.hourResetAt
      : now;

    this.otps.set(phone, {
      code,
      expiresAt: now + 5 * 60 * 1000, // strictly 5 minutes expiration
      attempts: 0,
      lastSentAt: now,
      hourlyCount,
      hourResetAt,
    });

    return code;
  }

  verifyOtp(phone: string, code: string): { success: boolean; error?: string } {
    const cleanCode = code.toString().trim();
    const now = Date.now();
    const entry = this.otps.get(phone);

    // Development sandbox test code check
    const isDev = process.env.NODE_ENV !== 'production' && process.env.ALLOW_DEV_TEST_OTP === 'true';
    const isSandboxNumber = phone === (process.env.DEV_SANDBOX_TEST_NUMBER || '+251900000000');
    const sandboxOtp = process.env.DEV_SANDBOX_OTP || '849201';

    if (isDev && isSandboxNumber && cleanCode === sandboxOtp) {
      return { success: true };
    }

    if (!entry) {
      return {
        success: false,
        error: 'No active verification code found for this number. Please request a new code.',
      };
    }

    // Check expiration
    if (now > entry.expiresAt) {
      this.otps.delete(phone);
      return {
        success: false,
        error: 'The verification code has expired (valid for 5 minutes). Please request a new code.',
      };
    }

    // Check maximum failed attempts (rate limit brute-force attempts to 3 max)
    if (entry.attempts >= 3) {
      this.otps.delete(phone);
      return {
        success: false,
        error: 'Too many incorrect attempts. This code has been invalidated for your security. Please request a new code.',
      };
    }

    if (entry.code !== cleanCode) {
      entry.attempts++;
      const remainingAttempts = 3 - entry.attempts;
      return {
        success: false,
        error: `Incorrect verification code. You have ${remainingAttempts} attempt(s) remaining.`,
      };
    }

    // Correct verification: consume and invalidate the code
    this.otps.delete(phone);
    return { success: true };
  }

  // Chat Methods
  getUserChats(userId: string): Chat[] {
    const list: Chat[] = [];
    for (const chat of this.chats.values()) {
      if (chat.type === 'channel' || chat.participantIds.includes(userId)) {
        list.push({ ...chat });
      }
    }
    // Sort pinned first, then by updatedAt desc
    return list.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }

  getChatById(id: string): Chat | undefined {
    return this.chats.get(id);
  }

  createChat(chat: Chat): Chat {
    this.chats.set(chat.id, chat);
    this.messages.set(chat.id, []);
    return chat;
  }

  updateChat(id: string, updates: Partial<Chat>): Chat | undefined {
    const existing = this.chats.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    this.chats.set(id, updated);
    return updated;
  }

  // Message Methods
  getMessages(chatId: string): Message[] {
    return this.messages.get(chatId) || [];
  }

  addMessage(msg: Message): Message {
    const list = this.messages.get(msg.chatId) || [];
    list.push(msg);
    this.messages.set(msg.chatId, list);

    // Update parent chat's last message and updatedAt
    const chat = this.chats.get(msg.chatId);
    if (chat) {
      chat.lastMessage = msg;
      chat.updatedAt = msg.createdAt;
      this.chats.set(msg.chatId, chat);
    }
    return msg;
  }

  updateMessage(chatId: string, messageId: string, updates: Partial<Message>): Message | undefined {
    const list = this.messages.get(chatId);
    if (!list) return undefined;
    const idx = list.findIndex((m) => m.id === messageId);
    if (idx === -1) return undefined;
    list[idx] = { ...list[idx], ...updates };
    return list[idx];
  }

  toggleReaction(chatId: string, messageId: string, emoji: string, userId: string): Message | undefined {
    const list = this.messages.get(chatId);
    if (!list) return undefined;
    const msg = list.find((m) => m.id === messageId);
    if (!msg) return undefined;

    if (!msg.reactions) msg.reactions = {};
    const existingUsers = msg.reactions[emoji] || [];

    if (existingUsers.includes(userId)) {
      msg.reactions[emoji] = existingUsers.filter((u) => u !== userId);
      if (msg.reactions[emoji].length === 0) {
        delete msg.reactions[emoji];
      }
    } else {
      msg.reactions[emoji] = [...existingUsers, userId];
    }
    return msg;
  }

  deleteMessage(chatId: string, messageId: string): boolean {
    const list = this.messages.get(chatId);
    if (!list) return false;
    const filtered = list.filter((m) => m.id !== messageId);
    this.messages.set(chatId, filtered);
    const chat = this.chats.get(chatId);
    if (chat && chat.lastMessage?.id === messageId) {
      chat.lastMessage = filtered.length > 0 ? filtered[filtered.length - 1] : undefined;
    }
    return true;
  }
}

export const db = new OromoChatDatabase();
