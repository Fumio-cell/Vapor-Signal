import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { RendererContext } from '../lib/renderer/RendererContext';

export const PreviewPanel: React.FC = () => {
    const { status, recipe, audioFile, audioBuffer, analysisFrames, orderEstimated, turbulenceEstimated } = useAppStore();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rendererRef = useRef<RendererContext | null>(null);
    const reqRef = useRef<number>(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [webglError, setWebglError] = useState<string | null>(null);

    const audioContextRef = useRef<AudioContext | null>(null);
    const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
    const startTimeRef = useRef<number>(0);

    useEffect(() => {
        if (canvasRef.current && !rendererRef.current) {
            try {
                rendererRef.current = new RendererContext(canvasRef.current);
            } catch (err: any) {
                console.error("Renderer initialization failed:", err);
                setWebglError(err.message || "WebGL initialization failed.");
            }
        }
    }, []);

    useEffect(() => {
        if (rendererRef.current) {
            rendererRef.current.resetSeed(recipe.seed);
        }
    }, [recipe.seed]);

    useEffect(() => {
        if (isPlaying && audioBuffer) {
            const ctx = new window.AudioContext();
            audioContextRef.current = ctx;
            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(ctx.destination);
            source.start(0);
            sourceNodeRef.current = source;
            startTimeRef.current = ctx.currentTime;

            source.onended = () => {
                setIsPlaying(false);
            };
        } else {
            if (sourceNodeRef.current) {
                try { sourceNodeRef.current.stop(); } catch (e) { }
                sourceNodeRef.current.disconnect();
                sourceNodeRef.current = null;
            }
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close().catch(console.error);
                audioContextRef.current = null;
            }
        }

        return () => {
            if (sourceNodeRef.current) {
                try { sourceNodeRef.current.stop(); } catch (e) { }
            }
        }
    }, [isPlaying, audioBuffer]);

    useEffect(() => {
        let lastTime = performance.now();
        const renderLoop = (time: number) => {
            const dt = (time - lastTime) / 1000;
            lastTime = time;

            let currentFlux = 0.0;

            if (isPlaying && audioContextRef.current && audioBuffer && analysisFrames.length > 0) {
                const elapsed = audioContextRef.current.currentTime - startTimeRef.current;
                const hopTime = 512 / audioBuffer.sampleRate;
                const currentFrameIdx = Math.floor(elapsed / hopTime);

                if (currentFrameIdx >= 0 && currentFrameIdx < analysisFrames.length) {
                    currentFlux = analysisFrames[currentFrameIdx].spectralFlux || 0;
                }
            }

            if (rendererRef.current) {
                rendererRef.current.renderFrame(Math.min(dt, 0.1), recipe, {
                    order: orderEstimated,
                    turbulence: turbulenceEstimated,
                    spectralFlux: currentFlux
                });
            }
            reqRef.current = requestAnimationFrame(renderLoop);
        };
        reqRef.current = requestAnimationFrame(renderLoop);

        return () => cancelAnimationFrame(reqRef.current);
    }, [recipe, orderEstimated, turbulenceEstimated, isPlaying, audioBuffer, analysisFrames]);

    return (
        <div className="panel preview-panel">
            <div className="preview-container">
                {webglError ? (
                    <div className="overlay" style={{ background: 'rgba(255, 0, 0, 0.2)', border: '1px solid #ff4444', textAlign: 'center', width: '80%' }}>
                        <h3 style={{ color: '#ff4444', margin: '0 0 10px 0' }}>WebGL 2 Not Supported</h3>
                        <p style={{ fontSize: '0.9rem', color: '#ccc', margin: 0 }}>{webglError}</p>
                        <p style={{ fontSize: '0.8rem', color: '#999', marginTop: '10px' }}>This application requires a browser that supports WebGL 2 (e.g., Chrome, Edge, or a recent version of Safari/Firefox).</p>
                    </div>
                ) : (
                    <>
                        {status === 'analyzing' && <div className="overlay">Analyzing Audio...</div>}
                        {status === 'rendering' && <div className="overlay">Rendering Offline...</div>}
                        {status === 'encoding' && <div className="overlay">Encoding Video...</div>}
                    </>
                )}

                <canvas ref={canvasRef} width="1920" height="1080" className="mist-canvas" />
            </div>

            <div className="preview-controls">
                <label>
                    <input type="checkbox" checked={recipe.showMist} onChange={(e) => useAppStore.getState().updateRecipe({ showMist: e.target.checked })} disabled={!!webglError} /> Mist Layer
                </label>
                <button onClick={() => setIsPlaying(!isPlaying)} disabled={!audioFile || !!webglError}>
                    {isPlaying ? 'Stop Preview' : 'Play Preview'}
                </button>
            </div>
        </div>
    );
};
