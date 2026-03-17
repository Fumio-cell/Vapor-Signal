/**
 * Audio file decoder
 * WAV対応（必須）、AIFF対応（フォールバック）
 */

import { convertAiffToWav } from './aiffFallback';

// AudioContext singleton for decoding
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
    if (!audioCtx) {
        audioCtx = new AudioContext();
    }
    return audioCtx;
}

/**
 * ファイルをAudioBufferにデコード
 * デコード失敗時、AIFF拡張子なら ffmpeg.wasm でWAV変換して再デコード
 */
export async function decodeAudioFile(
    file: File,
    onProgress?: (msg: string) => void
): Promise<AudioBuffer> {
    const ctx = getAudioContext();

    try {
        onProgress?.('音声ファイルを読み込み中...');
        const arrayBuffer = await file.arrayBuffer();
        onProgress?.('デコード中...');
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
        return audioBuffer;
    } catch (firstError) {
        // Check if it's an AIFF file that we can try to convert
        const ext = getFileExtension(file.name);
        if (ext === 'aiff' || ext === 'aif') {
            onProgress?.('AIFFデコードに失敗。WAVに変換中...');
            try {
                const wavBlob = await convertAiffToWav(file, (progress) => {
                    onProgress?.(`AIFF→WAV変換中... ${Math.round(progress * 100)}%`);
                });
                const wavArrayBuffer = await wavBlob.arrayBuffer();
                onProgress?.('変換されたWAVをデコード中...');
                const audioBuffer = await ctx.decodeAudioData(wavArrayBuffer);
                return audioBuffer;
            } catch (convertError) {
                throw new Error(
                    `AIFFファイルの変換に失敗しました: ${convertError instanceof Error ? convertError.message : String(convertError)}`
                );
            }
        }

        throw new Error(
            `音声ファイルのデコードに失敗しました: ${firstError instanceof Error ? firstError.message : String(firstError)}`
        );
    }
}

function getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() ?? '';
}

/**
 * AudioBuffer のチャンネルデータを Float32Array[] として取得
 */
export function getChannelData(buffer: AudioBuffer): Float32Array[] {
    const channels: Float32Array[] = [];
    for (let i = 0; i < buffer.numberOfChannels; i++) {
        channels.push(buffer.getChannelData(i));
    }
    return channels;
}
