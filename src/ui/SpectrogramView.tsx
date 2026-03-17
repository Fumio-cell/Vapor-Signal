import React, { useRef, useEffect, useCallback } from 'react';

interface SpectrogramViewProps {
    spectrogramData: Float64Array | null;
    numFrames: number;
    fftSize: number;
    sampleRate: number;
    fLow: number;
    fHigh: number;
}

const SpectrogramView: React.FC<SpectrogramViewProps> = ({
    spectrogramData,
    numFrames,
    fftSize,
    sampleRate,
    fLow,
    fHigh,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const drawSpectrogram = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || !spectrogramData || numFrames === 0) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const width = rect.width;
        const height = rect.height;
        const numBins = fftSize / 2 + 1;
        const nyquist = sampleRate / 2;

        // Clear
        ctx.fillStyle = '#0a0e17';
        ctx.fillRect(0, 0, width, height);

        // Find max magnitude for normalization (use log scale)
        let maxMag = 0;
        for (let i = 0; i < spectrogramData.length; i++) {
            if (spectrogramData[i] > maxMag) maxMag = spectrogramData[i];
        }
        const logMaxMag = Math.log10(maxMag + 1e-10);

        // Draw spectrogram using ImageData
        const imgData = ctx.createImageData(Math.ceil(width), Math.ceil(height));
        const pixels = imgData.data;

        for (let px = 0; px < Math.ceil(width); px++) {
            const frame = Math.floor((px / width) * numFrames);
            if (frame >= numFrames) continue;

            for (let py = 0; py < Math.ceil(height); py++) {
                // Y axis: bottom = 0 Hz, top = Nyquist
                const bin = Math.floor(((height - py) / height) * numBins);
                if (bin >= numBins) continue;

                const mag = spectrogramData[frame * numBins + bin];
                const logMag = Math.log10(mag + 1e-10);

                // Normalize to [0, 1]
                const intensity = Math.max(0, Math.min(1, (logMag - logMaxMag + 4) / 4));

                // Color map: dark blue → purple → yellow → white
                const r = Math.floor(intensity < 0.5 ? intensity * 2 * 99 + (1 - intensity * 2) * 15 : intensity < 0.8 ? 99 + (intensity - 0.5) / 0.3 * 146 : 245);
                const g = Math.floor(intensity < 0.5 ? intensity * 2 * 102 + (1 - intensity * 2) * 23 : intensity < 0.8 ? 102 + (intensity - 0.5) / 0.3 * 56 : 158 + (intensity - 0.8) / 0.2 * 97);
                const b = Math.floor(intensity < 0.5 ? intensity * 2 * 241 + (1 - intensity * 2) * 42 : intensity < 0.8 ? 241 - (intensity - 0.5) / 0.3 * 230 : 11);

                const idx = (py * Math.ceil(width) + px) * 4;
                pixels[idx] = r;
                pixels[idx + 1] = g;
                pixels[idx + 2] = b;
                pixels[idx + 3] = 255;
            }
        }

        ctx.putImageData(imgData, 0, 0);

        // Draw band selection overlay
        const fLowY = height - (fLow / nyquist) * height;
        const fHighY = height - (fHigh / nyquist) * height;

        // Darken outside selection
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, width, fHighY);
        ctx.fillRect(0, fLowY, width, height - fLowY);

        // Band borders
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 3]);
        ctx.beginPath();
        ctx.moveTo(0, fLowY);
        ctx.lineTo(width, fLowY);
        ctx.moveTo(0, fHighY);
        ctx.lineTo(width, fHighY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Band labels
        ctx.font = '11px "JetBrains Mono", monospace';
        ctx.fillStyle = '#22d3ee';
        ctx.textAlign = 'right';
        ctx.fillText(`${fLow} Hz`, width - 6, fLowY - 4);
        ctx.fillText(`${fHigh} Hz`, width - 6, fHighY - 4);

        // Y axis frequency labels
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
        ctx.textAlign = 'left';
        const freqMarkers = [100, 500, 1000, 2000, 5000, 10000, 20000].filter(
            (f) => f < nyquist
        );
        for (const freq of freqMarkers) {
            const y = height - (freq / nyquist) * height;
            if (y > 12 && y < height - 4) {
                ctx.fillText(freq >= 1000 ? `${freq / 1000}k` : `${freq}`, 4, y - 2);
                // Subtle grid line
                ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
                ctx.stroke();
            }
        }
    }, [spectrogramData, numFrames, fftSize, sampleRate, fLow, fHigh]);

    useEffect(() => {
        drawSpectrogram();
    }, [drawSpectrogram]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const observer = new ResizeObserver(() => drawSpectrogram());
        observer.observe(container);
        return () => observer.disconnect();
    }, [drawSpectrogram]);

    if (!spectrogramData) {
        return (
            <div className="view-container glass-card">
                <div className="view-label">Spectrogram</div>
                <div className="visualizer-placeholder">
                    <div className="icon">📊</div>
                    <div>音声解析後に表示されます</div>
                </div>
            </div>
        );
    }

    return (
        <div className="view-container glass-card" ref={containerRef}>
            <div className="view-label">Spectrogram</div>
            <canvas ref={canvasRef} className="spectrogram-canvas" />
        </div>
    );
};

export default SpectrogramView;
