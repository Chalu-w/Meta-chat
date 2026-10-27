import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  User,
  Globe,
  Palette,
  Bell,
  Shield,
  Server,
  Check,
  AlertCircle,
  ExternalLink,
  Camera,
  Upload,
  Trash2,
  RefreshCw,
  Image as ImageIcon,
  Sparkles,
  Phone,
  Copy,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useLanguage } from '../i18n/LanguageContext.js';
import { useTheme } from '../context/ThemeContext.js';
import { LanguageCode, ThemeMode } from '../types.js';
import { StorageService, validateProfileImage, getDefaultAvatar } from '../services/storage.service.js';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'profile' | 'language' | 'theme' | 'privacy' | 'external';
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'profile',
}) => {
  const { user, updateCurrentUser } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { theme, setTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<'profile' | 'language' | 'theme' | 'privacy' | 'external'>(initialTab);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [username, setUsername] = useState(user?.username || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedUid, setCopiedUid] = useState(false);

  // Profile Photo state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [photoError, setPhotoError] = useState('');
  const [photoSuccess, setPhotoSuccess] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Sync state when user prop changes
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setBio(user.bio || '');
      setUsername(user.username || '');
    }
  }, [user]);

  // Clean up preview object URL on unmount or file change
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  if (!isOpen) return null;

  // Handle file selection from gallery or camera
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError('');
    setPhotoSuccess('');
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type and size (JPEG, PNG, WebP <= 5 MB)
    const validation = validateProfileImage(file);
    if (!validation.valid) {
      setPhotoError(validation.error || 'Invalid image file.');
      if (e.target) e.target.value = '';
      return;
    }

    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  // Cancel preview and keep current photo
  const handleCancelPreview = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setPhotoError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  // Upload previewed photo to Firebase Storage and update Firestore
  const handleSavePhoto = async () => {
    if (!selectedFile || !user) return;
    setIsUploadingPhoto(true);
    setPhotoError('');
    setUploadProgress(10);

    try {
      // 1. Upload to Firebase Storage under profile_photos/{uid}/
      const downloadUrl = await StorageService.uploadProfilePhoto(
        user.id,
        selectedFile,
        (progress) => setUploadProgress(progress)
      );

      // 2. Update Firebase Auth & Firestore user document
      await updateCurrentUser({
        avatarUrl: downloadUrl,
      });

      setPhotoSuccess('Profile photo updated successfully!');
      handleCancelPreview();
      setTimeout(() => setPhotoSuccess(''), 3500);
    } catch (err: any) {
      console.error('[Settings] Photo upload error:', err);
      setPhotoError(err.message || 'Failed to upload photo. Please check your network and try again.');
    } finally {
      setIsUploadingPhoto(false);
      setUploadProgress(0);
    }
  };

  // Remove photo and reset to default avatar
  const handleRemovePhoto = async () => {
    if (!user) return;
    setPhotoError('');
    setPhotoSuccess('');
    setIsUploadingPhoto(true);

    try {
      // Remove from Firebase Storage if stored there
      if (user.avatarUrl) {
        await StorageService.removeProfilePhoto(user.avatarUrl);
      }

      // Reset to generated default avatar
      const defaultUrl = getDefaultAvatar(user.id);
      await updateCurrentUser({
        avatarUrl: defaultUrl,
      });

      setPhotoSuccess('Profile photo removed. Default avatar restored.');
      setTimeout(() => setPhotoSuccess(''), 3000);
    } catch (err: any) {
      setPhotoError(err.message || 'Failed to remove photo.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Save text profile fields
  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await updateCurrentUser({
        displayName: displayName.trim(),
        bio: bio.trim(),
        username: username.replace('@', '').trim(),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const currentDisplayAvatar = previewUrl || user?.avatarUrl || getDefaultAvatar(user?.id || 'user');
  const isCustomPhoto = user?.avatarUrl && !user.avatarUrl.includes('dicebear.com');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card settings-card animate-fade-in" onClick={(e) => e.stopPropagation()}>
        {/* Settings Header */}
        <div className="modal-header">
          <h2 className="modal-title">{t('settings')}</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close Settings">
            <X size={20} />
          </button>
        </div>

        <div className="settings-layout">
          {/* Settings Sidebar Tabs */}
          <div className="settings-nav">
            <button
              className={`settings-nav-btn ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              <User size={18} />
              <span>{t('profile')}</span>
            </button>

            <button
              className={`settings-nav-btn ${activeTab === 'language' ? 'active' : ''}`}
              onClick={() => setActiveTab('language')}
            >
              <Globe size={18} />
              <span>{t('language')}</span>
            </button>

            <button
              className={`settings-nav-btn ${activeTab === 'theme' ? 'active' : ''}`}
              onClick={() => setActiveTab('theme')}
            >
              <Palette size={18} />
              <span>{t('theme')}</span>
            </button>

            <button
              className={`settings-nav-btn ${activeTab === 'privacy' ? 'active' : ''}`}
              onClick={() => setActiveTab('privacy')}
            >
              <Shield size={18} />
              <span>{t('privacyAndSecurity')}</span>
            </button>

            <button
              className={`settings-nav-btn ${activeTab === 'external' ? 'active' : ''}`}
              onClick={() => setActiveTab('external')}
            >
              <Server size={18} />
              <span>{t('externalIntegrations')}</span>
            </button>
          </div>

          {/* Settings Content Body */}
          <div className="settings-content">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="settings-pane animate-fade-in">
                {/* Modern Telegram-Inspired Profile Photo Manager */}
                <div className="profile-photo-manager-section mb-5 p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-input)]">
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    {/* Interactive Avatar with Camera Badge */}
                    <div
                      className="profile-avatar-interactive-wrap relative cursor-pointer group"
                      onClick={() => fileInputRef.current?.click()}
                      title="Click to choose a new profile photo"
                    >
                      <img
                        src={currentDisplayAvatar}
                        alt={user?.displayName || 'Profile Avatar'}
                        className="profile-manager-avatar w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-2 border-[var(--accent)] shadow-md transition-transform duration-200 group-hover:scale-105"
                      />
                      <div className="profile-avatar-overlay absolute inset-0 rounded-full bg-black/45 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-white">
                        <Camera size={22} />
                        <span className="text-[10px] font-semibold mt-0.5">Change</span>
                      </div>
                      <div className="profile-avatar-badge absolute bottom-0 right-0 p-1.5 rounded-full bg-[var(--accent)] text-white shadow-md border-2 border-[var(--bg-card)]">
                        <Camera size={14} />
                      </div>
                    </div>

                    {/* Meta info & Action Buttons */}
                    <div className="flex-1 text-center sm:text-left">
                      <div className="flex items-center justify-center sm:justify-start gap-1.5">
                        <h3 className="font-bold text-lg text-[var(--text-main)]">
                          {user?.displayName || 'User Profile'}
                        </h3>
                        <span title="Verified Account">
                          <Shield size={16} className="text-accent" />
                        </span>
                      </div>
                      <p className="text-xs text-muted mt-0.5">
                        {user?.phone ? user.phone : (user?.username ? `@${user.username}` : 'No phone linked')}
                      </p>
                      <p className="text-[11px] text-muted mt-1">
                        Accepts JPEG, PNG, WebP up to 5 MB
                      </p>

                      {/* Photo Action Buttons */}
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
                        <button
                          type="button"
                          className="btn-photo-action flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--accent)] text-white hover:opacity-90 transition-opacity"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploadingPhoto}
                        >
                          <Upload size={14} />
                          <span>Upload Photo</span>
                        </button>

                        <button
                          type="button"
                          className="btn-photo-action flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-main)] hover:bg-[var(--bg-hover)] transition-colors"
                          onClick={() => cameraInputRef.current?.click()}
                          disabled={isUploadingPhoto}
                          title="Take photo using camera (on mobile devices)"
                        >
                          <Camera size={14} className="text-accent" />
                          <span>Take Photo</span>
                        </button>

                        {isCustomPhoto && (
                          <button
                            type="button"
                            className="btn-photo-action flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-danger border border-danger/30 hover:bg-danger/10 transition-colors"
                            onClick={handleRemovePhoto}
                            disabled={isUploadingPhoto}
                            title="Remove photo and restore default avatar"
                          >
                            <Trash2 size={14} />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Hidden inputs for gallery and camera */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                    aria-label="Upload profile photo from computer or gallery"
                  />
                  <input
                    type="file"
                    ref={cameraInputRef}
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileChange}
                    className="hidden"
                    aria-label="Take profile photo with camera"
                  />

                  {/* Live Photo Preview & Confirmation Banner */}
                  {previewUrl && (
                    <div className="photo-preview-confirm-box mt-4 p-3 rounded-lg border border-[var(--accent)] bg-[var(--bg-card)] animate-fade-in">
                      <div className="flex items-center justify-between text-xs font-bold text-accent mb-2">
                        <span>New Profile Photo Preview</span>
                        {selectedFile && (
                          <span className="text-muted font-normal text-[11px]">
                            {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {selectedFile.type.split('/')[1]?.toUpperCase()}
                          </span>
                        )}
                      </div>

                      {/* Upload Progress Bar */}
                      {isUploadingPhoto && (
                        <div className="upload-progress-wrapper my-2">
                          <div className="flex justify-between text-[11px] text-muted mb-1">
                            <span>Uploading to Firebase Storage...</span>
                            <span>{uploadProgress}%</span>
                          </div>
                          <div className="w-full bg-[var(--bg-input)] rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-[var(--accent)] h-1.5 rounded-full transition-all duration-200"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-end gap-2 mt-2">
                        <button
                          type="button"
                          className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border-color)] text-[var(--text-main)] hover:bg-[var(--bg-hover)]"
                          onClick={handleCancelPreview}
                          disabled={isUploadingPhoto}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[var(--accent)] text-white hover:opacity-90 flex items-center gap-1.5"
                          onClick={handleSavePhoto}
                          disabled={isUploadingPhoto}
                        >
                          {isUploadingPhoto ? (
                            <>
                              <RefreshCw size={13} className="animate-spin" />
                              <span>Uploading...</span>
                            </>
                          ) : (
                            <>
                              <Check size={14} />
                              <span>Save Photo</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Photo Error Banner */}
                  {photoError && (
                    <div className="photo-error-alert mt-3 p-2.5 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs flex items-center gap-2 animate-fade-in">
                      <AlertCircle size={16} className="flex-shrink-0" />
                      <span>{photoError}</span>
                    </div>
                  )}

                  {/* Photo Success Toast */}
                  {photoSuccess && (
                    <div className="photo-success-alert mt-3 p-2.5 rounded-lg bg-success/10 border border-success/30 text-success text-xs flex items-center gap-2 animate-fade-in">
                      <Check size={16} className="flex-shrink-0" />
                      <span>{photoSuccess}</span>
                    </div>
                  )}
                </div>

                {/* Firebase Authentication Identity Card */}
                <div className="firebase-profile-badge-card mb-4 p-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)]">
                  <div className="flex items-center justify-between text-xs text-muted mb-1">
                    <span className="font-semibold uppercase tracking-wider text-[10px] text-accent">
                      Firebase Authentication UID
                    </span>
                    <button
                      type="button"
                      className="flex items-center gap-1 text-xs text-accent hover:underline"
                      onClick={() => {
                        if (user?.id) {
                          navigator.clipboard.writeText(user.id);
                          setCopiedUid(true);
                          setTimeout(() => setCopiedUid(false), 2000);
                        }
                      }}
                    >
                      {copiedUid ? (
                        <span className="flex items-center gap-1 text-success">
                          <Check size={13} /> Copied!
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Copy size={12} /> Copy UID
                        </span>
                      )}
                    </button>
                  </div>
                  <div className="font-mono text-xs text-[var(--text-primary)] break-all select-all bg-[var(--bg-input)] p-2 rounded border border-[var(--border-color)]">
                    {user?.id || 'No UID'}
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-[11px] text-muted">
                    <span className="inline-block w-2 h-2 rounded-full bg-success" />
                    <span>Real-time authenticated session with Firebase Storage & Firestore</span>
                  </div>
                </div>

                {/* Editable Profile Information Form */}
                <div className="form-group">
                  <label className="form-label">{t('displayName')}</label>
                  <input
                    type="text"
                    className="form-input"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your full name"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">{t('username')}</label>
                  <input
                    type="text"
                    className="form-input"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="username"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">{t('bio')}</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell contacts about yourself"
                  />
                </div>

                <button
                  className="btn-primary"
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                >
                  {saveSuccess ? (
                    <span className="flex items-center gap-1">
                      <Check size={16} /> {t('saveChanges')}
                    </span>
                  ) : isSaving ? (
                    t('sending')
                  ) : (
                    t('saveChanges')
                  )}
                </button>
              </div>
            )}

            {/* Language Tab */}
            {activeTab === 'language' && (
              <div className="settings-pane animate-fade-in">
                <h3 className="pane-title">{t('language')}</h3>
                <p className="pane-desc">
                  Select your interface language. Meta Chat supports English, Afaan Oromoo, and አማርኛ (Amharic).
                </p>

                <div className="language-options-grid mt-4">
                  {(['en', 'om', 'am'] as LanguageCode[]).map((code) => {
                    const isSelected = language === code;
                    const labels: Record<LanguageCode, { label: string; native: string }> = {
                      en: { label: 'English', native: 'English' },
                      om: { label: 'Afaan Oromoo', native: 'Afaan Oromoo' },
                      am: { label: 'Amharic', native: 'አማርኛ' },
                    };
                    return (
                      <div
                        key={code}
                        className={`language-card interactive-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => setLanguage(code)}
                      >
                        <div className="lang-card-content">
                          <span className="lang-native">{labels[code].native}</span>
                          <span className="lang-label">{labels[code].label}</span>
                        </div>
                        {isSelected && <Check size={18} className="text-accent" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Theme Tab */}
            {activeTab === 'theme' && (
              <div className="settings-pane animate-fade-in">
                <h3 className="pane-title">{t('theme')}</h3>
                <p className="pane-desc">
                  Customize your visual experience with curated Telegram color modes.
                </p>

                <div className="theme-options-grid mt-4">
                  {[
                    { id: 'telegram-dark', name: 'Telegram Dark', desc: 'Classic deep blue-slate theme' },
                    { id: 'telegram-night', name: 'Telegram Night', desc: 'True pure pitch black for OLED' },
                    { id: 'telegram-light', name: 'Telegram Light', desc: 'Bright, clean daytime aesthetic' },
                  ].map((item) => {
                    const isSelected = theme === item.id;
                    return (
                      <div
                        key={item.id}
                        className={`theme-card interactive-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => setTheme(item.id as ThemeMode)}
                      >
                        <div className="theme-preview-swatch" data-theme={item.id} />
                        <div className="theme-card-info">
                          <span className="theme-name">{item.name}</span>
                          <span className="theme-desc">{item.desc}</span>
                        </div>
                        {isSelected && <Check size={18} className="text-accent" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Privacy Tab */}
            {activeTab === 'privacy' && (
              <div className="settings-pane animate-fade-in">
                <h3 className="pane-title">{t('privacyAndSecurity')}</h3>
                <p className="pane-desc">
                  Configure who can see your phone number, profile photo, and last seen activity.
                </p>

                <div className="privacy-settings-list mt-4">
                  <div className="privacy-setting-item">
                    <div className="setting-info">
                      <span className="setting-title">Phone Number</span>
                      <span className="setting-subtitle">{user?.phone || 'Not verified'}</span>
                    </div>
                    <span className="privacy-badge">My Contacts</span>
                  </div>

                  <div className="privacy-setting-item">
                    <div className="setting-info">
                      <span className="setting-title">Profile Photo</span>
                      <span className="setting-subtitle">Who can see your profile photo</span>
                    </div>
                    <span className="privacy-badge">Everybody</span>
                  </div>

                  <div className="privacy-setting-item">
                    <div className="setting-info">
                      <span className="setting-title">Last Seen & Online</span>
                      <span className="setting-subtitle">Controls timestamp visibility</span>
                    </div>
                    <span className="privacy-badge">Everybody</span>
                  </div>
                </div>
              </div>
            )}

            {/* External Integrations Tab */}
            {activeTab === 'external' && (
              <div className="settings-pane animate-fade-in">
                <h3 className="pane-title">{t('externalIntegrations')}</h3>
                <p className="pane-desc">
                  Cloud services connected to your Meta Chat instance.
                </p>

                <div className="integrations-list mt-4">
                  <div className="integration-item active">
                    <div className="integration-icon">🔥</div>
                    <div className="integration-info">
                      <span className="integration-title">Firebase Storage</span>
                      <span className="integration-desc">Cloud storage for avatars and media (meta-chat-5180c.firebasestorage.app)</span>
                    </div>
                    <span className="integration-status active">Connected</span>
                  </div>

                  <div className="integration-item active">
                    <div className="integration-icon">⚡</div>
                    <div className="integration-info">
                      <span className="integration-title">Firebase Phone Authentication</span>
                      <span className="integration-desc">SMS OTP and Test Phone Number verification</span>
                    </div>
                    <span className="integration-status active">Connected</span>
                  </div>

                  <div className="integration-item active">
                    <div className="integration-info">
                      <span className="integration-title">Firebase Firestore</span>
                      <span className="integration-desc">Real-time chat database and participant security rules</span>
                    </div>
                    <span className="integration-status active">Connected</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
