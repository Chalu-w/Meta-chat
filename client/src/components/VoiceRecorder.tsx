import React, { useState, useEffect } from 'react';
import { Mic, Trash2, Send } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext.js';

interface VoiceRecorderProps {
  onCancel: () => void;
  onSendVoice: (duration: number) => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onCancel, onSendVoice }) => {
  const [seconds, setSeconds] = useState(0);
  const { t } = useLanguage();

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const rem = sec % 60;
    return `${mins}:${rem < 10 ? '0' : ''}${rem}`;
  };

  return (
    <div className="voice-recorder-bar animate-fade-in">
      <div className="voice-recorder-left">
        <div className="voice-recording-pulsar animate-pulse">
          <Mic size={18} />
        </div>
        <span className="voice-recorder-time">{formatSeconds(seconds)}</span>
        <span className="voice-recorder-label">{t('recordingVoice')}</span>
      </div>

      <div className="voice-recorder-actions">
        <button
          className="voice-cancel-btn"
          onClick={onCancel}
          title={t('cancel')}
        >
          <Trash2 size={20} />
        </button>

        <button
          className="voice-send-btn"
          onClick={() => onSendVoice(Math.max(1, seconds))}
          title={t('send')}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};
