import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Smartphone,
  Apple,
  Monitor,
  Share,
  PlusSquare,
  CheckCircle,
  Sparkles,
} from 'lucide-react';
import { MetaLogo } from './MetaLogo.js';

interface InstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt?: any;
}

export const InstallModal: React.FC<InstallModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
}) => {
  const [deviceTab, setDeviceTab] = useState<'android' | 'ios' | 'desktop'>('android');
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Detect OS automatically
    const userAgent = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setDeviceTab('ios');
    } else if (/android/.test(userAgent)) {
      setDeviceTab('android');
    } else {
      setDeviceTab('desktop');
    }

    // Check if standalone
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }
  }, []);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
      }
    } else {
      // Fallback instructions if prompt not triggered
      alert(
        deviceTab === 'ios'
          ? "On iOS Safari: Tap the Share button at the bottom of the screen, then tap 'Add to Home Screen'."
          : "Tap the 3 dots in your browser menu and choose 'Install App' or 'Add to Home Screen'."
      );
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card install-modal-card animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="install-modal-title-wrap">
            <span className="install-badge-glow">
              <Download size={18} />
            </span>
            <h2 className="modal-title">Install Meta Chat</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body install-modal-body">
          {/* App Card Preview */}
          <div className="install-hero-card">
            <div className="install-hero-logo flex items-center justify-center">
              <MetaLogo size={56} />
            </div>
            <div className="install-hero-details">
              <h3 className="install-app-name">Meta Chat</h3>
              <p className="install-app-tagline">
                Modern Telegram-Style Messaging • Fast, Secure & Lightweight
              </p>
              <div className="install-tags-row">
                <span className="install-tag">
                  <CheckCircle size={12} className="inline mr-1 text-success" /> PWA Standalone
                </span>
                <span className="install-tag">
                  <Sparkles size={12} className="inline mr-1 text-accent" /> Offline Ready
                </span>
                <span className="install-tag">Instant Push</span>
              </div>
            </div>
          </div>

          {/* Primary Action Button */}
          {!isInstalled ? (
            <button
              className="btn-primary install-primary-btn"
              onClick={handleInstallClick}
            >
              <Download size={20} />
              <span>Install App on this Device</span>
            </button>
          ) : (
            <div className="install-already-notice">
              <CheckCircle size={20} className="text-success" />
              <span>Meta Chat is already installed on this device!</span>
            </div>
          )}

          {/* Device Tabs */}
          <div className="install-device-tabs">
            <button
              className={`device-tab-btn ${deviceTab === 'android' ? 'active' : ''}`}
              onClick={() => setDeviceTab('android')}
            >
              <Smartphone size={16} />
              <span>Android</span>
            </button>

            <button
              className={`device-tab-btn ${deviceTab === 'ios' ? 'active' : ''}`}
              onClick={() => setDeviceTab('ios')}
            >
              <Apple size={16} />
              <span>iPhone / iOS</span>
            </button>

            <button
              className={`device-tab-btn ${deviceTab === 'desktop' ? 'active' : ''}`}
              onClick={() => setDeviceTab('desktop')}
            >
              <Monitor size={16} />
              <span>Desktop / Tablet</span>
            </button>
          </div>

          {/* Device Instructions Content */}
          <div className="install-instructions-box animate-fade-in">
            {deviceTab === 'android' && (
              <div className="instruction-step-list">
                <div className="instruction-step">
                  <span className="step-num">1</span>
                  <div className="step-content">
                    <strong>Tap 'Install App'</strong> button above, or open Chrome/Samsung Internet menu (<strong>⋮</strong>).
                  </div>
                </div>
                <div className="instruction-step">
                  <span className="step-num">2</span>
                  <div className="step-content">
                    Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.
                  </div>
                </div>
                <div className="instruction-step">
                  <span className="step-num">3</span>
                  <div className="step-content">
                    Meta Chat will appear on your home screen and app drawer as a native app with push notifications!
                  </div>
                </div>
              </div>
            )}

            {deviceTab === 'ios' && (
              <div className="instruction-step-list">
                <div className="instruction-step">
                  <span className="step-num">1</span>
                  <div className="step-content">
                    Open this website in <strong>Safari</strong> on your iPhone or iPad.
                  </div>
                </div>
                <div className="instruction-step">
                  <span className="step-num">2</span>
                  <div className="step-content">
                    Tap the <strong>Share</strong> button <Share size={15} className="inline mx-1 text-accent" /> (square with upward arrow) at the bottom toolbar.
                  </div>
                </div>
                <div className="instruction-step">
                  <span className="step-num">3</span>
                  <div className="step-content">
                    Scroll down and tap <strong>"Add to Home Screen"</strong> <PlusSquare size={15} className="inline mx-1 text-accent" />, then tap <strong>Add</strong> in the top-right corner.
                  </div>
                </div>
              </div>
            )}

            {deviceTab === 'desktop' && (
              <div className="instruction-step-list">
                <div className="instruction-step">
                  <span className="step-num">1</span>
                  <div className="step-content">
                    On Chrome, Edge, or Brave, click <strong>'Install App'</strong> above.
                  </div>
                </div>
                <div className="instruction-step">
                  <span className="step-num">2</span>
                  <div className="step-content">
                    Or click the <strong>Install Icon</strong> (<Download size={14} className="inline" />) in your browser address bar on the right.
                  </div>
                </div>
                <div className="instruction-step">
                  <span className="step-num">3</span>
                  <div className="step-content">
                    Meta Chat opens in a clean, standalone desktop window just like Telegram Desktop!
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
