import * as Mp4Muxer from 'mp4-muxer';

export class MP4Encoder {
    private muxer: import("mp4-muxer").Muxer<import("mp4-muxer").FileSystemWritableFileStreamTarget> | null = null;
    private videoEncoder: VideoEncoder | null = null;
    private encodingError: Error | null = null;

    public async init(width: number, height: number, fps: number): Promise<void> {
        this.encodingError = null;

        // Using ArrayBufferTarget for in-memory muxing
        let TargetTarget = new Mp4Muxer.ArrayBufferTarget();

        this.muxer = new Mp4Muxer.Muxer({
            target: TargetTarget,
            video: {
                codec: 'avc',
                width: width,
                height: height
            },
            fastStart: "in-memory"
        });

        this.videoEncoder = new VideoEncoder({
            output: (chunk, meta) => {
                try {
                    this.muxer?.addVideoChunk(chunk, meta);
                } catch (e: any) {
                    this.encodingError = e;
                }
            },
            error: (e) => {
                console.error("VideoEncoder error:", e);
                this.encodingError = e;
            }
        });

        this.videoEncoder.configure({
            codec: width >= 3840 ? 'avc1.4d0033' : 'avc1.4d002a', // Main profile, Level 5.1/4.2
            width,
            height,
            hardwareAcceleration: 'no-preference',
            bitrate: 10_000_000, // 10Mbps
            framerate: fps
        });
    }

    public async encodeFrame(canvas: OffscreenCanvas | HTMLCanvasElement, timestampMicros: number) {
        if (this.encodingError) throw this.encodingError;
        if (!this.videoEncoder) return;
        const frame = new VideoFrame(canvas, { timestamp: timestampMicros });
        const keyFrame = (timestampMicros % 1000000) === 0; // Keyframe roughly every second
        this.videoEncoder.encode(frame, { keyFrame });
        frame.close();
    }

    public async finish(): Promise<Uint8Array> {
        if (this.encodingError) throw this.encodingError;

        // flush() might reject or hang, so we track the promise
        if (this.videoEncoder) {
            await Promise.race([
                this.videoEncoder.flush(),
                new Promise((_, reject) => {
                    const checkInterval = setInterval(() => {
                        if (this.encodingError) {
                            clearInterval(checkInterval);
                            reject(this.encodingError);
                        }
                    }, 100);
                })
            ]);
        }

        if (this.encodingError) throw this.encodingError;

        this.muxer?.finalize();

        const target = (this.muxer as Exclude<typeof this.muxer, null>).target as import("mp4-muxer").ArrayBufferTarget;
        return new Uint8Array(target.buffer);
    }
}
