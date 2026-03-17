/**
 * Short-Time Fourier Transform (STFT)
 * Hann窓 + Overlap-Add方式
 */

import { fft } from './fft';

export interface STFTResult {
    /** Real parts: [numFrames][fftSize] */
    real: Float64Array[];
    /** Imaginary parts: [numFrames][fftSize] */
    imag: Float64Array[];
    /** Number of frames */
    numFrames: number;
    /** FFT size used */
    fftSize: number;
}

/**
 * Hann窓の生成
 */
export function createHannWindow(size: number): Float64Array {
    const window = new Float64Array(size);
    for (let i = 0; i < size; i++) {
        window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)));
    }
    return window;
}

/**
 * STFT 実行
 * @param signal - 入力信号 (Float32Array)
 * @param fftSize - FFT サイズ (2の累乗)
 * @param hopSize - ホップサイズ (通常 fftSize/4)
 * @returns STFT結果
 */
export function stft(
    signal: Float32Array,
    fftSize: number,
    hopSize: number
): STFTResult {
    const window = createHannWindow(fftSize);
    const numFrames = Math.floor((signal.length - fftSize) / hopSize) + 1;

    const realFrames: Float64Array[] = [];
    const imagFrames: Float64Array[] = [];

    for (let frame = 0; frame < numFrames; frame++) {
        const start = frame * hopSize;
        const real = new Float64Array(fftSize);
        const imag = new Float64Array(fftSize);

        // Apply window
        for (let i = 0; i < fftSize; i++) {
            real[i] = (start + i < signal.length) ? signal[start + i] * window[i] : 0;
        }

        // FFT
        fft(real, imag);

        realFrames.push(real);
        imagFrames.push(imag);
    }

    return {
        real: realFrames,
        imag: imagFrames,
        numFrames,
        fftSize,
    };
}
