/**
 * Frequency Shift - 周波数シフト (Mode A: Hz単位平行移動)
 * 帯域抽出後のスペクトログラムに対してbin移動
 */

import type { STFTResult } from './stft';

/**
 * Mode A: 周波数シフト（Hz単位の平行移動）
 * 帯域内のbinを shiftHz に相当する deltaK 分移動
 * 
 * @param stftResult - STFT結果（in-placeで変更される）
 * @param shiftHz - シフト量 (Hz)。正=上方向、負=下方向
 * @param sampleRate - サンプルレート (Hz)
 */
export function applyFrequencyShift(
    stftResult: STFTResult,
    shiftHz: number,
    sampleRate: number
): void {
    const { real, imag, numFrames, fftSize } = stftResult;
    const binResolution = sampleRate / fftSize;
    const deltaK = Math.round(shiftHz / binResolution);
    const nyquistBin = fftSize / 2;

    if (deltaK === 0) return;

    for (let frame = 0; frame < numFrames; frame++) {
        const newReal = new Float64Array(fftSize);
        const newImag = new Float64Array(fftSize);

        // Shift positive frequency bins
        for (let k = 0; k <= nyquistBin; k++) {
            const newK = k + deltaK;

            // Only keep if within valid range
            if (newK >= 0 && newK <= nyquistBin) {
                newReal[newK] = real[frame][k];
                newImag[newK] = imag[frame][k];

                // Mirror for conjugate symmetry (negative frequencies)
                if (newK > 0 && newK < nyquistBin) {
                    newReal[fftSize - newK] = real[frame][k];
                    newImag[fftSize - newK] = -imag[frame][k];
                }
            }
            // Bins outside range are discarded (newReal/newImag initialized to 0)
        }

        // Replace frame data
        real[frame].set(newReal);
        imag[frame].set(newImag);
    }
}
