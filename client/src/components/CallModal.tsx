import React, { useState, useEffect } from 'react';
import { PhoneOff, Mic, MicOff, Video, VideoOff, Volume2 } from 'lucide-react';
import { Chat } from '../types.js';

interface CallModalProps {
  chat: Chat;
  isVideo: boolean;
  onClose: () => void;
}

export const CallModal: React.FC<CallModalProps> = ({ chat, isVideo, onClose }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(isVideo);
  const [duration, setDuration] = useState(0);
  const [status, setStatus] = useState<'connecting' | 'connected'>('connecting');

  useEffect(() => {
    const connectTimer = setTimeout(() => {
      setStatus('connected');
    }, 1500);

    const callTimer = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);

    return () => {
      clearTimeout(connectTimer);
      clearInterval(callTimer);
    };
  }, []);

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const rem = sec % 60;
    return `${mins}:${rem < 10 ? '0' : ''}${rem}`;
  };

  return (
    <div className="call-modal-overlay">
      <div className="call-modal-card animate-fade-in">
        {/* Background Ambient Glow */}
        <div className="call-ambient-glow" />

        <div className="call-header">
          <div className="call-pulse-avatar-wrapper">
            <img src={chat.avatarUrl} alt={chat.title} className="call-avatar" />
            <div className="call-pulse-ring animate-pulse" />
          </div>

          <h2 className="call-user-title">{chat.title}</h2>
          <div className="call-status-label">
            {status === 'connecting'
              ? 'Walqunnamsiisaa jira... (Connecting...)'
              : formatDuration(duration)}
          </div>
        </div>

        {/* Video stream placeholder if video call */}
        {isVideoEnabled && (
          <div className="call-video-preview">
            <div className="call-video-badge">HD 1080p Encrypted Call</div>
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80"
              alt="Video"
              className="call-video-img"
            />
          </div>
        )}

        {/* Call Action Buttons */}
        <div className="call-controls-bar">
          <button
            className={`call-control-btn ${isMuted ? 'muted' : ''}`}
            onClick={() => setIsMuted(!isMuted)}
            title="Mute Mic"
          >
            {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
          </button>

          <button
            className={`call-control-btn ${!isVideoEnabled ? 'muted' : ''}`}
            onClick={() => setIsVideoEnabled(!isVideoEnabled)}
            title="Toggle Video"
          >
            {isVideoEnabled ? <Video size={22} /> : <VideoOff size={22} />}
          </button>

          <button className="call-control-btn" title="Speaker">
            <Volume2 size={22} />
          </button>

          <button
            className="call-control-btn call-end-btn"
            onClick={onClose}
            title="End Call"
          >
            <PhoneOff size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};
