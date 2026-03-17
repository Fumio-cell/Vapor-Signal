/**
 * Inverse Short-Time Fourier Transform (iSTFT)
 * IFFT → 窓関数 → Overlap-Add
 */

import { ifft } from './fft';
import { createHannWindow } from './stft';
import type { STFTResult } from './stft';

/**
 * iSTFT: 複素スペクトログラムから時間信号を再構成
 * @param stftResult - STFT結果
 * @param hopSize - ホップサイズ
 * @param outputLength - 出力信号長
 * @returns 再構成された信号
 */
export function istft(
    stftResult: STFTResult,
    hopSize: number,
    outputLength: number
): Float32Array {
    const { real, imag, numFrames, fftSize } = stftResult;
    const window = createHannWindow(fftSize);

    const output = new Float64Array(outputLength);
    const windowSum = new Float64Array(outputLength);

    for (let frame = 0; frame < numFrames; frame++) {
        // Clone arrays for IFFT (in-place modification)
        const realCopy = new Float64Array(real[frame]);
        const imagCopy = new Float64Array(imag[frame]);

        // IFFT
        ifft(realCopy, imagCopy);

        // Overlap-Add with synthesis window
        const start = frame * hopSize;
        for (let i = 0; i < fftSize; i++) {
            if (start + i < outputLength) {
                output[start + i] += realCopy[i] * window[i];
                windowSum[start + i] += window[i] * window[i];
            }
        }
    }

    // Normalize by window sum (avoid division by zero)
    const result = new Float32Array(outputLength);
    for (let i = 0; i < outputLength; i++) {
        if (windowSum[i] > 1e-8) {
            result[i] = output[i] / windowSum[i];
        } else {
            result[i] = 0;
        }
    }

    return result;
}
