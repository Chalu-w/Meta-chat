import React, { useState, useRef, useEffect } from 'react';
import {
  Smile,
  Paperclip,
  Send,
  Mic,
  Image,
  FileText,
  X,
} from 'lucide-react';
import { Message } from '../types.js';
import { VoiceRecorder } from './VoiceRecorder.js';
import { useLanguage } from '../i18n/LanguageContext.js';

interface MessageInputProps {
  onSendMessage: (
    content: string,
    type?: 'text' | 'image' | 'voice' | 'file',
    mediaUrl?: string,
    mediaDuration?: number
  ) => void;
  onSendTyping: (isTyping: boolean) => void;
  replyToMessage: Message | null;
  onCancelReply: () => void;
  isChannel?: boolean;
}

const EMOJI_PALETTE = [
  '😊', '😂', '🔥', '❤️', '👍', '👏', '🚀', '✨', '🎉',
  '🙌', '💯', '🌿', '☕', '💡', '🌟', '💪', '🤝', '😍',
  '😎', '🤔', '🙏', '⚡', '🎈', '🏆', '🎯', '🦁', '🌍',
];

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onSendTyping,
  replyToMessage,
  onCancelReply,
  isChannel,
}) => {
  const { t } = useLanguage();
  const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [text]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    onSendTyping(true);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      onSendTyping(false);
    }, 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (!text.trim()) return;
    onSendMessage(text.trim(), 'text');
    setText('');
    onSendTyping(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleAttachImage = () => {
    setShowAttachMenu(false);
    // Simulated photo attachment with high-quality landscape / tech images
    const sampleImages = [
      'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80',
    ];
    const picked = sampleImages[Math.floor(Math.random() * sampleImages.length)];
    onSendMessage('📷 Suuraa ergame | Shared photo', 'image', picked);
  };

  const handleAttachFile = () => {
    setShowAttachMenu(false);
    onSendMessage('📄 OromoChat_System_Doc.pdf (1.4 MB)', 'file');
  };

  const handleVoiceSend = (duration: number) => {
    setIsRecordingVoice(false);
    onSendMessage(
      `🎤 ${t('voiceNote')} (${duration}s)`,
      'voice',
      'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg',
      duration
    );
  };

  if (isRecordingVoice) {
    return (
      <VoiceRecorder
        onCancel={() => setIsRecordingVoice(false)}
        onSendVoice={handleVoiceSend}
      />
    );
  }

  return (
    <div className="message-input-container">
      {/* Reply Banner */}
      {replyToMessage && (
        <div className="reply-preview-bar animate-fade-in">
          <div className="reply-preview-border" />
          <div className="reply-preview-body">
            <span className="reply-preview-author">
              {t('replyingTo')} {replyToMessage.senderName}
            </span>
            <span className="reply-preview-snippet">
              {replyToMessage.content || 'Media'}
            </span>
          </div>
          <button className="reply-cancel-btn" onClick={onCancelReply}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Main Input Row */}
      <div className="message-input-row">
        {/* Attachment Button & Popup */}
        <div className="relative-wrapper">
          <button
            className={`input-action-btn ${showAttachMenu ? 'active-btn' : ''}`}
            onClick={() => {
              setShowAttachMenu(!showAttachMenu);
              setShowEmojiPicker(false);
            }}
            title="Attach Media"
          >
            <Paperclip size={20} />
          </button>

          {showAttachMenu && (
            <div className="attach-menu-popup animate-fade-in">
              <button className="attach-menu-item" onClick={handleAttachImage}>
                <Image size={18} className="text-accent" />
                <span>{t('photoOrVideo')}</span>
              </button>
              <button className="attach-menu-item" onClick={handleAttachFile}>
                <FileText size={18} className="text-warning" />
                <span>{t('fileDocument')}</span>
              </button>
            </div>
          )}
        </div>

        {/* Text Input Box */}
        <div className="message-textarea-wrapper">
          <textarea
            ref={textareaRef}
            className="message-textarea"
            placeholder={isChannel ? t('broadcastMessage') : t('writeMessage')}
            rows={1}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
          />
        </div>

        {/* Emoji Button & Picker Popup */}
        <div className="relative-wrapper">
          <button
            className={`input-action-btn ${showEmojiPicker ? 'active-btn' : ''}`}
            onClick={() => {
              setShowEmojiPicker(!showEmojiPicker);
              setShowAttachMenu(false);
            }}
            title="Emojis"
          >
            <Smile size={20} />
          </button>

          {showEmojiPicker && (
            <div className="emoji-picker-modal animate-fade-in">
              <div className="emoji-grid">
                {EMOJI_PALETTE.map((emoji) => (
                  <button
                    key={emoji}
                    className="emoji-grid-btn"
                    onClick={() => {
                      setText((prev) => prev + emoji);
                      setShowEmojiPicker(false);
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Mic or Send Button */}
        {text.trim() ? (
          <button
            className="input-send-btn animate-fade-in"
            onClick={handleSend}
            title={t('send')}
          >
            <Send size={18} />
          </button>
        ) : (
          <button
            className="input-action-btn mic-btn"
            onClick={() => setIsRecordingVoice(true)}
            title={t('recordVoice')}
          >
            <Mic size={20} />
          </button>
        )}
      </div>
    </div>
  );
};
