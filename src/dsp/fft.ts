/**
 * Cooley-Tukey radix-2 FFT / IFFT
 * In-place computation on interleaved real/imaginary arrays
 */

/**
 * Forward FFT (in-place)
 * @param real - real parts (length must be power of 2)
 * @param imag - imaginary parts (same length)
 */
export function fft(real: Float64Array, imag: Float64Array): void {
    const n = real.length;
    if (n <= 1) return;

    // Bit-reversal permutation
    bitReverse(real, imag, n);

    // Cooley-Tukey butterfly
    for (let size = 2; size <= n; size *= 2) {
        const halfSize = size / 2;
        const angle = -2 * Math.PI / size;

        for (let i = 0; i < n; i += size) {
            for (let j = 0; j < halfSize; j++) {
                const wr = Math.cos(angle * j);
                const wi = Math.sin(angle * j);

                const evenIdx = i + j;
                const oddIdx = i + j + halfSize;

                const tr = wr * real[oddIdx] - wi * imag[oddIdx];
                const ti = wr * imag[oddIdx] + wi * real[oddIdx];

                real[oddIdx] = real[evenIdx] - tr;
                imag[oddIdx] = imag[evenIdx] - ti;
                real[evenIdx] = real[evenIdx] + tr;
                imag[evenIdx] = imag[evenIdx] + ti;
            }
        }
    }
}

/**
 * Inverse FFT (in-place)
 */
export function ifft(real: Float64Array, imag: Float64Array): void {
    const n = real.length;

    // Conjugate
    for (let i = 0; i < n; i++) {
        imag[i] = -imag[i];
    }

    // Forward FFT
    fft(real, imag);

    // Conjugate and scale
    for (let i = 0; i < n; i++) {
        real[i] = real[i] / n;
        imag[i] = -imag[i] / n;
    }
}

function bitReverse(real: Float64Array, imag: Float64Array, n: number): void {
    let j = 0;
    for (let i = 0; i < n - 1; i++) {
        if (i < j) {
            // Swap real
            const tempR = real[i];
            real[i] = real[j];
            real[j] = tempR;
            // Swap imag
            const tempI = imag[i];
            imag[i] = imag[j];
            imag[j] = tempI;
        }
        let k = n >> 1;
        while (k <= j) {
            j -= k;
            k >>= 1;
        }
        j += k;
    }
}
