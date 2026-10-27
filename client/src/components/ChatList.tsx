import React, { useState } from 'react';
import {
  Menu,
  Search,
  X,
  Pin,
  Check,
  CheckCheck,
  Users,
  Radio,
  Plus,
  VolumeX,
  Download,
} from 'lucide-react';
import { Chat } from '../types.js';
import { FolderTabs, FolderFilter } from './FolderTabs.js';
import { useLanguage } from '../i18n/LanguageContext.js';
import { useAuth } from '../context/AuthContext.js';

interface ChatListProps {
  chats: Chat[];
  activeChatId: string | null;
  onSelectChat: (chat: Chat) => void;
  onOpenDrawer: () => void;
  onOpenNewChat: () => void;
  onOpenInstall?: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeFilter: FolderFilter;
  onFilterChange: (f: FolderFilter) => void;
  typingChatId?: string | null;
}

export const ChatList: React.FC<ChatListProps> = ({
  chats,
  activeChatId,
  onSelectChat,
  onOpenDrawer,
  onOpenNewChat,
  onOpenInstall,
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  typingChatId,
}) => {
  const { t } = useLanguage();
  const { user } = useAuth();

  // Counts for folders
  const counts = {
    all: chats.reduce((acc, c) => acc + (c.unreadCount || 0), 0),
    direct: chats.filter((c) => c.type === 'direct').reduce((acc, c) => acc + (c.unreadCount || 0), 0),
    group: chats.filter((c) => c.type === 'group').reduce((acc, c) => acc + (c.unreadCount || 0), 0),
    channel: chats.filter((c) => c.type === 'channel').reduce((acc, c) => acc + (c.unreadCount || 0), 0),
  };

  const formatChatTime = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="chatlist-container">
      {/* Search & Top Action Bar */}
      <div className="chatlist-topbar">
        <button
          className="chatlist-menu-btn"
          onClick={onOpenDrawer}
          title="Menu"
        >
          <Menu size={22} />
        </button>

        <div className="chatlist-search-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="chatlist-search-input"
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchQuery && (
            <button
              className="search-clear-btn"
              onClick={() => onSearchChange('')}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {onOpenInstall && (
          <button
            className="chatlist-install-btn"
            onClick={onOpenInstall}
            title="Install Meta Chat App on Mobile / Desktop"
          >
            <Download size={18} />
          </button>
        )}
      </div>

      {/* Telegram Folder Tabs */}
      <FolderTabs
        activeTab={activeFilter}
        onSelectTab={onFilterChange}
        counts={counts}
      />

      {/* Chat Items List */}
      <div className="chatlist-scroll-area">
        {chats.length === 0 ? (
          <div className="chatlist-empty-state">
            <div className="chatlist-empty-icon">💬</div>
            <div className="chatlist-empty-title">{t('noChatsFound')}</div>
            <div className="chatlist-empty-subtitle">{t('startConversation')}</div>
          </div>
        ) : (
          chats.map((chat) => {
            const isActive = activeChatId === chat.id;
            const isTyping = typingChatId === chat.id;
            const isOutbound = chat.lastMessage?.senderId === user?.id;

            return (
              <div
                key={chat.id}
                className={`chat-item-row interactive-item ${isActive ? 'active-chat-row' : ''}`}
                onClick={() => onSelectChat(chat)}
              >
                {/* Avatar with Type Icon & Online Dot */}
                <div className="chat-avatar-container">
                  <img
                    src={chat.avatarUrl}
                    alt={chat.title}
                    className="chat-avatar-img"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  {chat.type === 'channel' && (
                    <div className="chat-badge-icon channel-badge" title={t('channels')}>
                      <Radio size={11} />
                    </div>
                  )}
                  {chat.type === 'group' && (
                    <div className="chat-badge-icon group-badge" title={t('groups')}>
                      <Users size={11} />
                    </div>
                  )}
                  {chat.type === 'direct' && (
                    <span className="direct-online-indicator" />
                  )}
                </div>

                {/* Content Details */}
                <div className="chat-item-content">
                  <div className="chat-item-topline">
                    <span className="chat-item-title">{chat.title}</span>
                    <span className="chat-item-time">
                      {formatChatTime(chat.lastMessage?.createdAt || chat.updatedAt)}
                    </span>
                  </div>

                  <div className="chat-item-subline">
                    {/* Status / Snippet */}
                    <div className="chat-item-message-snippet">
                      {isTyping ? (
                        <span className="typing-text animate-pulse">
                          {t('typing')}
                        </span>
                      ) : (
                        <>
                          {isOutbound && chat.lastMessage && (
                            <span className="chat-status-icon">
                              {chat.lastMessage.status === 'read' ? (
                                <CheckCheck size={15} className="text-accent" />
                              ) : (
                                <Check size={15} />
                              )}
                            </span>
                          )}
                          <span className="snippet-text">
                            {chat.lastMessage?.type === 'voice'
                              ? `🎤 ${t('voiceNote')}`
                              : chat.lastMessage?.type === 'image'
                              ? `📷 ${t('photoOrVideo')}`
                              : chat.lastMessage?.content || chat.description || ''}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Pin & Badges */}
                    <div className="chat-item-meta-badges">
                      {chat.isMuted && <VolumeX size={14} className="muted-icon" />}
                      {chat.isPinned && <Pin size={14} className="pinned-icon" />}
                      {chat.unreadCount > 0 && (
                        <span className="unread-badge">{chat.unreadCount}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Action Button (New Chat/Group/Channel) */}
      <button
        className="chatlist-fab-btn animate-fade-in"
        onClick={onOpenNewChat}
        title={t('newChat')}
      >
        <Plus size={24} />
      </button>
    </div>
  );
};
