/**
 * AIFF → WAV フォールバック変換
 * ffmpeg.wasm を遅延ロードして変換
 */

// ffmpeg.wasm の型（遅延ロード）
let ffmpegInstance: any = null;
let ffmpegLoaded = false;

async function loadFFmpeg(onProgress?: (progress: number) => void): Promise<any> {
    if (ffmpegInstance && ffmpegLoaded) {
        return ffmpegInstance;
    }

    try {
        // Dynamic import for lazy loading
        const { FFmpeg } = await import('@ffmpeg/ffmpeg');
        const { toBlobURL } = await import('@ffmpeg/util');

        const ffmpeg = new FFmpeg();

        ffmpeg.on('progress', ({ progress }: { progress: number }) => {
            onProgress?.(progress);
        });

        // Load ffmpeg core from CDN
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
        await ffmpeg.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });

        ffmpegInstance = ffmpeg;
        ffmpegLoaded = true;
        return ffmpeg;
    } catch (error) {
        throw new Error(
            `ffmpeg.wasm のロードに失敗しました: ${error instanceof Error ? error.message : String(error)}`
        );
    }
}

/**
 * AIFF ファイルを WAV Blob に変換
 */
export async function convertAiffToWav(
    file: File,
    onProgress?: (progress: number) => void
): Promise<Blob> {
    const ffmpeg = await loadFFmpeg(onProgress);

    // Write input file to virtual FS
    const inputData = new Uint8Array(await file.arrayBuffer());
    await ffmpeg.writeFile('input.aiff', inputData);

    // Convert AIFF to WAV
    await ffmpeg.exec(['-i', 'input.aiff', '-f', 'wav', '-acodec', 'pcm_s16le', 'output.wav']);

    // Read output file
    const outputData = await ffmpeg.readFile('output.wav');

    // Clean up virtual FS
    await ffmpeg.deleteFile('input.aiff');
    await ffmpeg.deleteFile('output.wav');

    return new Blob([outputData], { type: 'audio/wav' });
}
