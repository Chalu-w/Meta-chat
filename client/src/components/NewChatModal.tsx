import React, { useState, useEffect } from 'react';
import {
  X,
  User as UserIcon,
  Users,
  Radio,
  Search,
  Check,
  AlertCircle,
} from 'lucide-react';
import { User } from '../types.js';
import { api } from '../services/api.js';
import { useLanguage } from '../i18n/LanguageContext.js';
import { useAuth } from '../context/AuthContext.js';
import { FirestoreChatService } from '../services/firestoreChat.js';

interface NewChatModalProps {
  initialType?: 'direct' | 'group' | 'channel';
  isOpen: boolean;
  onClose: () => void;
  onChatCreated: (chat: any) => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({
  initialType = 'direct',
  isOpen,
  onClose,
  onChatCreated,
}) => {
  const { t } = useLanguage();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'direct' | 'group' | 'channel'>(initialType);
  const [title, setTitle] = useState('');
  const [username, setUsername] = useState('');
  const [description, setDescription] = useState('');
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    setActiveTab(initialType);
  }, [initialType]);

  useEffect(() => {
    if (!isOpen) return;

    let isCurrent = true;
    const fetchUsers = async () => {
      try {
        const [serverRes, fbRes] = await Promise.allSettled([
          api.searchUsers(searchUserQuery),
          user ? FirestoreChatService.searchUsers(searchUserQuery, user.id) : Promise.resolve([]),
        ]);

        const serverList = serverRes.status === 'fulfilled' ? serverRes.value.users : [];
        const fbList = fbRes.status === 'fulfilled' ? fbRes.value : [];

        // Deduplicate users by ID
        const map = new Map<string, User>();
        [...serverList, ...fbList].forEach((u) => {
          if (u.id !== user?.id && !map.has(u.id)) {
            map.set(u.id, u);
          }
        });

        if (isCurrent) {
          setAvailableUsers(Array.from(map.values()));
        }
      } catch (err) {
        console.error('Failed to search users:', err);
      }
    };

    fetchUsers();
    return () => {
      isCurrent = false;
    };
  }, [isOpen, searchUserQuery, user]);

  if (!isOpen) return null;

  const toggleSelectUser = (id: string) => {
    if (selectedUserIds.includes(id)) {
      setSelectedUserIds(selectedUserIds.filter((u) => u !== id));
    } else {
      setSelectedUserIds([...selectedUserIds, id]);
    }
  };

  const handleStartDirect = async (targetUser: User) => {
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      if (user) {
        // 1. Create or retrieve conversation in Firebase Firestore
        const fbChat = await FirestoreChatService.createOrGetDirectConversation(user, targetUser);
        onChatCreated(fbChat);

        // 2. Also register in backend DB in background for fallback
        api.createChat({ type: 'direct', participantIds: [targetUser.id] }).catch(() => {});
        onClose();
      } else {
        const res = await api.createChat({
          type: 'direct',
          participantIds: [targetUser.id],
        });
        onChatCreated(res.chat);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to start conversation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateGroupOrChannel = async () => {
    if (!title.trim()) {
      setErrorMsg('Please enter a conversation title.');
      return;
    }
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      if (user) {
        const newChat = await FirestoreChatService.createGroupOrChannel(
          user,
          activeTab as 'group' | 'channel',
          title.trim(),
          activeTab === 'group' ? selectedUserIds : [],
          description.trim() || undefined
        );
        onChatCreated(newChat);

        // Also notify server
        api.createChat({
          type: activeTab,
          title: title.trim(),
          username: username.trim() || undefined,
          description: description.trim() || undefined,
          participantIds: activeTab === 'group' ? selectedUserIds : [],
        }).catch(() => {});

        onClose();
      } else {
        const res = await api.createChat({
          type: activeTab,
          title: title.trim(),
          username: username.trim() || undefined,
          description: description.trim() || undefined,
          participantIds: activeTab === 'group' ? selectedUserIds : [],
        });
        onChatCreated(res.chat);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create conversation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-tabs">
            <button
              className={`modal-tab-btn ${activeTab === 'direct' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('direct');
                setErrorMsg('');
              }}
            >
              <UserIcon size={16} />
              <span>{t('newChat')}</span>
            </button>

            <button
              className={`modal-tab-btn ${activeTab === 'group' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('group');
                setErrorMsg('');
              }}
            >
              <Users size={16} />
              <span>{t('newGroup')}</span>
            </button>

            <button
              className={`modal-tab-btn ${activeTab === 'channel' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('channel');
                setErrorMsg('');
              }}
            >
              <Radio size={16} />
              <span>{t('newChannel')}</span>
            </button>
          </div>

          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {errorMsg && (
          <div className="auth-error-banner animate-fade-in mx-4 my-2">
            <AlertCircle size={16} className="text-danger flex-shrink-0" />
            <span className="text-xs">{errorMsg}</span>
          </div>
        )}

        {/* Tab 1: Direct Chat - Select user */}
        {activeTab === 'direct' && (
          <div className="modal-body">
            <div className="modal-search-wrapper">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                className="modal-search-input"
                placeholder="Search by name, phone or username..."
                value={searchUserQuery}
                onChange={(e) => setSearchUserQuery(e.target.value)}
                autoFocus
              />
            </div>

            <div className="user-selection-list">
              {availableUsers.length === 0 ? (
                <div className="empty-state text-center py-6 text-muted text-sm">
                  {searchUserQuery ? 'No users matching query.' : 'Loading active users...'}
                </div>
              ) : (
                availableUsers.map((u) => (
                  <div
                    key={u.id}
                    className="user-select-item interactive-item"
                    onClick={() => handleStartDirect(u)}
                  >
                    <img src={u.avatarUrl} alt={u.displayName} className="user-select-avatar" />
                    <div className="user-select-info">
                      <div className="user-select-name">{u.displayName}</div>
                      <div className="user-select-meta">
                        {u.phone ? u.phone : (u.username ? `@${u.username}` : `UID: ${u.id.slice(0, 8)}...`)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 2 & 3: Group or Channel */}
        {(activeTab === 'group' || activeTab === 'channel') && (
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">
                {activeTab === 'group' ? 'Group Name' : 'Channel Name'}
              </label>
              <input
                type="text"
                className="form-input"
                placeholder={activeTab === 'group' ? 'e.g. Afaan Oromoo Tech Hub' : 'e.g. Oromia Tech News'}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">Username (Optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. oromo_tech"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace('@', ''))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description (Optional)</label>
              <textarea
                className="form-textarea"
                rows={2}
                placeholder="Short description of this group or broadcast channel..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {activeTab === 'group' && (
              <div className="form-group">
                <label className="form-label">Select Members</label>
                <div className="user-selection-list compact">
                  {availableUsers.map((u) => {
                    const isSelected = selectedUserIds.includes(u.id);
                    return (
                      <div
                        key={u.id}
                        className={`user-select-item interactive-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => toggleSelectUser(u.id)}
                      >
                        <img src={u.avatarUrl} alt={u.displayName} className="user-select-avatar" />
                        <div className="user-select-info">
                          <div className="user-select-name">{u.displayName}</div>
                          <div className="user-select-meta">{u.phone || `@${u.username}`}</div>
                        </div>
                        <div className={`select-checkbox ${isSelected ? 'checked' : ''}`}>
                          {isSelected && <Check size={14} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              className="btn-primary w-full mt-4"
              onClick={handleCreateGroupOrChannel}
              disabled={isSubmitting || !title.trim()}
            >
              {isSubmitting
                ? t('sending')
                : activeTab === 'group'
                ? 'Create Group'
                : 'Create Channel'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
