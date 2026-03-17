import { fft, createHannWindow, magnitude } from '../lib/dsp/stft';

export interface AnalysisInput {
    audioChannelData: Float32Array; // mono mixed
    sampleRate: number;
}

export interface AnalysisFrame {
    onsetStrength: number;
    spectralFlux: number;
    spectralFlatness: number;
    textureIndex: number;
}

export interface AnalysisResult {
    frames: AnalysisFrame[];
    orderEstimated: number;
    turbulenceEstimated: number;
}

self.onmessage = (e: MessageEvent<AnalysisInput>) => {
    const { audioChannelData, sampleRate } = e.data;
    const fftSize = 2048;
    const hopSize = fftSize / 4; // 512
    const hannWindow = createHannWindow(fftSize);

    const numFrames = Math.floor((audioChannelData.length - fftSize) / hopSize) + 1;
    const frames: AnalysisFrame[] = [];

    let prevMag = new Float32Array(fftSize / 2);

    let flatSum = 0;
    let fluxSum = 0;
    let onsetCount = 0;
    let textureSum = 0;

    class RingBuffer {
        buffer: number[];
        idx: number;
        constructor(size: number) { this.buffer = new Array(size).fill(0); this.idx = 0; }
        push(val: number) { this.buffer[this.idx] = val; this.idx = (this.idx + 1) % this.buffer.length; }
        variance() {
            const mean = this.buffer.reduce((a, b) => a + b, 0) / this.buffer.length;
            return this.buffer.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / this.buffer.length;
        }
    }

    const recentFlux = new RingBuffer(20);

    for (let i = 0; i < numFrames; i++) {
        const start = i * hopSize;
        const real = new Float32Array(fftSize);
        const imag = new Float32Array(fftSize);

        // Apply window
        for (let j = 0; j < fftSize; j++) {
            real[j] = audioChannelData[start + j] * hannWindow[j];
            imag[j] = 0;
        }

        // Process FFT
        fft(real, imag);
        const mag = magnitude(real, imag);

        // Calculate features
        let flux = 0;
        let sumMag = 0;
        let sumLogMag = 0;

        for (let k = 0; k < mag.length; k++) {
            const diff = mag[k] - prevMag[k];
            if (diff > 0) flux += diff;
            sumMag += mag[k];
            sumLogMag += Math.log(Math.max(mag[k], 1e-10));
        }

        // Spectral Flatness: geometric mean / arithmetic mean
        const arithMean = sumMag / mag.length;
        const geomMean = Math.exp(sumLogMag / mag.length);
        const flatness = arithMean === 0 ? 0 : geomMean / arithMean;

        // Texture variation over short time (variance of flux locally)
        recentFlux.push(flux);
        const texture = recentFlux.variance();

        // Onset strength (simple peak picking can be done later, here we just use flux spike)
        const onsetStrength = Math.max(0, flux - prevMag.reduce((a, b) => a + b, 0) / mag.length * 1.5);

        frames.push({
            onsetStrength,
            spectralFlux: flux,
            spectralFlatness: flatness,
            textureIndex: texture
        });

        flatSum += flatness;
        fluxSum += flux;
        if (onsetStrength > 10) onsetCount++; // Heuristic threshold
        textureSum += texture;

        prevMag = new Float32Array(mag);

        // Report progress periodically
        if (i % 100 === 0) {
            self.postMessage({ progress: i / numFrames });
        }
    }

    const flatnessMean = flatSum / numFrames;
    const fluxMean = fluxSum / numFrames;
    const onsetDensity = onsetCount / (numFrames * hopSize / sampleRate); // onsets per second
    const textureMean = textureSum / numFrames;

    // Estimate Order & Turbulence (heuristic mappings to 0..1 scale)
    // High order: clear periodic onsets, low noise (flatness)
    const orderEstimated = Math.min(1.0, Math.max(0.0, 1.0 - (flatnessMean * 5.0) + (onsetDensity * 0.05)));

    // High turbulence: high flux variance, continuous high frequency chaos
    const turbulenceEstimated = Math.min(1.0, Math.max(0.0, (textureMean * 0.1) + (fluxMean * 0.05)));

    const result: AnalysisResult = {
        frames,
        orderEstimated,
        turbulenceEstimated
    };

    self.postMessage({ result });
};
