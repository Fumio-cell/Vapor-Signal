import { create } from 'zustand';

export type AppStatus = 'idle' | 'analyzing' | 'rendering' | 'encoding' | 'error';

export interface RecipeSettings {
    fineness: number;
    direction: number; // degrees
    spread: number;
    density: number;
    speed: number;
    seed: number;
    showMist: boolean;
    cameraZ: number;
    focusDistance: number;
    focalRange: number;
    blurStrength: number;
    orderUser?: number;
    turbulenceUser?: number;
}

interface AppState {
    status: AppStatus;
    progress: number;
    errorMessage: string | null;

    // Audio state
    audioFile: File | null;
    audioBuffer: AudioBuffer | null;
    inTime: number;
    outTime: number;

    // Analysis State
    orderEstimated: number;
    turbulenceEstimated: number;
    analysisFrames: any[];

    // Settings
    recipe: RecipeSettings;

    // Actions
    setStatus: (status: AppStatus, progress?: number, errorMessage?: string) => void;
    setAudio: (file: File | null, buffer: AudioBuffer | null) => void;
    setTimeRange: (inTime: number, outTime: number) => void;
    updateRecipe: (updates: Partial<RecipeSettings>) => void;
    setEstimates: (order: number, turbulence: number, frames: any[]) => void;
}

export const useAppStore = create<AppState>((set) => ({
    status: 'idle',
    progress: 0,
    errorMessage: null,

    audioFile: null,
    audioBuffer: null,
    inTime: 0,
    outTime: 0,

    orderEstimated: 0.5,
    turbulenceEstimated: 0.5,
    analysisFrames: [],

    recipe: {
        fineness: 0.5,
        direction: 0,
        spread: 0.5,
        density: 0.5,
        speed: 1.0,
        seed: 12345,
        showMist: true,
        cameraZ: 2.0,
        focusDistance: 2.0,
        focalRange: 0.5,
        blurStrength: 15.0,
    },

    setStatus: (status, progress = 0, errorMessage?: string) =>
        set({ status, progress, errorMessage: errorMessage || null }),

    setAudio: (audioFile, audioBuffer) =>
        set({ audioFile, audioBuffer, inTime: 0, outTime: audioBuffer ? audioBuffer.duration : 0 }),

    setTimeRange: (inTime, outTime) =>
        set({ inTime, outTime }),

    updateRecipe: (updates) =>
        set((state) => ({ recipe: { ...state.recipe, ...updates } })),

    setEstimates: (orderEstimated, turbulenceEstimated, analysisFrames) =>
        set({ orderEstimated, turbulenceEstimated, analysisFrames })
}));
