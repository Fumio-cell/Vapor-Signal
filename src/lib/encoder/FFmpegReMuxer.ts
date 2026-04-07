import { FFmpeg } from '@ffmpeg/ffmpeg';
import coreURL from '@ffmpeg/core?url';
import wasmURL from '@ffmpeg/core/wasm?url';

let ffmpegInstance: FFmpeg | null = null;

export async function getFFmpeg(): Promise<FFmpeg> {
    if (!ffmpegInstance) {
        ffmpegInstance = new FFmpeg();
        
        // Add logging to help diagnose issues
        ffmpegInstance.on('log', ({ message }) => {
            console.debug('[FFmpeg]', message);
        });

        try {
            await ffmpegInstance.load({
                coreURL,
                wasmURL,
            });
        } catch (err: any) {
            const errorMsg = err?.message || "Unknown error (likely browser security related)";
            console.error("FFmpeg Load Error:", err);
            throw new Error(`Failed to load FFmpeg core: ${errorMsg}. This usually happens due to missing COOP/COEP headers or network issues.`);
        }
    }
    return ffmpegInstance;
}

export async function remuxMp4ToMov(mp4Data: Uint8Array): Promise<Uint8Array> {
    const ffmpeg = await getFFmpeg();

    try {
        await ffmpeg.writeFile('input.mp4', mp4Data);
        
        // Re-mux without re-encoding to MOV container
        const exitCode = await ffmpeg.exec(['-i', 'input.mp4', '-c', 'copy', '-f', 'mov', 'output.mov']);
        
        if (exitCode !== 0) {
            throw new Error(`FFmpeg remuxing failed with exit code ${exitCode}. Check console for details.`);
        }

        const movData = await ffmpeg.readFile('output.mov');
        
        // Clean up virtual filesystem
        await ffmpeg.deleteFile('input.mp4');
        await ffmpeg.deleteFile('output.mov');

        return new Uint8Array(movData as Uint8Array);
    } catch (err: any) {
        console.error("MOV Remux Error:", err);
        throw err;
    }
}
