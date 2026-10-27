import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase.js';
import { Chat, Message, User, MessageType } from '../types.js';

/**
 * Format Firestore Timestamp or ISO string into a standard ISO 8601 string.
 */
function toIsoDate(val: any): string {
  if (!val) return new Date().toISOString();
  if (val instanceof Timestamp) return val.toDate().toISOString();
  if (typeof val?.toDate === 'function') return val.toDate().toISOString();
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return new Date(val).toISOString();
  return new Date().toISOString();
}

export class FirestoreChatService {
  /**
   * Syncs the authenticated user profile with Firestore users/{uid} collection.
   */
  static async syncUserProfile(user: Partial<User> & { id: string }): Promise<void> {
    try {
      const userRef = doc(db, 'users', user.id);
      const docSnap = await getDoc(userRef);

      const profilePayload = {
        id: user.id,
        uid: user.id,
        phone: user.phone || '',
        displayName: user.displayName || `User ${user.phone ? user.phone.slice(-4) : user.id.slice(0, 5)}`,
        username: user.username || `user_${user.id.slice(0, 6)}`,
        bio: user.bio || 'Using Meta Chat',
        avatarUrl: user.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`,
        photoURL: user.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`,
        status: 'online',
        lastSeen: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ...(docSnap.exists() ? {} : { createdAt: serverTimestamp() }),
      };

      await setDoc(userRef, profilePayload, { merge: true });
    } catch (err: any) {
      console.warn('[Firestore] syncUserProfile warning:', err.message);
    }
  }

  /**
   * Listen to real-time conversation updates where current user is in participantUids.
   */
  static listenToConversations(
    currentUid: string,
    onUpdate: (chats: Chat[]) => void,
    onError?: (err: any) => void
  ): Unsubscribe {
    const collRef = collection(db, 'conversations');
    const q = query(collRef, where('participantUids', 'array-contains', currentUid));

    return onSnapshot(
      q,
      (snapshot) => {
        const chats: Chat[] = snapshot.docs.map((d) => {
          const data = d.data();
          const details = data.participantDetails || {};
          
          // Determine title and avatar for 1-on-1 direct conversations
          let computedTitle = data.title;
          let computedAvatar = data.avatarUrl;

          if (data.type === 'direct') {
            const otherUid = (data.participantUids || []).find((u: string) => u !== currentUid);
            if (otherUid && details[otherUid]) {
              computedTitle = details[otherUid].displayName || computedTitle;
              computedAvatar = details[otherUid].avatarUrl || computedAvatar;
            }
          }

          let lastMessage: Message | undefined = undefined;
          if (data.lastMessage) {
            lastMessage = {
              id: data.lastMessage.id || `lm-${d.id}`,
              chatId: d.id,
              senderId: data.lastMessage.senderId || '',
              senderName: data.lastMessage.senderName || '',
              senderAvatar: data.lastMessage.senderAvatar || computedAvatar || '',
              type: data.lastMessage.type || 'text',
              content: data.lastMessage.content || '',
              status: data.lastMessage.status || 'read',
              reactions: {},
              createdAt: toIsoDate(data.lastMessage.createdAt),
            };
          }

          return {
            id: d.id,
            type: data.type || 'direct',
            title: computedTitle || 'Chat',
            avatarUrl: computedAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${d.id}`,
            username: data.username,
            description: data.description,
            participantIds: data.participantUids || [],
            adminIds: data.adminIds || [],
            creatorId: data.creatorId || '',
            unreadCount: typeof data.unreadCount === 'object' ? (data.unreadCount?.[currentUid] || 0) : (data.unreadCount || 0),
            isPinned: !!data.isPinned,
            isMuted: !!data.isMuted,
            lastMessage,
            memberCount: data.memberCount,
            subscriberCount: data.subscriberCount,
            updatedAt: toIsoDate(data.updatedAt),
          };
        });

        // Sort desc by updatedAt
        chats.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        onUpdate(chats);
      },
      (err) => {
        console.warn('[Firestore] listenToConversations warning:', err.message);
        if (onError) onError(err);
      }
    );
  }

  /**
   * Listen to real-time messages within a conversation.
   */
  static listenToMessages(
    conversationId: string,
    onUpdate: (messages: Message[]) => void,
    onError?: (err: any) => void
  ): Unsubscribe {
    const msgsRef = collection(db, 'conversations', conversationId, 'messages');
    const q = query(msgsRef, orderBy('createdAt', 'asc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const messages: Message[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            chatId: conversationId,
            senderId: data.senderId,
            senderName: data.senderName,
            senderAvatar: data.senderAvatar,
            senderUsername: data.senderUsername,
            type: data.type || 'text',
            content: data.content || '',
            mediaUrl: data.mediaUrl,
            mediaDuration: data.mediaDuration,
            fileName: data.fileName,
            fileSize: data.fileSize,
            replyToId: data.replyToId,
            replyToMessage: data.replyToMessage,
            status: data.status || 'sent',
            reactions: data.reactions || {},
            isPinned: !!data.isPinned,
            views: data.views,
            createdAt: toIsoDate(data.createdAt),
          };
        });
        onUpdate(messages);
      },
      (err) => {
        console.warn('[Firestore] listenToMessages warning:', err.message);
        if (onError) onError(err);
      }
    );
  }

  /**
   * Send a real-time message to a conversation.
   */
  static async sendMessage(
    conversationId: string,
    sender: User,
    content: string,
    type: MessageType = 'text',
    mediaUrl?: string,
    mediaDuration?: number,
    replyToMessage?: any
  ): Promise<string> {
    const msgsRef = collection(db, 'conversations', conversationId, 'messages');
    const convRef = doc(db, 'conversations', conversationId);

    const messagePayload = {
      chatId: conversationId,
      senderId: sender.id,
      senderName: sender.displayName,
      senderAvatar: sender.avatarUrl,
      senderUsername: sender.username || '',
      type,
      content,
      mediaUrl: mediaUrl || null,
      mediaDuration: mediaDuration || null,
      replyToId: replyToMessage?.id || null,
      replyToMessage: replyToMessage
        ? {
            id: replyToMessage.id,
            senderName: replyToMessage.senderName,
            content: replyToMessage.content,
          }
        : null,
      status: 'sent',
      reactions: {},
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(msgsRef, messagePayload);

    // Update conversation metadata
    const snippet =
      type === 'voice'
        ? '🎤 Voice Note'
        : type === 'image'
        ? '📷 Photo'
        : type === 'file'
        ? '📄 Document'
        : content;

    await updateDoc(convRef, {
      lastMessage: {
        id: docRef.id,
        content: snippet,
        senderId: sender.id,
        senderName: sender.displayName,
        senderAvatar: sender.avatarUrl,
        type,
        status: 'sent',
        createdAt: new Date().toISOString(),
      },
      updatedAt: serverTimestamp(),
    });

    return docRef.id;
  }

  /**
   * Create or locate a direct 1-on-1 conversation with another user.
   */
  static async createOrGetDirectConversation(
    currentUser: User,
    targetUser: { id: string; displayName: string; phone?: string; avatarUrl?: string }
  ): Promise<Chat> {
    // Generate deterministic conversation ID to prevent duplicate 1-on-1 threads
    const deterministicId = `direct_${[currentUser.id, targetUser.id].sort().join('_')}`;
    const convRef = doc(db, 'conversations', deterministicId);
    const existingSnap = await getDoc(convRef);

    if (existingSnap.exists()) {
      const data = existingSnap.data();
      return {
        id: deterministicId,
        type: 'direct',
        title: targetUser.displayName,
        avatarUrl: targetUser.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${targetUser.id}`,
        participantIds: data.participantUids || [currentUser.id, targetUser.id],
        adminIds: [currentUser.id, targetUser.id],
        creatorId: data.creatorId || currentUser.id,
        unreadCount: 0,
        isPinned: false,
        isMuted: false,
        updatedAt: toIsoDate(data.updatedAt),
      };
    }

    // Create new conversation
    const newConvData = {
      id: deterministicId,
      type: 'direct',
      title: targetUser.displayName,
      avatarUrl: targetUser.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${targetUser.id}`,
      participantUids: [currentUser.id, targetUser.id],
      participantDetails: {
        [currentUser.id]: {
          displayName: currentUser.displayName,
          phoneNumber: currentUser.phone || '',
          avatarUrl: currentUser.avatarUrl,
        },
        [targetUser.id]: {
          displayName: targetUser.displayName,
          phoneNumber: targetUser.phone || '',
          avatarUrl: targetUser.avatarUrl || '',
        },
      },
      adminIds: [currentUser.id, targetUser.id],
      creatorId: currentUser.id,
      unreadCount: 0,
      isPinned: false,
      isMuted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(convRef, newConvData);

    return {
      id: deterministicId,
      type: 'direct',
      title: targetUser.displayName,
      avatarUrl: targetUser.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${targetUser.id}`,
      participantIds: [currentUser.id, targetUser.id],
      adminIds: [currentUser.id, targetUser.id],
      creatorId: currentUser.id,
      unreadCount: 0,
      isPinned: false,
      isMuted: false,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Create a group or broadcast channel in Firestore.
   */
  static async createGroupOrChannel(
    currentUser: User,
    type: 'group' | 'channel',
    title: string,
    participantUids: string[],
    description?: string,
    avatarUrl?: string
  ): Promise<Chat> {
    const allParticipants = Array.from(new Set([currentUser.id, ...participantUids]));
    const convsRef = collection(db, 'conversations');

    const convData = {
      type,
      title,
      description: description || '',
      avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(title)}`,
      participantUids: allParticipants,
      adminIds: [currentUser.id],
      creatorId: currentUser.id,
      unreadCount: 0,
      isPinned: false,
      isMuted: false,
      memberCount: allParticipants.length,
      subscriberCount: type === 'channel' ? 1 : undefined,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(convsRef, convData);

    return {
      id: docRef.id,
      type,
      title,
      description: description || '',
      avatarUrl: convData.avatarUrl,
      participantIds: allParticipants,
      adminIds: [currentUser.id],
      creatorId: currentUser.id,
      unreadCount: 0,
      isPinned: false,
      isMuted: false,
      memberCount: allParticipants.length,
      subscriberCount: type === 'channel' ? 1 : undefined,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Search users in Firestore.
   */
  static async searchUsers(queryText: string, currentUid: string): Promise<User[]> {
    try {
      const usersRef = collection(db, 'users');
      const snap = await getDocs(usersRef);
      const clean = queryText.toLowerCase().trim();

      const users: User[] = [];
      snap.forEach((d) => {
        if (d.id === currentUid) return;
        const data = d.data();
        const dName = (data.displayName || '').toLowerCase();
        const uName = (data.username || '').toLowerCase();
        const phone = (data.phone || '').toLowerCase();

        if (!clean || dName.includes(clean) || uName.includes(clean) || phone.includes(clean)) {
          users.push({
            id: d.id,
            uid: d.id,
            phone: data.phone || '',
            displayName: data.displayName || `User ${d.id.slice(0, 5)}`,
            username: data.username || `user_${d.id.slice(0, 6)}`,
            bio: data.bio || '',
            avatarUrl: data.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${d.id}`,
            status: data.status || 'online',
            lastSeen: toIsoDate(data.lastSeen),
            language: 'en',
            theme: 'telegram-dark',
            notificationsEnabled: true,
            privacyLastSeen: 'everybody',
            createdAt: toIsoDate(data.createdAt),
          });
        }
      });
      return users;
    } catch (err: any) {
      console.warn('[Firestore] searchUsers fallback:', err.message);
      return [];
    }
  }

  /**
   * Toggle emoji reaction on a message in Firestore.
   */
  static async toggleReaction(
    conversationId: string,
    messageId: string,
    userId: string,
    emoji: string
  ): Promise<void> {
    const msgRef = doc(db, 'conversations', conversationId, 'messages', messageId);
    const snap = await getDoc(msgRef);
    if (!snap.exists()) return;

    const data = snap.data();
    const reactions: Record<string, string[]> = data.reactions || {};
    const existing = reactions[emoji] || [];

    if (existing.includes(userId)) {
      reactions[emoji] = existing.filter((u) => u !== userId);
      if (reactions[emoji].length === 0) {
        delete reactions[emoji];
      }
    } else {
      reactions[emoji] = [...existing, userId];
    }

    await updateDoc(msgRef, { reactions });
  }

  /**
   * Pin or unpin a message.
   */
  static async pinMessage(
    conversationId: string,
    messageId: string,
    isPinned: boolean
  ): Promise<void> {
    const msgRef = doc(db, 'conversations', conversationId, 'messages', messageId);
    await updateDoc(msgRef, { isPinned });
  }

  /**
   * Delete a message.
   */
  static async deleteMessage(conversationId: string, messageId: string): Promise<void> {
    const msgRef = doc(db, 'conversations', conversationId, 'messages', messageId);
    await deleteDoc(msgRef);
  }
}
