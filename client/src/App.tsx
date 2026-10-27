import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Chat, Message } from './types.js';
import { api } from './services/api.js';
import { socket } from './services/socket.js';
import { FirestoreChatService } from './services/firestoreChat.js';
import { useAuth, AuthProvider } from './context/AuthContext.js';
import { useLanguage, LanguageProvider } from './i18n/LanguageContext.js';
import { useTheme, ThemeProvider } from './context/ThemeContext.js';
import { ChatList } from './components/ChatList.js';
import { ChatArea } from './components/ChatArea.js';
import { SidebarDrawer } from './components/SidebarDrawer.js';
import { ChatInfoDrawer } from './components/ChatInfoDrawer.js';
import { NewChatModal } from './components/NewChatModal.js';
import { SettingsModal } from './components/SettingsModal.js';
import { AuthModal } from './components/AuthModal.js';
import { InstallModal } from './components/InstallModal.js';
import { FolderFilter } from './components/FolderTabs.js';
import { MetaLogo } from './components/MetaLogo.js';
import './App.css';

const MetaChatMain: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { t } = useLanguage();

  // Navigation & Modal states
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [newChatType, setNewChatType] = useState<'direct' | 'group' | 'channel'>('direct');
  const [isInfoDrawerOpen, setIsInfoDrawerOpen] = useState(false);
  const [isInstallOpen, setIsInstallOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FolderFilter>('all');
  const [typingChatId, setTypingChatId] = useState<string | null>(null);
  const typingTimerRef = useRef<any>(null);

  // Listen for PWA beforeinstallprompt
  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.log('SW registration note:', err);
      });
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  // Fetch chats from server backend
  const fetchChats = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await api.getChats(activeFilter, searchQuery);
      setChats((prev) => {
        // Merge with existing chats (avoid wiping active Firestore chats)
        const map = new Map<string, Chat>();
        res.chats.forEach((c) => map.set(c.id, c));
        prev.forEach((c) => {
          if (!map.has(c.id)) map.set(c.id, c);
        });
        const merged = Array.from(map.values());
        merged.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        return merged;
      });

      // Auto-select first chat on desktop if none active
      if (!activeChat && res.chats.length > 0 && window.innerWidth > 768) {
        selectChat(res.chats[0]);
      }
    } catch (err) {
      console.error('Failed to fetch chats:', err);
    }
  }, [isAuthenticated, activeFilter, searchQuery]);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  // Firestore real-time conversations listener
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    const unsubscribeFirestoreChats = FirestoreChatService.listenToConversations(
      user.id,
      (firestoreChats) => {
        setChats((prev) => {
          const map = new Map<string, Chat>();
          // Put Firestore chats first
          firestoreChats.forEach((c) => map.set(c.id, c));
          // Keep existing backend chats
          prev.forEach((c) => {
            if (!map.has(c.id)) map.set(c.id, c);
          });
          const merged = Array.from(map.values());
          merged.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
          return merged;
        });

        // Update activeChat reference if it was updated in Firestore
        if (activeChat) {
          const updatedActive = firestoreChats.find((c) => c.id === activeChat.id);
          if (updatedActive) {
            setActiveChat(updatedActive);
          }
        }
      }
    );

    return () => {
      unsubscribeFirestoreChats();
    };
  }, [isAuthenticated, user?.id]);

  // Load messages when active chat changes
  const selectChat = async (chat: Chat) => {
    setActiveChat(chat);
    try {
      const res = await api.getMessages(chat.id);
      setMessages(res.messages);

      // Reset unread count locally
      setChats((prev) =>
        prev.map((c) => (c.id === chat.id ? { ...c, unreadCount: 0 } : c))
      );
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  };

  // Firestore real-time messages listener for active chat
  useEffect(() => {
    if (!isAuthenticated || !activeChat) return;

    const unsubscribeMessages = FirestoreChatService.listenToMessages(
      activeChat.id,
      (firestoreMessages) => {
        if (firestoreMessages.length > 0) {
          setMessages(firestoreMessages);
        }
      }
    );

    return () => {
      unsubscribeMessages();
    };
  }, [isAuthenticated, activeChat?.id]);

  // Setup WebSocket real-time message listeners (for server/hybrid broadcasts)
  useEffect(() => {
    if (!isAuthenticated) return;

    // Connect socket
    socket.connect();

    const unsubNewMessage = socket.on('MESSAGE_NEW', (payload: { message: Message }) => {
      const newMsg = payload.message;

      // Update active messages if this chat is open
      if (activeChat && activeChat.id === newMsg.chatId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      }

      // Update chat in list
      setChats((prev) => {
        const found = prev.find((c) => c.id === newMsg.chatId);
        if (!found) {
          fetchChats();
          return prev;
        }
        return prev.map((c) => {
          if (c.id === newMsg.chatId) {
            return {
              ...c,
              lastMessage: newMsg,
              updatedAt: newMsg.createdAt,
              unreadCount: activeChat?.id === c.id ? 0 : c.unreadCount + 1,
            };
          }
          return c;
        });
      });
    });

    const unsubReact = socket.on(
      'MESSAGE_REACT',
      (payload: { messageId: string; reactions: Record<string, string[]> }) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === payload.messageId ? { ...m, reactions: payload.reactions } : m
          )
        );
      }
    );

    const unsubPin = socket.on(
      'PIN_MESSAGE',
      (payload: { messageId: string; isPinned: boolean }) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === payload.messageId ? { ...m, isPinned: payload.isPinned } : m
          )
        );
      }
    );

    const unsubDelete = socket.on(
      'DELETE_MESSAGE',
      (payload: { messageId: string }) => {
        setMessages((prev) => prev.filter((m) => m.id !== payload.messageId));
      }
    );

    const unsubTyping = socket.on(
      'TYPING',
      (payload: { chatId: string; userId: string; isTyping: boolean }) => {
        if (payload.userId !== user?.id) {
          if (payload.isTyping) {
            setTypingChatId(payload.chatId);
            if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
            typingTimerRef.current = setTimeout(() => {
              setTypingChatId(null);
            }, 3000);
          } else {
            setTypingChatId(null);
          }
        }
      }
    );

    return () => {
      unsubNewMessage();
      unsubReact();
      unsubPin();
      unsubDelete();
      unsubTyping();
    };
  }, [isAuthenticated, activeChat, user, fetchChats]);

  // Send message
  const handleSendMessage = async (
    content: string,
    type: 'text' | 'image' | 'voice' | 'file' = 'text',
    mediaUrl?: string,
    mediaDuration?: number,
    replyToId?: string
  ) => {
    if (!activeChat || !user) return;

    // Optimistic message
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      chatId: activeChat.id,
      senderId: user.id,
      senderName: user.displayName,
      senderAvatar: user.avatarUrl,
      type,
      content,
      mediaUrl,
      mediaDuration,
      replyToId,
      status: 'sending',
      reactions: {},
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    // 1. Dispatch real-time message via Firebase Firestore
    try {
      await FirestoreChatService.sendMessage(
        activeChat.id,
        user,
        content,
        type,
        mediaUrl,
        mediaDuration,
        replyToId ? messages.find((m) => m.id === replyToId) : undefined
      );
    } catch (fbErr) {
      console.warn('[Firestore] Message dispatch notice:', fbErr);
    }

    // 2. Also send to server backend for hybrid fallback
    try {
      const res = await api.sendMessage(activeChat.id, {
        content,
        type,
        mediaUrl,
        mediaDuration,
        replyToId,
      });

      // Replace optimistic message with server message
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? res.message : m))
      );

      // Update last message in chat list
      setChats((prev) =>
        prev.map((c) =>
          c.id === activeChat.id
            ? { ...c, lastMessage: res.message, updatedAt: res.message.createdAt }
            : c
        )
      );
    } catch {
      // If server is not responding, mark as sent from Firestore
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: 'sent' } : m))
      );
    }
  };

  const handleSendTyping = (isTyping: boolean) => {
    if (activeChat) {
      socket.sendTyping(activeChat.id, isTyping);
    }
  };

  const handleReactMessage = async (messageId: string, emoji: string) => {
    if (!activeChat || !user) return;
    try {
      await FirestoreChatService.toggleReaction(activeChat.id, messageId, user.id, emoji);
      await api.toggleReaction(activeChat.id, messageId, emoji);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePinMessage = async (messageId: string, isPinned: boolean) => {
    if (!activeChat) return;
    try {
      await FirestoreChatService.pinMessage(activeChat.id, messageId, isPinned);
      await api.pinMessage(activeChat.id, messageId, isPinned);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!activeChat) return;
    try {
      await FirestoreChatService.deleteMessage(activeChat.id, messageId);
      await api.deleteMessage(activeChat.id, messageId);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch (err) {
      console.error(err);
    }
  };

  const handleChatCreated = (newChat: Chat) => {
    setChats((prev) => [newChat, ...prev]);
    selectChat(newChat);
  };

  const handleToggleMute = () => {
    if (!activeChat) return;
    const updated = { ...activeChat, isMuted: !activeChat.isMuted };
    setActiveChat(updated);
    setChats((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  // Loading Screen
  if (isLoading) {
    return (
      <div className="app-loading-screen flex flex-col items-center justify-center min-h-screen bg-[var(--bg-primary)]">
        <MetaLogo size={56} className="animate-pulse" />
        <div className="mt-4 text-lg font-bold text-[var(--text-primary)]">
          Meta Chat
        </div>
        <div className="text-xs text-muted mt-1">
          Synchronizing Firebase session & conversations...
        </div>
        <div className="app-loading-spinner mt-4" />
      </div>
    );
  }

  // Not authenticated: Show Phone Auth / Login Modal
  if (!isAuthenticated) {
    return (
      <AuthModal
        isOpen={true}
        onClose={() => {}}
        deferredPrompt={deferredPrompt}
      />
    );
  }

  return (
    <div className={`app-root ${activeChat ? 'mobile-chat-open' : ''}`}>
      {/* Left Navigation Sidebar: Chat List */}
      <ChatList
        chats={chats}
        activeChatId={activeChat?.id || null}
        onSelectChat={selectChat}
        onOpenDrawer={() => setIsDrawerOpen(true)}
        onOpenNewChat={() => {
          setNewChatType('direct');
          setIsNewChatOpen(true);
        }}
        onOpenInstall={() => setIsInstallOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        typingChatId={typingChatId}
      />

      {/* Main Conversation Stream */}
      {activeChat ? (
        <ChatArea
          chat={activeChat}
          messages={messages}
          onSendMessage={handleSendMessage}
          onSendTyping={handleSendTyping}
          onReactMessage={handleReactMessage}
          onPinMessage={handlePinMessage}
          onDeleteMessage={handleDeleteMessage}
          onBackMobile={() => setActiveChat(null)}
          onToggleInfoDrawer={() => setIsInfoDrawerOpen(!isInfoDrawerOpen)}
          isTyping={typingChatId === activeChat.id}
        />
      ) : (
        <div className="chat-area-container flex items-center justify-center">
          <div className="empty-bubble">{t('startConversation')}</div>
        </div>
      )}

      {/* Right Sidebar: Chat / User / Channel Details */}
      {isInfoDrawerOpen && activeChat && (
        <ChatInfoDrawer
          chat={activeChat}
          onClose={() => setIsInfoDrawerOpen(false)}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* Sliding Hamburger Drawer */}
      <SidebarDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenNewChat={(type) => {
          setNewChatType(type);
          setIsNewChatOpen(true);
        }}
        onOpenInstall={() => setIsInstallOpen(true)}
        onSelectSavedMessages={() => {
          // Direct chat with oneself
          if (user) {
            const selfChat = chats.find(
              (c) => c.type === 'direct' && c.participantIds.length === 1
            );
            if (selfChat) selectChat(selfChat);
          }
        }}
      />

      {/* Modals */}
      <NewChatModal
        initialType={newChatType}
        isOpen={isNewChatOpen}
        onClose={() => setIsNewChatOpen(false)}
        onChatCreated={handleChatCreated}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <InstallModal
        isOpen={isInstallOpen}
        onClose={() => setIsInstallOpen(false)}
        deferredPrompt={deferredPrompt}
      />
    </div>
  );
};

export default function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <AuthProvider>
          <MetaChatMain />
        </AuthProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}
