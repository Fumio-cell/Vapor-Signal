/**
 * DSP Web Worker
 * メインスレッドから音声データを受け取り、STFT→マスク/シフト→iSTFT処理
 * Transferableオブジェクトで効率的なデータ転送
 */

import { stft } from '../dsp/stft';
import { istft } from '../dsp/istft';
import { applyBandMask } from '../dsp/bandMask';
import { applyFrequencyShift } from '../dsp/frequencyShift';
import { retuneSignal } from '../dsp/pitchRetune';
import type { DspParams } from '../types/types';

// Worker message handler
self.onmessage = function (e: MessageEvent) {
    const { type, channelData, sampleRate, params } = e.data as {
        type: string;
        channelData: Float32Array[];
        sampleRate: number;
        params: DspParams;
    };

    try {
        switch (type) {
            case 'analyze':
                handleAnalyze(channelData, sampleRate, params);
                break;
            case 'bandExport':
                handleBandExport(channelData, sampleRate, params);
                break;
            case 'shiftExport':
                handleShiftExport(channelData, sampleRate, params);
                break;
            case 'retuneExport':
                handleRetuneExport(channelData, sampleRate, params);
                break;
            default:
                self.postMessage({ type: 'error', message: `Unknown message type: ${type}` });
        }
    } catch (error) {
        self.postMessage({
            type: 'error',
            message: error instanceof Error ? error.message : String(error),
        });
    }
};

function handleAnalyze(
    channelData: Float32Array[],
    sampleRate: number,
    params: DspParams
) {
    self.postMessage({ type: 'progress', value: 10 });

    const { fftSize } = params;
    const hopSize = fftSize / 4;

    // Use first channel for analysis
    const signal = channelData[0];
    const stftResult = stft(signal, fftSize, hopSize);

    self.postMessage({ type: 'progress', value: 60 });

    // Compute magnitude spectrogram for visualization
    const numBins = fftSize / 2 + 1;
    const numFrames = stftResult.numFrames;
    const spectrogramData = new Float64Array(numFrames * numBins);

    for (let frame = 0; frame < numFrames; frame++) {
        for (let k = 0; k < numBins; k++) {
            const re = stftResult.real[frame][k];
            const im = stftResult.imag[frame][k];
            const magnitude = Math.sqrt(re * re + im * im);
            spectrogramData[frame * numBins + k] = magnitude;
        }
    }

    self.postMessage({ type: 'progress', value: 90 });

    self.postMessage({
        type: 'analyzeResult',
        spectrogramData,
        fftSize,
        sampleRate,
        numFrames,
    });
}

function handleBandExport(
    channelData: Float32Array[],
    sampleRate: number,
    params: DspParams
) {
    const { fftSize, fLow, fHigh, timeStart, timeEnd } = params;
    const hopSize = fftSize / 4;
    const numChannels = channelData.length;
    const resultChannels: Float32Array[] = [];

    for (let ch = 0; ch < numChannels; ch++) {
        // Apply time selection
        let signal = channelData[ch];
        if (timeStart !== undefined && timeEnd !== undefined) {
            const startSample = Math.floor(timeStart * sampleRate);
            const endSample = Math.floor(timeEnd * sampleRate);
            signal = signal.slice(startSample, endSample);
        }

        self.postMessage({
            type: 'progress',
            value: Math.round((ch / numChannels) * 30),
        });

        // STFT
        const stftResult = stft(signal, fftSize, hopSize);

        self.postMessage({
            type: 'progress',
            value: Math.round(30 + (ch / numChannels) * 30),
        });

        // Apply band mask
        applyBandMask(stftResult, fLow, fHigh, sampleRate);

        self.postMessage({
            type: 'progress',
            value: Math.round(60 + (ch / numChannels) * 20),
        });

        // iSTFT
        const output = istft(stftResult, hopSize, signal.length);
        resultChannels.push(output);

        self.postMessage({
            type: 'progress',
            value: Math.round(80 + ((ch + 1) / numChannels) * 20),
        });
    }

    // Transfer the result back
    const transferables = resultChannels.map((ch) => ch.buffer);
    self.postMessage(
        {
            type: 'result',
            channelData: resultChannels,
            sampleRate,
        },
        transferables as any
    );
}

function handleShiftExport(
    channelData: Float32Array[],
    sampleRate: number,
    params: DspParams
) {
    const { fftSize, fLow, fHigh, shiftHz, timeStart, timeEnd } = params;
    const hopSize = fftSize / 4;
    const numChannels = channelData.length;
    const resultChannels: Float32Array[] = [];

    for (let ch = 0; ch < numChannels; ch++) {
        // Apply time selection
        let signal = channelData[ch];
        if (timeStart !== undefined && timeEnd !== undefined) {
            const startSample = Math.floor(timeStart * sampleRate);
            const endSample = Math.floor(timeEnd * sampleRate);
            signal = signal.slice(startSample, endSample);
        }

        self.postMessage({
            type: 'progress',
            value: Math.round((ch / numChannels) * 20),
        });

        // STFT
        const stftResult = stft(signal, fftSize, hopSize);

        self.postMessage({
            type: 'progress',
            value: Math.round(20 + (ch / numChannels) * 20),
        });

        // Apply band mask first
        applyBandMask(stftResult, fLow, fHigh, sampleRate);

        self.postMessage({
            type: 'progress',
            value: Math.round(40 + (ch / numChannels) * 20),
        });

        // Apply frequency shift
        applyFrequencyShift(stftResult, shiftHz, sampleRate);

        self.postMessage({
            type: 'progress',
            value: Math.round(60 + (ch / numChannels) * 20),
        });

        // iSTFT
        const output = istft(stftResult, hopSize, signal.length);
        resultChannels.push(output);

        self.postMessage({
            type: 'progress',
            value: Math.round(80 + ((ch + 1) / numChannels) * 20),
        });
    }

    const transferables = resultChannels.map((ch) => ch.buffer);
    self.postMessage(
        {
            type: 'result',
            channelData: resultChannels,
            sampleRate,
        },
        transferables as any
    );
}

function handleRetuneExport(
    channelData: Float32Array[],
    sampleRate: number,
    params: DspParams
) {
    const { sourcePitch = 440, targetPitch = 432, timeStart, timeEnd } = params;
    const numChannels = channelData.length;
    const resultChannels: Float32Array[] = [];

    for (let ch = 0; ch < numChannels; ch++) {
        // Apply time selection
        let signal = channelData[ch];
        if (timeStart !== undefined && timeEnd !== undefined) {
            const startSample = Math.floor(timeStart * sampleRate);
            const endSample = Math.floor(timeEnd * sampleRate);
            signal = signal.slice(startSample, endSample);
        }

        self.postMessage({
            type: 'progress',
            value: Math.round((ch / numChannels) * 30),
        });

        // Direct resampling (no STFT needed - much faster and no phase issues)
        const output = retuneSignal(signal, sourcePitch, targetPitch);
        resultChannels.push(output);

        self.postMessage({
            type: 'progress',
            value: Math.round(30 + ((ch + 1) / numChannels) * 70),
        });
    }

    const transferables = resultChannels.map((ch) => ch.buffer);
    self.postMessage(
        {
            type: 'result',
            channelData: resultChannels,
            sampleRate,
        },
        transferables as any
    );
}

