import React from 'react';
import type { PlaybackMode } from '../types/types';

interface PlaybackControlsProps {
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    playbackMode: PlaybackMode;
    hasProcessed: boolean;
    disabled: boolean;
    onPlayPause: () => void;
    onStop: () => void;
    onModeChange: (mode: PlaybackMode) => void;
}

function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${m}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

const PlaybackControls: React.FC<PlaybackControlsProps> = ({
    isPlaying,
    currentTime,
    duration,
    playbackMode,
    hasProcessed,
    disabled,
    onPlayPause,
    onStop,
    onModeChange,
}) => {
    return (
        <div className="playback-bar glass-card">
            <button
                className="btn btn-primary btn-icon"
                onClick={onPlayPause}
                disabled={disabled}
                title={isPlaying ? '停止' : '再生'}
            >
                {isPlaying ? '⏸' : '▶'}
            </button>
            <button
                className="btn btn-secondary btn-icon"
                onClick={onStop}
                disabled={disabled}
                title="停止"
            >
                ⏹
            </button>

            <div className="playback-time">
                {formatTime(currentTime)} / {formatTime(duration)}
            </div>

            <div style={{ flex: 1 }} />

            <div className="playback-mode-toggle">
                <button
                    className={`btn ${playbackMode === 'original' ? 'active' : ''}`}
                    onClick={() => onModeChange('original')}
                    disabled={disabled}
                >
                    原音
                </button>
                <button
                    className={`btn ${playbackMode === 'processed' ? 'active' : ''}`}
                    onClick={() => onModeChange('processed')}
                    disabled={disabled || !hasProcessed}
                    title={!hasProcessed ? 'エクスポート処理後に使用可能' : ''}
                >
                    処理後
                </button>
            </div>
        </div>
    );
};

export default PlaybackControls;
