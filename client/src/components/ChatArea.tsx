import React, { useState, useEffect, useRef } from 'react';
import {
  Phone,
  Video,
  Search,
  MoreVertical,
  Pin,
  ArrowLeft,
  X,
  Radio,
  Users,
  Info,
} from 'lucide-react';
import { Chat, Message } from '../types.js';
import { MessageItem } from './MessageItem.js';
import { MessageInput } from './MessageInput.js';
import { CallModal } from './CallModal.js';
import { useLanguage } from '../i18n/LanguageContext.js';
import { useAuth } from '../context/AuthContext.js';

interface ChatAreaProps {
  chat: Chat;
  messages: Message[];
  onSendMessage: (
    content: string,
    type?: 'text' | 'image' | 'voice' | 'file',
    mediaUrl?: string,
    mediaDuration?: number,
    replyToId?: string
  ) => void;
  onSendTyping: (isTyping: boolean) => void;
  onReactMessage: (messageId: string, emoji: string) => void;
  onPinMessage: (messageId: string, isPinned: boolean) => void;
  onDeleteMessage: (messageId: string) => void;
  onBackMobile: () => void;
  onToggleInfoDrawer: () => void;
  isTyping?: boolean;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  chat,
  messages,
  onSendMessage,
  onSendTyping,
  onReactMessage,
  onPinMessage,
  onDeleteMessage,
  onBackMobile,
  onToggleInfoDrawer,
  isTyping,
}) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [callType, setCallType] = useState<'audio' | 'video' | null>(null);
  const [searchInChat, setSearchInChat] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const pinnedMessage = messages.find((m) => m.isPinned);

  const filteredMessages = searchInChat.trim()
    ? messages.filter((m) =>
        m.content.toLowerCase().includes(searchInChat.toLowerCase().trim())
      )
    : messages;

  const handleSend = (
    content: string,
    type?: 'text' | 'image' | 'voice' | 'file',
    mediaUrl?: string,
    mediaDuration?: number
  ) => {
    onSendMessage(content, type, mediaUrl, mediaDuration, replyToMessage?.id);
    setReplyToMessage(null);
  };

  const getSubtitle = () => {
    if (isTyping) {
      return <span className="typing-live-indicator">{t('typing')}</span>;
    }
    if (chat.type === 'channel') {
      return `${chat.subscriberCount?.toLocaleString() || 1} ${t('subscribers')}`;
    }
    if (chat.type === 'group') {
      return `${chat.memberCount?.toLocaleString() || chat.participantIds.length} ${t('members')}`;
    }
    return t('online');
  };

  return (
    <div className="chat-area-container">
      {/* Top Header */}
      <div className="chat-header">
        <div className="chat-header-left">
          <button className="mobile-back-btn" onClick={onBackMobile} title="Back">
            <ArrowLeft size={22} />
          </button>

          <div className="chat-header-avatar-wrap" onClick={onToggleInfoDrawer}>
            <img src={chat.avatarUrl} alt={chat.title} className="chat-header-avatar" />
            {chat.type === 'direct' && <span className="header-online-dot" />}
          </div>

          <div className="chat-header-info" onClick={onToggleInfoDrawer}>
            <div className="chat-header-title-row">
              <span className="chat-header-title">{chat.title}</span>
              {chat.type === 'channel' && <Radio size={14} className="header-type-icon text-accent" />}
              {chat.type === 'group' && <Users size={14} className="header-type-icon text-warning" />}
            </div>
            <div className="chat-header-status">{getSubtitle()}</div>
          </div>
        </div>

        <div className="chat-header-actions">
          {chat.type === 'direct' && (
            <>
              <button
                className="header-action-btn"
                onClick={() => setCallType('audio')}
                title={t('calls')}
              >
                <Phone size={19} />
              </button>
              <button
                className="header-action-btn"
                onClick={() => setCallType('video')}
                title="Video Call"
              >
                <Video size={20} />
              </button>
            </>
          )}

          <button
            className={`header-action-btn ${isSearching ? 'active-btn' : ''}`}
            onClick={() => setIsSearching(!isSearching)}
            title="Search in Chat"
          >
            <Search size={19} />
          </button>

          <button
            className="header-action-btn"
            onClick={onToggleInfoDrawer}
            title="Chat Info"
          >
            <Info size={19} />
          </button>
        </div>
      </div>

      {/* In-Chat Search Bar */}
      {isSearching && (
        <div className="inchat-search-bar animate-fade-in">
          <Search size={16} className="text-muted" />
          <input
            type="text"
            className="inchat-search-input"
            placeholder={t('searchPlaceholder')}
            value={searchInChat}
            onChange={(e) => setSearchInChat(e.target.value)}
            autoFocus
          />
          <button
            className="inchat-search-close"
            onClick={() => {
              setIsSearching(false);
              setSearchInChat('');
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Pinned Message Banner */}
      {pinnedMessage && (
        <div className="pinned-message-banner animate-fade-in">
          <div className="pinned-indicator-bar" />
          <div className="pinned-banner-content">
            <span className="pinned-label">
              <Pin size={12} className="inline mr-1" /> {t('pinned')}
            </span>
            <span className="pinned-text">{pinnedMessage.content}</span>
          </div>
          <button
            className="pinned-unpin-btn"
            onClick={() => onPinMessage(pinnedMessage.id, false)}
            title={t('unpin')}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="messages-scroll-area">
        {filteredMessages.length === 0 ? (
          <div className="chat-messages-empty">
            <div className="empty-bubble">{t('startConversation')}</div>
          </div>
        ) : (
          filteredMessages.map((msg) => (
            <MessageItem
              key={msg.id}
              message={msg}
              isChannel={chat.type === 'channel'}
              isGroup={chat.type === 'group'}
              onReply={(m) => setReplyToMessage(m)}
              onReact={onReactMessage}
              onPin={onPinMessage}
              onDelete={onDeleteMessage}
              onOpenImage={(url) => setPreviewImage(url)}
            />
          ))
        )}

        {/* Live typing indicator row */}
        {isTyping && (
          <div className="typing-indicator-row animate-fade-in">
            <div className="typing-dots-bubble">
              <span className="dot dot-1" />
              <span className="dot dot-2" />
              <span className="dot dot-3" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Message Input */}
      <MessageInput
        onSendMessage={handleSend}
        onSendTyping={onSendTyping}
        replyToMessage={replyToMessage}
        onCancelReply={() => setReplyToMessage(null)}
        isChannel={chat.type === 'channel'}
      />

      {/* Call Modal */}
      {callType && (
        <CallModal
          chat={chat}
          isVideo={callType === 'video'}
          onClose={() => setCallType(null)}
        />
      )}

      {/* Fullscreen Image Preview */}
      {previewImage && (
        <div
          className="fullscreen-image-modal"
          onClick={() => setPreviewImage(null)}
        >
          <button className="preview-close-btn" onClick={() => setPreviewImage(null)}>
            <X size={24} />
          </button>
          <img
            src={previewImage}
            alt="Preview"
            className="fullscreen-preview-img animate-fade-in"
          />
        </div>
      )}
    </div>
  );
};
