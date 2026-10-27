import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause } from 'lucide-react';

interface VoicePlayerProps {
  audioUrl?: string;
  duration?: number;
}

export const VoicePlayer: React.FC<VoicePlayerProps> = ({ audioUrl, duration = 12 }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<any>(null);

  // Simulated playback waves
  const waveHeights = [24, 38, 55, 30, 48, 70, 85, 45, 60, 90, 75, 40, 65, 35, 50, 80, 60, 40, 25];

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 0;
          }
          return prev + (100 / (duration * 10));
        });
      }, 100);
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [isPlaying, duration]);

  const currentSeconds = Math.floor((progress / 100) * duration);
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins}:${rem < 10 ? '0' : ''}${rem}`;
  };

  return (
    <div className="voice-player-bubble">
      <button className="voice-play-btn" onClick={togglePlay}>
        {isPlaying ? <Pause size={18} /> : <Play size={18} className="translate-x-0.5" />}
      </button>

      <div className="voice-waveform-wrapper">
        <div className="voice-waveform-bars">
          {waveHeights.map((h, idx) => {
            const barProgress = (idx / waveHeights.length) * 100;
            const isPlayed = progress >= barProgress;
            return (
              <span
                key={idx}
                className={`voice-bar ${isPlayed ? 'voice-bar-active' : ''}`}
                style={{ height: `${h}%` }}
              />
            );
          })}
        </div>

        <div className="voice-time-label">
          {isPlaying ? formatTime(currentSeconds) : formatTime(duration)}
        </div>
      </div>
    </div>
  );
};
