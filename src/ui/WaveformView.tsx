import React, { useRef, useEffect, useCallback } from 'react';

interface WaveformViewProps {
    audioBuffer: AudioBuffer | null;
    currentTime: number;
    duration: number;
    timeStart: number;
    timeEnd: number;
    onTimeRangeChange?: (start: number, end: number) => void;
    onSeek?: (time: number) => void;
}

const WaveformView: React.FC<WaveformViewProps> = ({
    audioBuffer,
    currentTime,
    duration,
    timeStart,
    timeEnd,
    onSeek,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const drawWaveform = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || !audioBuffer) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas resolution
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const width = rect.width;
        const height = rect.height;
        const midY = height / 2;

        // Clear
        ctx.fillStyle = '#111827';
        ctx.fillRect(0, 0, width, height);

        // Draw time selection background
        if (duration > 0) {
            const selStartX = (timeStart / duration) * width;
            const selEndX = (timeEnd / duration) * width;
            ctx.fillStyle = 'rgba(99, 102, 241, 0.08)';
            ctx.fillRect(selStartX, 0, selEndX - selStartX, height);

            // Selection borders
            ctx.strokeStyle = 'rgba(99, 102, 241, 0.4)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(selStartX, 0);
            ctx.lineTo(selStartX, height);
            ctx.moveTo(selEndX, 0);
            ctx.lineTo(selEndX, height);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Get channel data (use first channel)
        const data = audioBuffer.getChannelData(0);
        const step = Math.ceil(data.length / width);

        // Draw waveform
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 1;
        ctx.beginPath();

        for (let x = 0; x < width; x++) {
            const start = Math.floor(x * step);
            let min = 1;
            let max = -1;

            for (let j = 0; j < step && start + j < data.length; j++) {
                const val = data[start + j];
                if (val < min) min = val;
                if (val > max) max = val;
            }

            const yMin = midY + min * midY * 0.9;
            const yMax = midY + max * midY * 0.9;

            ctx.moveTo(x, yMin);
            ctx.lineTo(x, yMax);
        }

        ctx.stroke();

        // Draw center line
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, midY);
        ctx.lineTo(width, midY);
        ctx.stroke();

        // Draw playback position
        if (duration > 0 && currentTime >= 0) {
            const posX = (currentTime / duration) * width;
            ctx.strokeStyle = '#22d3ee';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(posX, 0);
            ctx.lineTo(posX, height);
            ctx.stroke();

            // Playhead triangle
            ctx.fillStyle = '#22d3ee';
            ctx.beginPath();
            ctx.moveTo(posX - 5, 0);
            ctx.lineTo(posX + 5, 0);
            ctx.lineTo(posX, 8);
            ctx.closePath();
            ctx.fill();
        }
    }, [audioBuffer, currentTime, duration, timeStart, timeEnd]);

    useEffect(() => {
        drawWaveform();
    }, [drawWaveform]);

    // Resize observer
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const observer = new ResizeObserver(() => drawWaveform());
        observer.observe(container);
        return () => observer.disconnect();
    }, [drawWaveform]);

    const handleClick = useCallback(
        (e: React.MouseEvent<HTMLCanvasElement>) => {
            if (!audioBuffer || !onSeek || !canvasRef.current) return;
            const rect = canvasRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const time = (x / rect.width) * duration;
            onSeek(Math.max(0, Math.min(duration, time)));
        },
        [audioBuffer, duration, onSeek]
    );

    if (!audioBuffer) {
        return (
            <div className="view-container glass-card">
                <div className="view-label">Waveform</div>
                <div className="visualizer-placeholder">
                    <div className="icon">〰️</div>
                    <div>音声ファイルを読み込んでください</div>
                </div>
            </div>
        );
    }

    return (
        <div className="view-container glass-card" ref={containerRef}>
            <div className="view-label">Waveform</div>
            <canvas
                ref={canvasRef}
                className="waveform-canvas"
                onClick={handleClick}
                style={{ cursor: 'crosshair' }}
            />
        </div>
    );
};

export default WaveformView;
