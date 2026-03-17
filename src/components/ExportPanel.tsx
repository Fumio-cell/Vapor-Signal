import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { RendererContext } from '../lib/renderer/RendererContext';
import { MP4Encoder } from '../lib/encoder/MP4Encoder';
import { remuxMp4ToMov } from '../lib/encoder/FFmpegReMuxer';

export const ExportPanel: React.FC = () => {
    const { status, progress, recipe, audioFile, audioBuffer, analysisFrames, setStatus } = useAppStore();
    const [format, setFormat] = useState<'mp4' | 'mov'>('mp4');
    const [resolution, setResolution] = useState<'1080p' | '4K'>('1080p');
    const [fps, setFps] = useState<24 | 30 | 60>(30);
    const [isPro, setIsPro] = useState(false);

    useEffect(() => {
        const handleAuth = (e: any) => setIsPro(e.detail.isPro);
        window.addEventListener('auth:status', handleAuth as EventListener);
        return () => window.removeEventListener('auth:status', handleAuth as EventListener);
    }, []);

    const handleGatedAction = (action: () => Promise<void>) => {
        if (!isPro) {
            if (confirm('Exporting in 4K or high framerate is a PRO feature. Would you like to upgrade?')) {
                window.dispatchEvent(new CustomEvent('app:buyPro'));
            }
            return;
        }
        action();
    };

    const handleExport = async () => {
        if (!audioFile || !audioBuffer || !analysisFrames.length) {
            alert("Please wait for analysis to complete.");
            return;
        }

        // 4K または 60FPS の場合は PRO 制限
        if (resolution === '4K' || fps === 60) {
            handleGatedAction(async () => {
                await startExport();
            });
        } else {
            await startExport();
        }
    };

    const startExport = async () => {
        if (!audioBuffer) return;
        try {
            setStatus('rendering', 0);

            const width = resolution === '4K' ? 3840 : 1920;
            const height = resolution === '4K' ? 2160 : 1080;
            const durationSec = audioBuffer.duration;
            const totalFrames = Math.floor(durationSec * fps);

            // 1. Setup Offscreen Renderer
            const canvas = new OffscreenCanvas(width, height);
            let renderer: RendererContext;
            try {
                renderer = new RendererContext(canvas);
            } catch (err: any) {
                setStatus('error', 0, `WebGL 2 is required for export: ${err.message}`);
                alert(`WebGL 2 is required for export: ${err.message}`);
                return;
            }
            renderer.resetSeed(recipe.seed);

            // 2. Setup Encoder
            const encoder = new MP4Encoder();
            await encoder.init(width, height, fps);

            const dt = 1.0 / fps;
            const hopSize = 512;
            const sampleRate = audioBuffer.sampleRate;
            const frameToAnalysisIndexCoeff = fps * (hopSize / sampleRate);

            // 3. Render and Encode Loop
            for (let i = 0; i < totalFrames; i++) {
                // Find corresponding analysis frame
                const analysisIdx = Math.min(
                    Math.floor(i / frameToAnalysisIndexCoeff),
                    analysisFrames.length - 1
                );
                const frameData = analysisFrames[analysisIdx];

                renderer.renderFrame(dt, recipe, {
                    order: useAppStore.getState().orderEstimated,
                    turbulence: useAppStore.getState().turbulenceEstimated,
                    spectralFlux: frameData ? frameData.spectralFlux : 0
                });

                await encoder.encodeFrame(canvas, i * (1000000 / fps)); // microseconds

                if (i % 30 === 0) {
                    setStatus('rendering', i / totalFrames);
                    // Yield to event loop to update UI
                    await new Promise(r => setTimeout(r, 0));
                }
            }

            setStatus('encoding', 1.0); // Flushing
            const mp4Data = await encoder.finish();

            let finalData = mp4Data;
            let ext = 'mp4';
            let mime = 'video/mp4';

            if (format === 'mov') {
                setStatus('encoding', 1.0, 'Re-muxing to MOV...');
                finalData = await remuxMp4ToMov(mp4Data);
                ext = 'mov';
                mime = 'video/quicktime';
            }

            // Trigger Download
            const blob = new Blob([finalData.buffer as ArrayBuffer], { type: mime });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `vapor-signal-${Date.now()}.${ext}`;
            document.body.appendChild(a);
            setTimeout(() => {
                a.click();
                setTimeout(() => {
                    a.remove();
                    URL.revokeObjectURL(url);
                    setStatus('idle');
                }, 100);
            }, 0);

        } catch (e: any) {
            console.error("Export Error:", e);
            setStatus('error', 0, `Export failed: ${e.message}`);
            alert(`Export failed: ${e.message}`);
        }
    };

    const handleRecipeExport = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
            schemaVersion: 1,
            recipe
        }, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "recipe.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    return (
        <div className="panel export-panel">
            <div className="export-controls">
                <select value={format} onChange={(e) => setFormat(e.target.value as any)}>
                    <option value="mp4">MP4 (H.264)</option>
                    <option value="mov">MOV (Re-mux)</option>
                </select>

                <select value={resolution} onChange={(e) => setResolution(e.target.value as any)}>
                    <option value="1080p">1080p</option>
                    <option value="4K" style={{ backgroundColor: !isPro ? 'rgba(255,165,0,0.1)' : 'inherit' }}>
                        4K (Lab) {!isPro ? '🔒' : ''}
                    </option>
                </select>

                <select value={fps.toString()} onChange={(e) => setFps(parseInt(e.target.value) as any)}>
                    <option value="24">24 FPS</option>
                    <option value="30">30 FPS</option>
                    <option value="60" style={{ backgroundColor: !isPro ? 'rgba(255,165,0,0.1)' : 'inherit' }}>
                        60 FPS {!isPro ? '🔒' : ''}
                    </option>
                </select>

                <button 
                    onClick={handleExport} 
                    disabled={status !== 'idle'}
                    className={(resolution === '4K' || fps === 60) && !isPro ? 'gated' : ''}
                >
                    Export Video
                </button>
                <button onClick={handleRecipeExport}>Save Recipe</button>
                {status !== 'idle' && <button>Cancel / Working...</button>}
            </div>

            <div className="progress-bar-container">
                <div className="progress-bar-fill" style={{ width: `${progress * 100}%` }} />
                <span className="progress-text">{status.toUpperCase()}: {(progress * 100).toFixed(1)}%</span>
            </div>
        </div>
    );
};
