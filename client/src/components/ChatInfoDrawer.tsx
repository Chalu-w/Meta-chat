import React, { useState } from 'react';
import {
  X,
  Bell,
  BellOff,
  Image,
  FileText,
  Link2,
  Mic,
  Users,
  Radio,
  Share2,
  Shield,
} from 'lucide-react';
import { Chat } from '../types.js';
import { useLanguage } from '../i18n/LanguageContext.js';

interface ChatInfoDrawerProps {
  chat: Chat;
  onClose: () => void;
  onToggleMute: () => void;
}

export const ChatInfoDrawer: React.FC<ChatInfoDrawerProps> = ({
  chat,
  onClose,
  onToggleMute,
}) => {
  const { t } = useLanguage();
  const [activeMediaTab, setActiveMediaTab] = useState<'media' | 'files' | 'links' | 'voice'>('media');

  return (
    <div className="chat-info-sidebar animate-slide-right">
      {/* Top Header */}
      <div className="info-header">
        <span className="info-header-title">
          {chat.type === 'channel'
            ? t('broadcastChannel')
            : chat.type === 'group'
            ? t('publicGroup')
            : t('privateChat')}
        </span>
        <button className="info-close-btn" onClick={onClose}>
          <X size={20} />
        </button>
      </div>

      <div className="info-scroll-body">
        {/* Large Profile Hero */}
        <div className="info-hero-section">
          <img
            src={chat.avatarUrl}
            alt={chat.title}
            className="info-large-avatar"
          />
          <h2 className="info-title">{chat.title}</h2>
          <div className="info-subtitle">
            {chat.type === 'channel' && (
              <span>
                {chat.subscriberCount?.toLocaleString()} {t('subscribers')}
              </span>
            )}
            {chat.type === 'group' && (
              <span>
                {chat.memberCount?.toLocaleString() || chat.participantIds.length} {t('members')}
              </span>
            )}
            {chat.type === 'direct' && <span>{t('online')}</span>}
          </div>
        </div>

        {/* Info Meta Cards */}
        <div className="info-meta-card">
          {chat.description && (
            <div className="info-meta-item">
              <span className="meta-label">{t('bio')}</span>
              <span className="meta-value">{chat.description}</span>
            </div>
          )}

          {chat.username && (
            <div className="info-meta-item">
              <span className="meta-label">{t('username')}</span>
              <span className="meta-value text-accent">@{chat.username}</span>
            </div>
          )}

          {/* Notifications Toggle */}
          <div
            className="info-action-row interactive-item"
            onClick={onToggleMute}
          >
            <div className="info-action-left">
              {chat.isMuted ? (
                <BellOff size={20} className="text-warning" />
              ) : (
                <Bell size={20} className="text-accent" />
              )}
              <div className="info-action-text">
                <span className="info-action-name">{t('notifications')}</span>
                <span className="info-action-status">
                  {chat.isMuted ? t('notificationMuted') : t('notificationActive')}
                </span>
              </div>
            </div>

            <div className={`switch-toggle ${!chat.isMuted ? 'switch-on' : ''}`}>
              <div className="switch-thumb" />
            </div>
          </div>
        </div>

        {/* Shared Media Tabs */}
        <div className="info-media-tabs">
          <button
            className={`media-tab-btn ${activeMediaTab === 'media' ? 'active' : ''}`}
            onClick={() => setActiveMediaTab('media')}
          >
            <Image size={16} />
            <span>{t('media')}</span>
          </button>

          <button
            className={`media-tab-btn ${activeMediaTab === 'files' ? 'active' : ''}`}
            onClick={() => setActiveMediaTab('files')}
          >
            <FileText size={16} />
            <span>{t('files')}</span>
          </button>

          <button
            className={`media-tab-btn ${activeMediaTab === 'links' ? 'active' : ''}`}
            onClick={() => setActiveMediaTab('links')}
          >
            <Link2 size={16} />
            <span>{t('links')}</span>
          </button>

          <button
            className={`media-tab-btn ${activeMediaTab === 'voice' ? 'active' : ''}`}
            onClick={() => setActiveMediaTab('voice')}
          >
            <Mic size={16} />
            <span>{t('voiceNotes')}</span>
          </button>
        </div>

        {/* Media Tab Contents */}
        <div className="info-media-content">
          {activeMediaTab === 'media' && (
            <div className="media-grid">
              <img
                src="https://images.unsplash.com/photo-1518770660439-4636190af475?w=300&auto=format&fit=crop&q=80"
                alt="Media 1"
                className="media-grid-item"
              />
              <img
                src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=300&auto=format&fit=crop&q=80"
                alt="Media 2"
                className="media-grid-item"
              />
              <img
                src="https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=300&auto=format&fit=crop&q=80"
                alt="Media 3"
                className="media-grid-item"
              />
            </div>
          )}

          {activeMediaTab === 'files' && (
            <div className="files-list">
              <div className="file-item">
                <FileText size={22} className="file-icon" />
                <div className="file-info">
                  <span className="file-name">OromoChat_Roadmap.pdf</span>
                  <span className="file-size">2.4 MB • Oct 26, 2026</span>
                </div>
              </div>
            </div>
          )}

          {activeMediaTab === 'links' && (
            <div className="links-list">
              <div className="link-item">
                <Link2 size={20} className="text-accent" />
                <a
                  href="https://github.com/oromo-devs"
                  target="_blank"
                  rel="noreferrer"
                  className="link-url"
                >
                  https://github.com/oromo-devs
                </a>
              </div>
            </div>
          )}

          {activeMediaTab === 'voice' && (
            <div className="voice-list">
              <div className="voice-item">
                <Mic size={20} className="text-accent" />
                <span className="voice-label">Sagalee ergame (0:14)</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
