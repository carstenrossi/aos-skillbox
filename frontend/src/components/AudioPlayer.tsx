import React, { useState, useRef } from 'react';
import { Play, Pause, Download, Volume2, VolumeX } from 'lucide-react';

interface AudioPlayerProps {
  audioUrl: string;
  title?: string;
  className?: string;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioUrl, title, className = '' }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => {
        console.error('Audio playback failed:', err);
        setError('Audio konnte nicht abgespielt werden');
      });
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      setIsLoading(false);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current) {
      const time = parseFloat(e.target.value);
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = title || 'audio.mp3';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getFileSize = (url: string) => {
    if (url.startsWith('data:')) {
      // For data URLs, estimate size from base64 length
      const base64 = url.split(',')[1];
      const bytes = (base64.length * 3) / 4;
      return `~${(bytes / 1024 / 1024).toFixed(1)} MB`;
    }
    return '';
  };

  return (
    <div className={`bg-gray-50 rounded-lg p-4 border border-gray-200 ${className}`}>
      <audio
        ref={audioRef}
        src={audioUrl}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onError={() => {
          setError('Audio konnte nicht geladen werden');
          setIsLoading(false);
        }}
        preload="metadata"
      />

      {/* Title */}
      {title && (
        <div className="mb-3">
          <h4 className="text-sm font-medium text-gray-900 truncate">{title}</h4>
          <p className="text-xs text-gray-500">
            🎵 Audio {getFileSize(audioUrl) && `• ${getFileSize(audioUrl)}`}
          </p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-sm text-red-600 mb-2">
          ❌ {error}
        </div>
      )}

      {/* Loading State */}
      {isLoading && !error && (
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <div className="animate-spin w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full"></div>
          <span>Audio wird geladen...</span>
        </div>
      )}

      {/* Player Controls */}
      {!isLoading && !error && (
        <div className="space-y-3">
          {/* Play/Pause and Progress */}
          <div className="flex items-center space-x-3">
            <button
              onClick={handlePlayPause}
              className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>

            <div className="flex-1">
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${
                    duration ? (currentTime / duration) * 100 : 0
                  }%, #e5e7eb ${duration ? (currentTime / duration) * 100 : 0}%, #e5e7eb 100%)`
                }}
              />
            </div>

            <span className="text-xs text-gray-500 font-mono min-w-[60px]">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Volume and Download */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleMute}
              className="p-1 text-gray-600 hover:text-gray-800 transition-colors"
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
              aria-label="Download audio"
            >
              <Download size={14} />
              <span>Download</span>
            </button>
          </div>
        </div>
      )}

      {/* Fallback Link */}
      {error && (
        <div className="mt-2">
          <a
            href={audioUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            🔗 Audio-Link öffnen
          </a>
        </div>
      )}
    </div>
  );
};

export default AudioPlayer; 