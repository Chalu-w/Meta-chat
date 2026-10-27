import React, { useState, useEffect, useRef } from 'react';
import {
  Phone,
  Lock,
  User as UserIcon,
  ArrowRight,
  Globe,
  CheckCircle2,
  AlertTriangle,
  Download,
  RotateCcw,
  Sparkles,
  Signal,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useLanguage } from '../i18n/LanguageContext.js';
import { api } from '../services/api.js';
import { CountrySelect, SUPPORTED_COUNTRIES, CountryItem } from './CountrySelect.js';
import { InstallModal } from './InstallModal.js';
import { MetaLogo } from './MetaLogo.js';
import { LanguageCode } from '../types.js';
import { auth, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from '../firebase.js';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt?: any;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, deferredPrompt }) => {
  const { login, loginWithPhoneOtp, loginWithFirebaseToken, register, switchDemoUser } = useAuth();
  const { language, setLanguage, t, languageNames } = useLanguage();

  const [mode, setMode] = useState<'otp' | 'password' | 'register'>('otp');
  const [selectedCountry, setSelectedCountry] = useState<CountryItem>(SUPPORTED_COUNTRIES[0]); // Ethiopia (+251)
  const [phoneNumberOnly, setPhoneNumberOnly] = useState('911223344');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [showDevProfiles, setShowDevProfiles] = useState(false);

  // Firebase ConfirmationResult & Recaptcha
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  // Delivery status details
  const [deliveryStatus, setDeliveryStatus] = useState<{
    delivered: boolean;
    provider: string;
    carrier?: string;
    message?: string;
    phone?: string;
    isSandbox?: boolean;
  } | null>(null);

  const [identifier, setIdentifier] = useState('chala_b');
  const [password, setPassword] = useState('password123');

  // Registration state
  const [regSelectedCountry, setRegSelectedCountry] = useState<CountryItem>(SUPPORTED_COUNTRIES[0]);
  const [regPhoneOnly, setRegPhoneOnly] = useState('');
  const [regDisplayName, setRegDisplayName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regBio, setRegBio] = useState('');

  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const otpInputRef = useRef<HTMLInputElement>(null);

  // Close language dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setShowLangMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup reCAPTCHA on unmount
  useEffect(() => {
    return () => {
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch {
          // ignore
        }
        recaptchaVerifierRef.current = null;
      }
    };
  }, []);

  // Countdown timer effect
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Focus OTP input when screen changes to OTP verification
  useEffect(() => {
    if (otpSent && otpInputRef.current) {
      otpInputRef.current.focus();
    }
  }, [otpSent]);

  if (!isOpen) return null;

  const fullPhoneNumber = `${selectedCountry.code}${phoneNumberOnly.replace(/^0+/, '')}`;
  const fullRegPhoneNumber = `${regSelectedCountry.code}${regPhoneOnly.replace(/^0+/, '')}`;

  // Real-time network detection for Ethiopia
  const getEthiopianCarrierBadge = () => {
    if (selectedCountry.id !== 'ET') return null;
    const clean = phoneNumberOnly.replace(/^0+/, '');
    if (clean.startsWith('9')) {
      return <span className="network-pill ethio-telecom">🇪🇹 Ethio Telecom (9...)</span>;
    }
    if (clean.startsWith('7')) {
      return <span className="network-pill safaricom">🟢 Safaricom Ethiopia (7...)</span>;
    }
    return <span className="network-pill unknown">Enter 9... or 7...</span>;
  };

  /**
   * Initializes or resets the Firebase RecaptchaVerifier
   */
  const initRecaptchaVerifier = (): RecaptchaVerifier | null => {
    if (recaptchaVerifierRef.current) {
      try {
        recaptchaVerifierRef.current.clear();
      } catch {
        // ignore
      }
      recaptchaVerifierRef.current = null;
    }

    const container = document.getElementById('firebase-recaptcha-container');
    if (!container) return null;

    try {
      const verifier = new RecaptchaVerifier(auth, 'firebase-recaptcha-container', {
        size: 'invisible',
        callback: () => {
          // reCAPTCHA solved
        },
        'expired-callback': () => {
          setErrorMsg('reCAPTCHA expired. Please try requesting the code again.');
        },
      });
      recaptchaVerifierRef.current = verifier;
      return verifier;
    } catch (err: any) {
      console.warn('[Firebase Recaptcha Init Warning]:', err.message);
      return null;
    }
  };

  const handleSendOtp = async () => {
    if (!phoneNumberOnly) {
      setErrorMsg(t('enterPhoneForOtp'));
      return;
    }

    // Client-side validation per country
    if (selectedCountry.id === 'ET') {
      const clean = phoneNumberOnly.replace(/^0+/, '');
      if (clean.length !== 9 || (!clean.startsWith('9') && !clean.startsWith('7'))) {
        setErrorMsg('Ethiopian numbers must be 9 digits starting with 9 (Ethio Telecom) or 7 (Safaricom).');
        return;
      }
    }

    setErrorMsg('');
    setIsLoading(true);

    try {
      // 1. Initialize Firebase RecaptchaVerifier
      const verifier = initRecaptchaVerifier();
      if (!verifier) {
        throw new Error('Could not initialize reCAPTCHA security. Please refresh the page.');
      }

      // 2. Dispatch real SMS OTP via Firebase Phone Authentication
      const confirmation = await signInWithPhoneNumber(auth, fullPhoneNumber, verifier);
      setConfirmationResult(confirmation);
      setOtpSent(true);
      setCountdown(60);

      const carrierName =
        selectedCountry.id === 'ET'
          ? phoneNumberOnly.startsWith('9')
            ? 'Ethio Telecom (ኢትዮ ቴሌኮም)'
            : 'Safaricom Ethiopia (ሳፋሪኮም)'
          : selectedCountry.name;

      setDeliveryStatus({
        delivered: true,
        provider: 'Firebase Phone Authentication',
        carrier: carrierName,
        message: `${t('firebaseCodeSent')} ${fullPhoneNumber}.`,
        phone: fullPhoneNumber,
        isSandbox: fullPhoneNumber === '+251900000000',
      });
    } catch (err: any) {
      console.warn('[Firebase Phone Auth Warning]:', err.code, err.message);

      let friendlyError = err.message || t('smsNotConfigured');
      if (err.code === 'auth/operation-not-allowed') {
        friendlyError = t('operationNotAllowed');
      } else if (err.code === 'auth/app-not-authorized' || err.code === 'auth/unauthorized-domain') {
        friendlyError = t('domainNotAuthorized');
      } else if (err.code === 'auth/invalid-phone-number') {
        friendlyError = 'Invalid phone number format for the selected country.';
      } else if (err.code === 'auth/too-many-requests') {
        friendlyError = t('tooManyRequests');
      } else if (err.code === 'auth/quota-exceeded') {
        friendlyError = 'SMS verification quota exceeded for this Firebase project.';
      } else if (err.code === 'auth/captcha-check-failed') {
        friendlyError = 'Security reCAPTCHA check failed. Please try again.';
      } else if (err.code === 'auth/billing-not-enabled') {
        friendlyError = 'Firebase Phone Authentication requires SMS quota or billing enabled in Firebase Console.';
      }

      setOtpSent(false);
      setErrorMsg(friendlyError);

      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch {
          // ignore
        }
        recaptchaVerifierRef.current = null;
      }
    } finally {

      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.trim().length !== 6) {
      setErrorMsg('Please enter the complete 6-digit verification code.');
      return;
    }
    setErrorMsg('');
    setIsLoading(true);

    try {
      if (!confirmationResult) {
        throw new Error('No active verification session found. Please request a new code.');
      }

      // 1. Verify 6-digit code with Firebase
      const userCredential = await confirmationResult.confirm(otpCode.trim());
      const idToken = await userCredential.user.getIdToken();

      // 2. Cryptographically establish authenticated session with backend
      await loginWithFirebaseToken(idToken, fullPhoneNumber);
      onClose();
    } catch (err: any) {

      console.warn('[Firebase Verification Error]:', err.code, err.message);
      if (err.code === 'auth/invalid-verification-code') {
        setErrorMsg(t('invalidCode'));
      } else if (err.code === 'auth/code-expired') {
        setErrorMsg(t('codeExpired'));
      } else {
        setErrorMsg(err.message || t('invalidCode'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordLogin = async () => {
    setErrorMsg('');
    setIsLoading(true);
    try {
      await login(identifier, password);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!regPhoneOnly || !regDisplayName || !regPassword) {
      setErrorMsg('Please fill all required fields.');
      return;
    }
    setErrorMsg('');
    setIsLoading(true);
    try {
      await register({
        phone: fullRegPhoneNumber,
        displayName: regDisplayName,
        username: regUsername,
        password: regPassword,
        bio: regBio,
        language,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoSelect = async (username: string) => {
    setErrorMsg('');
    setIsLoading(true);
    try {
      await switchDemoUser(username);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Demo login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-overlay">
      <div className="auth-card animate-fade-in">
        {/* Invisible Firebase reCAPTCHA anchor */}
        <div id="firebase-recaptcha-container" />

        {/* Top bar with Meta Chat Logo, Install Button & 3-Language Selector */}
        <div className="auth-top-bar">
          <div className="auth-brand-logo flex items-center gap-2">
            <MetaLogo size={36} />
            <div className="flex flex-col">
              <span className="logo-text leading-tight">{t('appName')}</span>
              <span className="text-[10px] text-muted tracking-wider uppercase">Messaging</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Install App CTA */}
            <button
              className="install-app-header-btn"
              onClick={() => setIsInstallModalOpen(true)}
              title="Install Meta Chat on Mobile or Desktop"
            >
              <Download size={14} />
              <span>{t('installApp')}</span>
            </button>

            {/* 3-Language Dropdown Selector */}
            <div className="relative" ref={langMenuRef}>
              <button
                className="auth-lang-btn flex items-center gap-1.5"
                onClick={() => setShowLangMenu(!showLangMenu)}
                title="Choose Language (English / Afaan Oromoo / አማርኛ)"
              >
                <Globe size={14} />
                <span className="font-bold">{languageNames[language]?.native || language.toUpperCase()}</span>
              </button>

              {showLangMenu && (
                <div className="language-dropdown-menu animate-fade-in">
                  {(['en', 'om', 'am'] as LanguageCode[]).map((code) => {
                    const isSelected = language === code;
                    return (
                      <button
                        key={code}
                        className={`language-menu-item ${isSelected ? 'active' : ''}`}
                        onClick={() => {
                          setLanguage(code);
                          setShowLangMenu(false);
                        }}
                      >
                        <span className="font-semibold">{languageNames[code].native}</span>
                        <span className="text-xs text-muted">({languageNames[code].label})</span>
                        {isSelected && <Check size={14} className="ml-auto text-accent" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Auth Subtitle */}
        <div className="auth-header-text">
          <h1 className="auth-title">
            {mode === 'register' ? t('signUp') : t('loginTitle')}
          </h1>
          <p className="auth-subtitle">
            {mode === 'register' ? t('registerSubtitle') : t('loginSubtitle')}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="auth-nav-tabs">
          <button
            className={`auth-tab ${mode === 'otp' ? 'active' : ''}`}
            onClick={() => {
              setMode('otp');
              setErrorMsg('');
            }}
          >
            <Phone size={15} />
            <span>Phone OTP</span>
          </button>

          <button
            className={`auth-tab ${mode === 'password' ? 'active' : ''}`}
            onClick={() => {
              setMode('password');
              setErrorMsg('');
            }}
          >
            <Lock size={15} />
            <span>{t('password')}</span>
          </button>

          <button
            className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => {
              setMode('register');
              setErrorMsg('');
            }}
          >
            <UserIcon size={15} />
            <span>{t('signUp')}</span>
          </button>
        </div>

        {/* Error Alert Box */}
        {errorMsg && (
          <div className="auth-error-banner animate-fade-in">
            <AlertTriangle size={16} className="inline mr-1.5 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* OTP Flow with Firebase Phone Authentication */}
        {mode === 'otp' && (
          <div className="auth-form-body">
            {!otpSent ? (
              <>
                <div className="form-group">
                  <div className="flex items-center justify-between mb-1">
                    <label className="form-label mb-0">{t('countryLabel')}</label>
                    {selectedCountry.id === 'ET' && (
                      <span className="text-xs text-muted flex items-center gap-1">
                        <Signal size={12} className="text-accent" /> Ethio Telecom / Safaricom
                      </span>
                    )}
                  </div>
                  <CountrySelect
                    selectedCountry={selectedCountry}
                    onSelectCountry={(c) => {
                      setSelectedCountry(c);
                      setErrorMsg('');
                    }}
                  />
                </div>

                <div className="form-group">
                  <div className="flex items-center justify-between mb-1">
                    <label className="form-label mb-0">{t('phoneNumber')}</label>
                    {getEthiopianCarrierBadge()}
                  </div>
                  <div className="phone-input-combined">
                    <span className="phone-code-prefix">{selectedCountry.code}</span>
                    <input
                      type="tel"
                      className="form-input flex-1 font-mono tracking-wider"
                      placeholder={selectedCountry.placeholder}
                      value={phoneNumberOnly}
                      onChange={(e) => {
                        setPhoneNumberOnly(e.target.value.replace(/[^0-9]/g, ''));
                        setErrorMsg('');
                      }}
                      autoFocus
                    />
                  </div>
                  <div className="text-xs text-muted mt-1.5 flex justify-between items-center">
                    <span>
                      Target: <strong>{fullPhoneNumber}</strong>
                    </span>
                    <span className="text-[11px] text-accent flex items-center gap-1">
                      <ShieldCheck size={12} /> Firebase Auth
                    </span>
                  </div>
                </div>

                <button
                  className="btn-primary auth-submit-btn"
                  onClick={handleSendOtp}
                  disabled={isLoading || !phoneNumberOnly}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      {t('sending')}
                    </span>
                  ) : (
                    <>
                      <span>{t('sendOtp')}</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>

                <div className="text-[11px] text-muted text-center mt-2.5 flex items-center justify-center gap-1">
                  <ShieldCheck size={12} className="text-accent" />
                  <span>{t('recaptchaNotice')}</span>
                </div>
              </>
            ) : (
              <>
                {/* Truthful Delivery Status Notification */}
                <div className="otp-status-card animate-fade-in mb-3 p-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-input)]">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 size={18} className="text-success mt-0.5 flex-shrink-0" />
                    <div className="flex flex-col text-xs leading-relaxed">
                      <div className="font-semibold text-sm text-white">
                        {deliveryStatus?.isSandbox ? t('sandboxActive') : `${t('codeSentTo')} ${deliveryStatus?.phone}`}
                      </div>
                      <div className="text-muted mt-0.5">
                        {deliveryStatus?.carrier && (
                          <span className="text-accent font-medium mr-1.5">
                            [{deliveryStatus.carrier}]
                          </span>
                        )}
                        {deliveryStatus?.message}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="form-group mt-3">
                  <label className="form-label">{t('verificationCode')}</label>
                  <input
                    ref={otpInputRef}
                    type="text"
                    className="form-input text-center text-xl tracking-[0.4em] font-mono font-bold"
                    placeholder="••••••"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => {
                      setOtpCode(e.target.value.replace(/[^0-9]/g, ''));
                      setErrorMsg('');
                    }}
                    autoFocus
                  />
                </div>

                <button
                  className="btn-primary auth-submit-btn"
                  onClick={handleVerifyOtp}
                  disabled={isLoading || otpCode.length < 6}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      {t('sending')}
                    </span>
                  ) : (
                    <>
                      <span>{t('verifyAndProceed')}</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>

                {/* Resend Countdown & Change Number */}
                <div className="otp-resend-bar flex items-center justify-between text-xs mt-3 px-1">
                  {countdown > 0 ? (
                    <span className="text-muted">
                      {t('resendIn')} <strong className="text-accent">{countdown}s</strong>
                    </span>
                  ) : (
                    <button
                      className="text-accent font-semibold flex items-center gap-1 hover:underline"
                      onClick={handleSendOtp}
                      disabled={isLoading}
                    >
                      <RotateCcw size={13} />
                      {t('resendOtp')}
                    </button>
                  )}

                  <button
                    className="text-muted hover:text-white transition-colors"
                    onClick={() => {
                      setOtpSent(false);
                      setOtpCode('');
                      setConfirmationResult(null);
                      setErrorMsg('');
                    }}
                  >
                    {t('changeNumber')}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Password Login Flow */}
        {mode === 'password' && (
          <div className="auth-form-body">
            <div className="form-group">
              <label className="form-label">{t('phoneNumberOrUsername')}</label>
              <input
                type="text"
                className="form-input"
                placeholder="chala_b / +251911223344"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t('password')}</label>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              className="btn-primary auth-submit-btn"
              onClick={handlePasswordLogin}
              disabled={isLoading || !identifier || !password}
            >
              <span>{isLoading ? t('sending') : t('login')}</span>
              <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* Register Flow with Country Selector */}
        {mode === 'register' && (
          <div className="auth-form-body">
            <div className="form-group">
              <label className="form-label">{t('displayName')}</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Caalaa Bantii / ሰለሞን"
                value={regDisplayName}
                onChange={(e) => setRegDisplayName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t('countryLabel')}</label>
              <CountrySelect
                selectedCountry={regSelectedCountry}
                onSelectCountry={(c) => setRegSelectedCountry(c)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t('phoneNumber')}</label>
              <div className="phone-input-combined">
                <span className="phone-code-prefix">{regSelectedCountry.code}</span>
                <input
                  type="tel"
                  className="form-input flex-1 font-mono"
                  placeholder={regSelectedCountry.placeholder}
                  value={regPhoneOnly}
                  onChange={(e) => setRegPhoneOnly(e.target.value.replace(/[^0-9]/g, ''))}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">{t('username')}</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. chala_dev"
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t('password')}</label>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
              />
            </div>

            <button
              className="btn-primary auth-submit-btn"
              onClick={handleRegister}
              disabled={isLoading || !regDisplayName || !regPhoneOnly || !regPassword}
            >
              <span>{isLoading ? t('sending') : t('signUp')}</span>
              <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* Developer Sandbox & Demo Profiles (Collapsible, hidden from regular users) */}
        <div className="mt-4 pt-3 border-t border-[var(--border-color)]">
          <button
            type="button"
            className="flex items-center justify-between w-full text-xs text-muted hover:text-white transition-colors py-1.5 px-2 rounded hover:bg-[var(--bg-hover)]"
            onClick={() => setShowDevProfiles(!showDevProfiles)}
          >
            <span className="flex items-center gap-1.5 font-medium">
              <Sparkles size={13} className="text-accent" />
              <span>{t('devProfiles')}</span>
            </span>
            <span className="text-[10px] tracking-widest font-mono">
              {showDevProfiles ? '▲ HIDE' : '▼ SHOW'}
            </span>
          </button>

          {showDevProfiles && (
            <div className="mt-2.5 animate-fade-in space-y-2">
              {/* Sandbox fast-fill action */}
              <div className="p-2 rounded bg-accent/10 border border-accent/20 flex items-center justify-between text-xs">
                <div>
                  <strong className="text-white block font-mono">+251 900 000 000</strong>
                  <span className="text-muted text-[11px]">Firebase / Sandbox Test (OTP: 849201)</span>
                </div>
                <button
                  type="button"
                  className="text-xs font-semibold px-2.5 py-1 rounded bg-accent text-white hover:opacity-90"
                  onClick={() => {
                    setSelectedCountry(SUPPORTED_COUNTRIES[0]);
                    setPhoneNumberOnly('900000000');
                    setMode('otp');
                    setOtpSent(false);
                    setOtpCode('');
                    setErrorMsg('');
                  }}
                >
                  Use in Form
                </button>
              </div>

              <div className="auth-demo-grid">
                <button
                  className="auth-demo-card"
                  onClick={() => handleDemoSelect('chala_b')}
                  title="Login as Caalaa (Ethiopia)"
                >
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80"
                    alt="Caalaa"
                  />
                  <div className="flex flex-col text-left overflow-hidden">
                    <span className="demo-name">Caalaa Bantii</span>
                    <span className="demo-tag text-[10px] text-muted truncate">🇪🇹 Ethio Telecom</span>
                  </div>
                </button>

                <button
                  className="auth-demo-card"
                  onClick={() => handleDemoSelect('hawani_d')}
                  title="Login as Hawaanii (UAE / Dubai)"
                >
                  <img
                    src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=80&auto=format&fit=crop&q=80"
                    alt="Hawaanii"
                  />
                  <div className="flex flex-col text-left overflow-hidden">
                    <span className="demo-name">Hawaanii Dastaa</span>
                    <span className="demo-tag text-[10px] text-muted truncate">🇦🇪 UAE / Dubai</span>
                  </div>
                </button>

                <button
                  className="auth-demo-card"
                  onClick={() => handleDemoSelect('gadaa_t')}
                  title="Login as Gadaa (Canada)"
                >
                  <img
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=80"
                    alt="Gadaa"
                  />
                  <div className="flex flex-col text-left overflow-hidden">
                    <span className="demo-name">Gadaa Tolasaa</span>
                    <span className="demo-tag text-[10px] text-muted truncate">🇨🇦 Canada (+1)</span>
                  </div>
                </button>

                <button
                  className="auth-demo-card"
                  onClick={() => handleDemoSelect('bilisummaa_k')}
                  title="Login as Bilisummaa (Saudi Arabia)"
                >
                  <img
                    src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=80&auto=format&fit=crop&q=80"
                    alt="Bilisummaa"
                  />
                  <div className="flex flex-col text-left overflow-hidden">
                    <span className="demo-name">Bilisummaa</span>
                    <span className="demo-tag text-[10px] text-muted truncate">🇸🇦 Saudi Arabia</span>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Install Footer CTA */}
        <div className="auth-install-footer mt-3">
          <button
            type="button"
            className="auth-install-link flex items-center justify-center gap-2 w-full py-2 text-xs text-accent hover:underline"
            onClick={() => setIsInstallModalOpen(true)}
          >
            <Download size={14} />
            <span>{t('installTitle')} — Android, iOS & Desktop</span>
          </button>
        </div>
      </div>

      {/* Installation Modal */}
      <InstallModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        deferredPrompt={deferredPrompt}
      />
    </div>
  );
};
