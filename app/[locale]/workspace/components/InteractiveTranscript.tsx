'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

interface TimestampSegment {
  begin_time: number;
  end_time: number;
  text: string;
}

interface InteractiveTranscriptProps {
  audioUrl: string;
  timestamps: TimestampSegment[];
  className?: string;
}

export function InteractiveTranscript({ audioUrl, timestamps, className = '' }: InteractiveTranscriptProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);

  // Find active segment based on current time
  useEffect(() => {
    if (!timestamps.length) return;
    
    const currentMs = currentTime * 1000;
    const index = timestamps.findIndex(
      (seg) => currentMs >= seg.begin_time && currentMs < seg.end_time
    );
    setActiveSegmentIndex(index >= 0 ? index : null);
  }, [currentTime, timestamps]);

  // Update current time during playback
  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setActiveSegmentIndex(null);
  }, []);

  // Click on text segment to play from that position
  const handleSegmentClick = useCallback((segment: TimestampSegment, index: number) => {
    if (audioRef.current) {
      const startTime = segment.begin_time / 1000;
      audioRef.current.currentTime = startTime;
      audioRef.current.play();
      setIsPlaying(true);
      setActiveSegmentIndex(index);
    }
  }, []);

  // Play/Pause toggle
  const togglePlayPause = useCallback(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Format timestamp for display
  const formatTimestamp = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Change playback rate
  const cyclePlaybackRate = useCallback(() => {
    const rates = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % rates.length;
    const newRate = rates[nextIndex];
    setPlaybackRate(newRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = newRate;
    }
  }, [playbackRate]);

  // Seek by clicking on progress bar
  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (audioRef.current && duration > 0) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = x / rect.width;
      const newTime = percentage * duration;
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  }, [duration]);

  if (!audioUrl || !timestamps.length) {
    return null;
  }

  return (
    <div className={`interactive-transcript ${className}`}>
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Audio player controls */}
      <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-lg mb-4 border border-indigo-100 dark:border-indigo-800">
        {/* Play/Pause button */}
        <button
          onClick={togglePlayPause}
          className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center transition-colors shadow-md"
        >
          {isPlaying ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Progress bar */}
        <div className="flex-1 flex flex-col gap-1">
          <div 
            className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full cursor-pointer overflow-hidden"
            onClick={handleProgressClick}
          >
            <div 
              className="h-full bg-indigo-600 rounded-full transition-all"
              style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-gray-500 dark:text-gray-400">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Playback rate button */}
        <button
          onClick={cyclePlaybackRate}
          className="flex-shrink-0 px-2 py-1 text-xs font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          {playbackRate}x
        </button>
      </div>

      {/* Transcript with clickable segments */}
      <div className="space-y-1">
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
          </svg>
          点击文字跳转到对应位置播放
        </div>
        <div className="flex flex-wrap gap-1 leading-relaxed">
          {timestamps.map((segment, index) => (
            <span
              key={index}
              onClick={() => handleSegmentClick(segment, index)}
              className={`
                cursor-pointer px-1 py-0.5 rounded transition-all duration-200
                hover:bg-indigo-100 dark:hover:bg-indigo-800/50
                ${activeSegmentIndex === index 
                  ? 'bg-indigo-200 dark:bg-indigo-700/70 text-indigo-900 dark:text-indigo-100 font-medium ring-2 ring-indigo-400 dark:ring-indigo-500' 
                  : 'hover:text-indigo-700 dark:hover:text-indigo-300'
                }
              `}
              title={`${formatTimestamp(segment.begin_time)} - ${formatTimestamp(segment.end_time)}`}
            >
              {segment.text}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
