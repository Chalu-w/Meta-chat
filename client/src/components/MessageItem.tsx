import React, { useState } from 'react';
import {
  Check,
  CheckCheck,
  Eye,
  Reply,
  Pin,
  Trash2,
  Smile,
  Copy,
  Forward,
} from 'lucide-react';
import { Message } from '../types.js';
import { VoicePlayer } from './VoicePlayer.js';
import { useAuth } from '../context/AuthContext.js';
import { useLanguage } from '../i18n/LanguageContext.js';

interface MessageItemProps {
  message: Message;
  isChannel?: boolean;
  isGroup?: boolean;
  onReply: (msg: Message) => void;
  onReact: (messageId: string, emoji: string) => void;
  onPin: (messageId: string, isPinned: boolean) => void;
  onDelete: (messageId: string) => void;
  onOpenImage?: (url: string) => void;
}

const QUICK_EMOJIS = ['👍', '❤️', '🔥', '👏', '🚀', '😂', '🎉'];

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isChannel,
  isGroup,
  onReply,
  onReact,
  onPin,
  onDelete,
  onOpenImage,
}) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const isOutbound = message.senderId === user?.id;

  const formatMsgTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleCopy = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content);
    }
  };

  return (
    <div
      className={`message-row ${isOutbound ? 'outbound-row' : 'inbound-row'} ${
        message.isPinned ? 'pinned-message-row' : ''
      }`}
    >
      {/* Show sender avatar in group chats for inbound messages */}
      {!isOutbound && isGroup && !isChannel && (
        <img
          src={message.senderAvatar}
          alt={message.senderName}
          className="message-sender-avatar"
        />
      )}

      <div className={`message-bubble ${isOutbound ? 'bubble-out' : 'bubble-in'}`}>
        {/* Hover Quick Actions Toolbar */}
        <div className="message-hover-actions">
          <div className="emoji-picker-container">
            <button
              className="hover-action-btn"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              title={t('reactions')}
            >
              <Smile size={16} />
            </button>

            {showEmojiPicker && (
              <div className="quick-emoji-popup animate-fade-in">
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    className="quick-emoji-item"
                    onClick={() => {
                      onReact(message.id, emoji);
                      setShowEmojiPicker(false);
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            className="hover-action-btn"
            onClick={() => onReply(message)}
            title={t('reply')}
          >
            <Reply size={16} />
          </button>

          <button
            className="hover-action-btn"
            onClick={handleCopy}
            title="Copy"
          >
            <Copy size={15} />
          </button>

          <button
            className={`hover-action-btn ${message.isPinned ? 'active-action' : ''}`}
            onClick={() => onPin(message.id, !message.isPinned)}
            title={message.isPinned ? t('unpin') : t('pin')}
          >
            <Pin size={15} />
          </button>

          {(isOutbound || isChannel) && (
            <button
              className="hover-action-btn delete-action-btn"
              onClick={() => onDelete(message.id)}
              title={t('delete')}
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>

        {/* Sender Name in Groups */}
        {!isOutbound && isGroup && !isChannel && (
          <div className="message-sender-title">{message.senderName}</div>
        )}

        {/* Reply Quote Banner */}
        {message.replyToMessage && (
          <div className="message-reply-quote">
            <div className="reply-quote-bar" />
            <div className="reply-quote-content">
              <span className="reply-quote-name">
                {message.replyToMessage.senderName}
              </span>
              <span className="reply-quote-text">
                {message.replyToMessage.content}
              </span>
            </div>
          </div>
        )}

        {/* Message Content by Type */}
        {message.type === 'voice' && (
          <VoicePlayer
            audioUrl={message.mediaUrl}
            duration={message.mediaDuration || 8}
          />
        )}

        {message.type === 'image' && message.mediaUrl && (
          <div
            className="message-image-wrapper"
            onClick={() => onOpenImage && onOpenImage(message.mediaUrl!)}
          >
            <img
              src={message.mediaUrl}
              alt="Photo"
              className="message-photo-img"
            />
          </div>
        )}

        {message.content && (
          <div className="message-text-content">{message.content}</div>
        )}

        {/* Reactions Counter Bar */}
        {message.reactions && Object.keys(message.reactions).length > 0 && (
          <div className="message-reactions-list">
            {Object.entries(message.reactions).map(([emoji, userIds]) => {
              if (userIds.length === 0) return null;
              const hasReacted = user ? userIds.includes(user.id) : false;
              return (
                <button
                  key={emoji}
                  className={`message-reaction-chip ${hasReacted ? 'reaction-active' : ''}`}
                  onClick={() => onReact(message.id, emoji)}
                >
                  <span className="reaction-emoji">{emoji}</span>
                  <span className="reaction-count">{userIds.length}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Bubble Meta (Time, Channel Views, Read Status) */}
        <div className="message-meta-footer">
          {isChannel && message.views !== undefined && (
            <span className="message-views-count">
              <Eye size={12} />
              {message.views > 999
                ? `${(message.views / 1000).toFixed(1)}k`
                : message.views}
            </span>
          )}

          <span className="message-time">{formatMsgTime(message.createdAt)}</span>

          {isOutbound && (
            <span className="message-status-tick">
              {message.status === 'read' ? (
                <CheckCheck size={14} className="tick-read" />
              ) : (
                <Check size={14} className="tick-sent" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
