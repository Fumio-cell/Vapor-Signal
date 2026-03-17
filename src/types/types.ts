// ===== Audio State =====
export interface AudioState {
    buffer: AudioBuffer | null;
    fileName: string;
    loading: boolean;
    error: string | null;
}

// ===== Selection =====
export interface BandSelection {
    fLow: number;   // Hz
    fHigh: number;  // Hz
}

export interface TimeSelection {
    start: number;  // seconds
    end: number;    // seconds
}

// ===== DSP Parameters =====
export type FftSize = 2048 | 4096 | 8192;

export interface DspParams {
    fftSize: FftSize;
    fLow: number;
    fHigh: number;
    shiftHz: number;
    mode: ExportMode;
    timeStart?: number;
    timeEnd?: number;
    sourcePitch?: number;  // 元の基準ピッチ (Hz) e.g. 440
    targetPitch?: number;  // 変換先の基準ピッチ (Hz) e.g. 432
}

export type ExportMode = 'bandExport' | 'shiftExport' | 'retuneExport';

// ===== Worker Messages =====
export type WorkerRequestType = 'analyze' | 'bandExport' | 'shiftExport' | 'retuneExport';

export interface WorkerRequest {
    type: WorkerRequestType;
    channelData: Float32Array[];
    sampleRate: number;
    params: DspParams;
}

export interface WorkerProgressMessage {
    type: 'progress';
    value: number; // 0-100
}

export interface WorkerResultMessage {
    type: 'result';
    channelData: Float32Array[];
    sampleRate: number;
}

export interface WorkerAnalyzeResult {
    type: 'analyzeResult';
    magnitudes: Float64Array; // averaged magnitude spectrum for spectrogram
    fftSize: number;
    sampleRate: number;
    numFrames: number;
    // Spectrogram data: magnitude per frame per bin
    spectrogramData: Float64Array; // flattened [frame0_bin0, frame0_bin1, ..., frame1_bin0, ...]
}

export interface WorkerErrorMessage {
    type: 'error';
    message: string;
}

export type WorkerResponse =
    | WorkerProgressMessage
    | WorkerResultMessage
    | WorkerAnalyzeResult
    | WorkerErrorMessage;

// ===== Playback =====
export type PlaybackMode = 'original' | 'processed';

// ===== App State =====
export interface AppState {
    audio: AudioState;
    band: BandSelection;
    time: TimeSelection;
    dspParams: DspParams;
    exportMode: ExportMode;
    playbackMode: PlaybackMode;
    processing: boolean;
    progress: number;
    processedBuffer: AudioBuffer | null;
}
