/**
 * Pitch Retune - 基準ピッチ変換（リサンプリング方式）
 * 
 * 440Hz → 432Hz/444Hz等への変換。
 * 
 * 原理: 時間軸をリサンプリング（伸縮）して周波数を変更する。
 * ratio = targetPitch / sourcePitch でリサンプルし、
 * 元の長さにトリミングすることでピッチを変更。
 * 
 * 例: 440→432Hz (ratio=0.9818)
 * → 信号を 1/0.9818 = 1.0185倍の速さで読み取る
 * → 全周波数が0.9818倍になる
 */

import type { STFTResult } from './stft';

/**
 * 比率ベースのピッチリチューニング（リサンプリング方式）
 * 
 * 時間領域の信号を比率に基づいてリサンプリングする。
 * STFTインターフェースに適合させるため、入力はFloat32Arrayを直接処理。
 * 
 * @param signal - 入力信号
 * @param sourcePitch - 元の基準ピッチ (Hz)、例: 440
 * @param targetPitch - 変換先の基準ピッチ (Hz)、例: 432
 * @returns リチューニングされた信号（同じ長さ）
 */
export function retuneSignal(
  signal: Float32Array,
  sourcePitch: number,
  targetPitch: number
): Float32Array {
  const ratio = targetPitch / sourcePitch;

  if (Math.abs(ratio - 1.0) < 1e-10) {
    return new Float32Array(signal); // No change
  }

  const outputLength = signal.length;
  const output = new Float32Array(outputLength);

  // To shift pitch by ratio, we need to resample at rate = ratio
  // When ratio < 1 (e.g., 432/440 = 0.9818): srcPos < i → reads behind → signal stretches → lower pitch ✓
  // When ratio > 1 (e.g., 444/440 = 1.0091): srcPos > i → reads ahead → signal compresses → higher pitch ✓
  //
  // Key insight: if we play back at rate R, perceived frequency = original_freq * R
  // We want perceived_freq = original_freq * ratio, so read at rate = ratio
  const resampleFactor = ratio;

  for (let i = 0; i < outputLength; i++) {
    const srcPos = i * resampleFactor;
    const srcFloor = Math.floor(srcPos);
    const frac = srcPos - srcFloor;

    if (srcFloor + 1 < signal.length) {
      // Linear interpolation
      output[i] = signal[srcFloor] * (1 - frac) + signal[srcFloor + 1] * frac;
    } else if (srcFloor < signal.length) {
      output[i] = signal[srcFloor] * (1 - frac);
    } else {
      output[i] = 0; // Beyond input
    }
  }

  return output;
}

/**
 * STFT互換インターフェース（後方互換用）
 * 実際にはSTFT/iSTFTパイプラインを経由せず、
 * 直接時間領域でリサンプリングする。
 */
export function applyPitchRetune(
  stftResult: STFTResult,
  _sourcePitch: number,
  _targetPitch: number,
  _sampleRate: number
): void {
  // STFTベースの周波数シフトは位相問題があるため、
  // 実際のリチューニングは retuneSignal() を直接使用する。
  // このAPIは後方互換のみ（no-op）
  void stftResult;
}
