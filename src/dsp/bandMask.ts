/**
 * Band Mask - 帯域抽出
 * 指定周波数帯域外のbinをゼロにするマスク処理
 */

import type { STFTResult } from './stft';

/**
 * 帯域マスクの適用（in-place）
 * 指定帯域 [fLow, fHigh] 外のbinをゼロに
 * 
 * @param stftResult - STFT結果（in-placeで変更される）
 * @param fLow - 下限周波数 (Hz)
 * @param fHigh - 上限周波数 (Hz)
 * @param sampleRate - サンプルレート (Hz)
 */
export function applyBandMask(
    stftResult: STFTResult,
    fLow: number,
    fHigh: number,
    sampleRate: number
): void {
    const { real, imag, numFrames, fftSize } = stftResult;
    const binResolution = sampleRate / fftSize;

    // Bin indices for the band
    const binLow = Math.floor(fLow / binResolution);
    const binHigh = Math.ceil(fHigh / binResolution);
    const nyquistBin = fftSize / 2;

    for (let frame = 0; frame < numFrames; frame++) {
        for (let k = 0; k <= nyquistBin; k++) {
            if (k < binLow || k > binHigh) {
                // Zero out bins outside the band
                real[frame][k] = 0;
                imag[frame][k] = 0;
                // Mirror (conjugate symmetry)
                if (k > 0 && k < nyquistBin) {
                    real[frame][fftSize - k] = 0;
                    imag[frame][fftSize - k] = 0;
                }
            }
        }
    }
}

/**
 * bin index → Hz 変換
 */
export function binToHz(bin: number, sampleRate: number, fftSize: number): number {
    return bin * sampleRate / fftSize;
}

/**
 * Hz → bin index 変換
 */
export function hzToBin(hz: number, sampleRate: number, fftSize: number): number {
    return hz * fftSize / sampleRate;
}
