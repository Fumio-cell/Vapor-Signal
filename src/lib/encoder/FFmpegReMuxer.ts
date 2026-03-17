import { FFmpeg } from '@ffmpeg/ffmpeg';

let ffmpegInstance: FFmpeg | null = null;

export async function getFFmpeg(): Promise<FFmpeg> {
    if (!ffmpegInstance) {
        ffmpegInstance = new FFmpeg();
        await ffmpegInstance.load({
            coreURL: await (await fetch('https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js')).blob()
                .then(blob => URL.createObjectURL(blob)),
            wasmURL: await (await fetch('https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm')).blob()
                .then(blob => URL.createObjectURL(blob))
        });
    }
    return ffmpegInstance;
}

export async function remuxMp4ToMov(mp4Data: Uint8Array): Promise<Uint8Array> {
    const ffmpeg = await getFFmpeg();

    await ffmpeg.writeFile('input.mp4', mp4Data);
    // Re-mux without re-encoding to MOV container
    await ffmpeg.exec(['-i', 'input.mp4', '-c', 'copy', '-f', 'mov', 'output.mov']);

    const movData = await ffmpeg.readFile('output.mov');
    return new Uint8Array(movData as Uint8Array);
}
