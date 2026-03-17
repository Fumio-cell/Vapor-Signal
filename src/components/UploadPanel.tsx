import React, { useRef } from 'react';
import { useAppStore } from '../store/useAppStore';

export const UploadPanel: React.FC = () => {
    const { audioFile, setAudio, inTime, outTime, setTimeRange } = useAppStore();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.name.toLowerCase().endsWith('.wav')) {
            alert('Please upload a WAV file for best results.');
        }

        useAppStore.getState().setStatus('analyzing');

        const arrayBuffer = await file.arrayBuffer();
        const audioContext = new AudioContext(); // temporary for decoding lengths, worker will redo analysis
        try {
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            setAudio(file, audioBuffer);

            // We only need a mono mix for analysis
            const channelData = new Float32Array(audioBuffer.length);
            for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
                const chan = audioBuffer.getChannelData(i);
                for (let j = 0; j < chan.length; j++) {
                    channelData[j] += chan[j] / audioBuffer.numberOfChannels;
                }
            }

            const worker = new Worker(new URL('../workers/analysisWorker.ts', import.meta.url), { type: 'module' });

            worker.onmessage = (e) => {
                if (e.data.progress !== undefined) {
                    useAppStore.getState().setStatus('analyzing', e.data.progress);
                } else if (e.data.result) {
                    // Analysis complete
                    useAppStore.getState().setEstimates(e.data.result.orderEstimated, e.data.result.turbulenceEstimated, e.data.result.frames);
                    useAppStore.getState().setStatus('idle'); // Back to idle
                    worker.terminate();
                }
            };

            worker.postMessage({ audioChannelData: channelData, sampleRate: audioBuffer.sampleRate }, [channelData.buffer]);

        } catch (e) {
            console.error(e);
            alert('Failed to decode audio file');
            useAppStore.getState().setStatus('idle');
        }
    };

    return (
        <div className="panel upload-panel">
            <h2>Audio Source</h2>

            <div className="upload-section">
                <input
                    type="file"
                    accept="audio/wav,audio/*"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={handleFileUpload}
                />
                <button className="upload-btn" onClick={() => fileInputRef.current?.click()}>
                    Select WAV File
                </button>
                {audioFile && <p className="file-name">{audioFile.name}</p>}
            </div>

            <div className="playback-section">
                <h3>Playback</h3>
                <button disabled={!audioFile} className="play-btn">Play / Pause</button>

                {audioFile && (
                    <div className="range-controls">
                        <label>In (s): <input type="number" value={inTime.toFixed(2)} onChange={(e) => setTimeRange(parseFloat(e.target.value), outTime)} step="0.1" /></label>
                        <label>Out (s): <input type="number" value={outTime.toFixed(2)} onChange={(e) => setTimeRange(inTime, parseFloat(e.target.value))} step="0.1" /></label>
                    </div>
                )}
            </div>
        </div>
    );
};
