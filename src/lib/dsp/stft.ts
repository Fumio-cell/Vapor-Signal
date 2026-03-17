// A simple Radix-2 FFT implementation
export function fft(real: Float32Array, imag: Float32Array): void {
    const n = real.length;
    if ((n & (n - 1)) !== 0) throw new Error("FFT size must be a power of 2");

    // Bit-reversal permutation
    let j = 0;
    for (let i = 0; i < n - 1; i++) {
        if (i < j) {
            const tr = real[i];
            const ti = imag[i];
            real[i] = real[j];
            imag[i] = imag[j];
            real[j] = tr;
            imag[j] = ti;
        }
        let m = n >> 1;
        while (j >= m) {
            j -= m;
            m >>= 1;
        }
        j += m;
    }

    // Cooley-Tukey decimation-in-time
    for (let size = 2; size <= n; size <<= 1) {
        const halfSize = size >> 1;
        // We could precompute sine/cosine tables for speed, but this is simple enough
        const theta = -2 * Math.PI / size;
        const wpReal = Math.cos(theta);
        const wpImag = Math.sin(theta);

        for (let i = 0; i < n; i += size) {
            let wReal = 1;
            let wImag = 0;
            for (let k = 0; k < halfSize; k++) {
                const evenIndex = i + k;
                const oddIndex = i + k + halfSize;
                const tReal = wReal * real[oddIndex] - wImag * imag[oddIndex];
                const tImag = wReal * imag[oddIndex] + wImag * real[oddIndex];

                real[oddIndex] = real[evenIndex] - tReal;
                imag[oddIndex] = imag[evenIndex] - tImag;
                real[evenIndex] += tReal;
                imag[evenIndex] += tImag;

                // Complex multiply to rotate w
                const nextWReal = wReal * wpReal - wImag * wpImag;
                const nextWImag = wReal * wpImag + wImag * wpReal;
                wReal = nextWReal;
                wImag = nextWImag;
            }
        }
    }
}

export function createHannWindow(size: number): Float32Array {
    const window = new Float32Array(size);
    for (let i = 0; i < size; i++) {
        window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)));
    }
    return window;
}

export function magnitude(real: Float32Array, imag: Float32Array): Float32Array {
    const mag = new Float32Array(real.length / 2); // Only need positive frequencies
    for (let i = 0; i < mag.length; i++) {
        mag[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
    }
    return mag;
}
