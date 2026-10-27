import React, { useState } from 'react';
import {
  X,
  User,
  Users,
  Radio,
  Bookmark,
  Settings,
  Moon,
  Sun,
  Globe,
  LogOut,
  Download,
  Sparkles,
  ShieldCheck,
  Phone,
  Copy,
  Check,
  Edit3,
  Camera,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useLanguage } from '../i18n/LanguageContext.js';
import { useTheme } from '../context/ThemeContext.js';
import { MetaLogo } from './MetaLogo.js';

interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  onOpenNewChat: (type: 'direct' | 'group' | 'channel') => void;
  onSelectSavedMessages: () => void;
  onOpenInstall?: () => void;
}

export const SidebarDrawer: React.FC<SidebarDrawerProps> = ({
  isOpen,
  onClose,
  onOpenSettings,
  onOpenNewChat,
  onSelectSavedMessages,
  onOpenInstall,
}) => {
  const { user, logout, switchDemoUser } = useAuth();
  const { language, toggleLanguage, t, languageNames } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [copiedUid, setCopiedUid] = useState(false);

  if (!isOpen) return null;

  const handleCopyUid = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (user?.id) {
      navigator.clipboard.writeText(user.id);
      setCopiedUid(true);
      setTimeout(() => setCopiedUid(false), 2000);
    }
  };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div
        className="drawer-content animate-slide-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header with User Profile */}
        <div className="drawer-header">
          <div className="drawer-user-info">
            <div
              className="drawer-avatar-wrapper relative cursor-pointer group"
              onClick={() => {
                onClose();
                onOpenSettings();
              }}
              title="Click to edit profile and photo"
            >
              <img
                src={user?.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=metachat'}
                alt={user?.displayName || 'User'}
                className="drawer-avatar transition-transform duration-200 group-hover:scale-105"
              />
              <span className="online-indicator" />
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-white">
                <Camera size={18} />
              </div>
            </div>
            <div className="drawer-user-meta">
              <div className="drawer-user-name flex items-center gap-1.5">
                <span>{user?.displayName || 'User'}</span>
                <span title="Verified Account"><ShieldCheck size={16} className="text-accent flex-shrink-0" /></span>
              </div>
              
              {user?.phone ? (
                <div className="drawer-user-phone flex items-center gap-1">
                  <Phone size={12} className="text-accent flex-shrink-0" />
                  <span>{user.phone}</span>
                </div>
              ) : (
                user?.username && <div className="drawer-user-handle">@{user.username}</div>
              )}

              <div className="flex items-center gap-2 mt-1">
                <button
                  type="button"
                  className="drawer-edit-profile-btn flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline bg-[var(--accent-light)] px-2 py-0.5 rounded-full"
                  onClick={() => {
                    onClose();
                    onOpenSettings();
                  }}
                  title="Edit Profile and Change Photo"
                >
                  <Edit3 size={11} />
                  <span>Edit Profile</span>
                </button>

                {user?.id && (
                  <button
                    type="button"
                    className="drawer-user-uid-pill interactive-item"
                    onClick={handleCopyUid}
                    title="Click to copy Firebase Authentication UID"
                  >
                    <span className="uid-mono">UID: {user.id.slice(0, 8)}...</span>
                    {copiedUid ? (
                      <span className="flex items-center gap-0.5 text-xs text-success">
                        <Check size={10} />
                      </span>
                    ) : (
                      <Copy size={10} className="text-muted" />
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          <button className="drawer-close-btn" onClick={onClose} title={t('cancel')}>
            <X size={20} />
          </button>
        </div>

        {/* Quick Language & Theme Toggles in Drawer */}
        <div className="drawer-quick-bar">
          <button
            className="quick-toggle-pill"
            onClick={toggleLanguage}
            title="Switch Language: English / Afaan Oromoo / አማርኛ"
          >
            <Globe size={16} />
            <span>{languageNames[language]?.native || language.toUpperCase()}</span>
          </button>

          <button
            className="quick-toggle-pill"
            onClick={toggleTheme}
            title="Toggle Dark / Night / Light Mode"
          >
            {theme === 'telegram-light' ? <Sun size={16} /> : <Moon size={16} />}
            <span>{theme === 'telegram-light' ? t('lightMode') : t('nightMode')}</span>
          </button>
        </div>

        {/* Navigation Items */}
        <div className="drawer-menu">
          {/* Prominent Install App Item */}
          {onOpenInstall && (
            <button
              className="drawer-item interactive-item drawer-install-item"
              onClick={() => {
                onClose();
                onOpenInstall();
              }}
            >
              <Download size={20} className="text-accent" />
              <div className="flex flex-col text-left">
                <span className="font-bold text-accent">Install Meta Chat</span>
                <span className="text-xs text-muted">Android, iOS & Desktop</span>
              </div>
            </button>
          )}

          <button
            className="drawer-item interactive-item"
            onClick={() => {
              onClose();
              onOpenNewChat('direct');
            }}
          >
            <User size={20} className="drawer-icon" />
            <span>{t('newChat')}</span>
          </button>

          <button
            className="drawer-item interactive-item"
            onClick={() => {
              onClose();
              onOpenNewChat('group');
            }}
          >
            <Users size={20} className="drawer-icon" />
            <span>{t('newGroup')}</span>
          </button>

          <button
            className="drawer-item interactive-item"
            onClick={() => {
              onClose();
              onOpenNewChat('channel');
            }}
          >
            <Radio size={20} className="drawer-icon" />
            <span>{t('newChannel')}</span>
          </button>

          <button
            className="drawer-item interactive-item"
            onClick={() => {
              onClose();
              onSelectSavedMessages();
            }}
          >
            <Bookmark size={20} className="drawer-icon" />
            <span>{t('savedMessages')}</span>
          </button>

          <div className="drawer-divider" />

          <button
            className="drawer-item interactive-item"
            onClick={() => {
              onClose();
              onOpenSettings();
            }}
          >
            <Settings size={20} className="drawer-icon" />
            <span>{t('settings')}</span>
          </button>

          <div className="drawer-divider" />

          {/* Quick Demo Switcher Section */}
          <div className="drawer-section-title">
            <Sparkles size={14} />
            <span>Demo Switch (Test Multi-User):</span>
          </div>

          <div className="drawer-demo-list">
            <button
              className={`drawer-demo-btn ${user?.username === 'chala_b' ? 'active' : ''}`}
              onClick={() => switchDemoUser('chala_b')}
            >
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                alt="Caalaa"
              />
              <span>Caalaa (🇪🇹 Ethiopia)</span>
            </button>

            <button
              className={`drawer-demo-btn ${user?.username === 'hawani_d' ? 'active' : ''}`}
              onClick={() => switchDemoUser('hawani_d')}
            >
              <img
                src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80"
                alt="Hawaanii"
              />
              <span>Hawaanii (🇦🇪 UAE)</span>
            </button>

            <button
              className={`drawer-demo-btn ${user?.username === 'gadaa_t' ? 'active' : ''}`}
              onClick={() => switchDemoUser('gadaa_t')}
            >
              <img
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"
                alt="Gadaa"
              />
              <span>Gadaa (🇨🇦 Canada)</span>
            </button>

            <button
              className={`drawer-demo-btn ${user?.username === 'bilisummaa_k' ? 'active' : ''}`}
              onClick={() => switchDemoUser('bilisummaa_k')}
            >
              <img
                src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&auto=format&fit=crop&q=80"
                alt="Bilisummaa"
              />
              <span>Bilisummaa (🇸🇦 KSA)</span>
            </button>
          </div>

          <div className="drawer-divider" />

          {/* Logout button */}
          <button
            className="drawer-item interactive-item text-danger"
            onClick={() => {
              onClose();
              logout();
            }}
          >
            <LogOut size={20} className="drawer-icon" />
            <span>{t('logOut')}</span>
          </button>
        </div>

        {/* Footer info */}
        <div className="drawer-footer flex items-center gap-2.5">
          <MetaLogo size={28} />
          <div className="flex flex-col">
            <div className="drawer-footer-title">Meta Chat v1.3.0</div>
            <div className="drawer-footer-desc">
              Telegram-inspired • React + TypeScript • Firebase Phone Auth + Firestore
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
