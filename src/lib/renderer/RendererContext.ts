import { MIST_COMPUTE_VERTEX, MIST_COMPUTE_FRAGMENT, RENDER_VERTEX, RENDER_FRAGMENT } from './shaders/mist';
import { mat4 } from 'gl-matrix';
import { mulberry32 } from './prng';
import { RecipeSettings } from '../../store/useAppStore';

export class RendererContext {
    private gl: WebGL2RenderingContext;
    private particleCount: number = 300000;
    private texWidth: number;
    private texHeight: number;

    private computeProgram!: WebGLProgram;
    private renderProgram!: WebGLProgram;

    private fboA!: WebGLFramebuffer;
    private fboB!: WebGLFramebuffer;
    private texPosA!: WebGLTexture;
    private texPosB!: WebGLTexture;
    private texVelA!: WebGLTexture;
    private texVelB!: WebGLTexture;

    private quadVao!: WebGLVertexArrayObject;
    private pointsVao!: WebGLVertexArrayObject;

    private readFbo: WebGLFramebuffer;
    private writeFbo: WebGLFramebuffer;

    private time: number = 0;

    constructor(canvas: HTMLCanvasElement | OffscreenCanvas, particleCount: number = 300000) {
        const gl = canvas.getContext('webgl2', { antialias: false, preserveDrawingBuffer: true }) as WebGL2RenderingContext;
        if (!gl) {
            // Check if even WebGL 1 is supported as a hint
            const gl1 = canvas.getContext('webgl') || canvas.getContext('experimental-webgl' as any);
            if (gl1) {
                throw new Error("WebGL 2 is explicitly not supported by your browser/device, but WebGL 1 is. Hardware acceleration might be disabled in Chrome settings, or your GPU drivers might be blocklisted.");
            } else {
                throw new Error("No WebGL support detected at all. Please ensure Hardware Acceleration is enabled in your Chrome settings.");
            }
        }

        // We need float texture support for GPGPU
        const ext = gl.getExtension('EXT_color_buffer_float');
        if (!ext) {
            throw new Error(`WebGL 2 context created successfully, but 'EXT_color_buffer_float' extension is missing. This is required for fluid simulation. This often happens on Apple Silicon Macs or certain GPUs if hardware acceleration is partially disabled or unsupported.`);
        }

        this.gl = gl;
        this.particleCount = particleCount;
        const side = Math.ceil(Math.sqrt(this.particleCount));
        this.texWidth = side;
        this.texHeight = side;

        this.particleCount = this.texWidth * this.texHeight; // Adjust to exact power for texture mapping

        this.initShaders();
        this.initBuffers();

        this.readFbo = this.fboA;
        this.writeFbo = this.fboB;
    }

    private compileShader(type: number, source: string): WebGLShader {
        const shader = this.gl.createShader(type)!;
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error(this.gl.getShaderInfoLog(shader));
            throw new Error(`Shader compile error: ${this.gl.getShaderInfoLog(shader)}`);
        }
        return shader;
    }

    private createProgram(vsSource: string, fsSource: string): WebGLProgram {
        const prog = this.gl.createProgram()!;
        this.gl.attachShader(prog, this.compileShader(this.gl.VERTEX_SHADER, vsSource));
        this.gl.attachShader(prog, this.compileShader(this.gl.FRAGMENT_SHADER, fsSource));
        this.gl.linkProgram(prog);
        if (!this.gl.getProgramParameter(prog, this.gl.LINK_STATUS)) {
            throw new Error(`Program link error: ${this.gl.getProgramInfoLog(prog)}`);
        }
        return prog;
    }

    private initShaders() {
        this.computeProgram = this.createProgram(MIST_COMPUTE_VERTEX, MIST_COMPUTE_FRAGMENT);
        this.renderProgram = this.createProgram(RENDER_VERTEX, RENDER_FRAGMENT);
    }

    private createTexture(data: Float32Array): WebGLTexture {
        const tex = this.gl.createTexture()!;
        this.gl.bindTexture(this.gl.TEXTURE_2D, tex);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA32F, this.texWidth, this.texHeight, 0, this.gl.RGBA, this.gl.FLOAT, data);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        return tex;
    }

    private initBuffers() {
        const initialPos = new Float32Array(this.particleCount * 4);
        const initialVel = new Float32Array(this.particleCount * 4);

        const prng = mulberry32(12345); // default seed initialization
        for (let i = 0; i < this.particleCount; i++) {
            // x,y = position (-1 to 1), z = info, w = age
            initialPos[i * 4 + 0] = prng() * 2.0 - 1.0;
            initialPos[i * 4 + 1] = prng() * 2.0 - 1.0;
            initialPos[i * 4 + 2] = prng() * 2.0 - 1.0;
            initialPos[i * 4 + 3] = prng(); // Initial age/alpha

            initialVel[i * 4 + 0] = 0;
            initialVel[i * 4 + 1] = 0;
            initialVel[i * 4 + 2] = 0;
            initialVel[i * 4 + 3] = 0;
        }

        this.texPosA = this.createTexture(initialPos);
        this.texPosB = this.createTexture(initialPos);
        this.texVelA = this.createTexture(initialVel);
        this.texVelB = this.createTexture(initialVel);

        // Framebuffers
        this.fboA = this.gl.createFramebuffer()!;
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fboA);
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.texPosA, 0);
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT1, this.gl.TEXTURE_2D, this.texVelA, 0);
        this.gl.drawBuffers([this.gl.COLOR_ATTACHMENT0, this.gl.COLOR_ATTACHMENT1]);

        this.fboB = this.gl.createFramebuffer()!;
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fboB);
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.texPosB, 0);
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT1, this.gl.TEXTURE_2D, this.texVelB, 0);
        this.gl.drawBuffers([this.gl.COLOR_ATTACHMENT0, this.gl.COLOR_ATTACHMENT1]);

        // Quad for GPGPU Compute
        this.quadVao = this.gl.createVertexArray()!;
        this.gl.bindVertexArray(this.quadVao);
        const quadBuffer = this.gl.createBuffer()!;
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, quadBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([
            -1, -1, 1, -1, -1, 1,
            -1, 1, 1, -1, 1, 1
        ]), this.gl.STATIC_DRAW);
        const posLoc = this.gl.getAttribLocation(this.computeProgram, 'position');
        this.gl.enableVertexAttribArray(posLoc);
        this.gl.vertexAttribPointer(posLoc, 2, this.gl.FLOAT, false, 0, 0);

        // Points for Rendering
        this.pointsVao = this.gl.createVertexArray()!;
        this.gl.bindVertexArray(this.pointsVao);
        const idxBuffer = this.gl.createBuffer()!;
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, idxBuffer);
        const indices = new Float32Array(this.particleCount * 2);
        for (let i = 0; i < this.particleCount; i++) {
            indices[i * 2 + 0] = (i % this.texWidth) / this.texWidth;
            indices[i * 2 + 1] = Math.floor(i / this.texWidth) / this.texHeight;
        }
        this.gl.bufferData(this.gl.ARRAY_BUFFER, indices, this.gl.STATIC_DRAW);
        const renPosLoc = this.gl.getAttribLocation(this.renderProgram, 'position');
        this.gl.enableVertexAttribArray(renPosLoc);
        this.gl.vertexAttribPointer(renPosLoc, 2, this.gl.FLOAT, false, 0, 0);

        this.gl.bindVertexArray(null);
    }

    public resetSeed(seed: number) {
        const initialPos = new Float32Array(this.particleCount * 4);
        const initialVel = new Float32Array(this.particleCount * 4);
        const prng = mulberry32(seed);
        for (let i = 0; i < this.particleCount; i++) {
            initialPos[i * 4 + 0] = prng() * 2.0 - 1.0;
            initialPos[i * 4 + 1] = prng() * 2.0 - 1.0;
            initialPos[i * 4 + 2] = prng() * 2.0 - 1.0;
            initialPos[i * 4 + 3] = prng();
        }
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texPosA);
        this.gl.texSubImage2D(this.gl.TEXTURE_2D, 0, 0, 0, this.texWidth, this.texHeight, this.gl.RGBA, this.gl.FLOAT, initialPos);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texPosB);
        this.gl.texSubImage2D(this.gl.TEXTURE_2D, 0, 0, 0, this.texWidth, this.texHeight, this.gl.RGBA, this.gl.FLOAT, initialPos);

        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texVelA);
        this.gl.texSubImage2D(this.gl.TEXTURE_2D, 0, 0, 0, this.texWidth, this.texHeight, this.gl.RGBA, this.gl.FLOAT, initialVel);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texVelB);
        this.gl.texSubImage2D(this.gl.TEXTURE_2D, 0, 0, 0, this.texWidth, this.texHeight, this.gl.RGBA, this.gl.FLOAT, initialVel);

        this.time = 0;
    }

    public renderFrame(
        deltaTime: number,
        recipe: RecipeSettings,
        analysis: { order: number, turbulence: number, spectralFlux: number }
    ) {
        this.time += deltaTime;

        // --- COMPUTE PASS ---
        this.gl.useProgram(this.computeProgram);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.writeFbo);
        this.gl.viewport(0, 0, this.texWidth, this.texHeight);

        const posTex = this.readFbo === this.fboA ? this.texPosA : this.texPosB;
        const velTex = this.readFbo === this.fboA ? this.texVelA : this.texVelB;

        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, posTex);
        this.gl.uniform1i(this.gl.getUniformLocation(this.computeProgram, 'uPositions'), 0);

        this.gl.activeTexture(this.gl.TEXTURE1);
        this.gl.bindTexture(this.gl.TEXTURE_2D, velTex);
        this.gl.uniform1i(this.gl.getUniformLocation(this.computeProgram, 'uVelocities'), 1);

        this.gl.uniform1f(this.gl.getUniformLocation(this.computeProgram, 'uTime'), this.time);
        this.gl.uniform1f(this.gl.getUniformLocation(this.computeProgram, 'uDeltaTime'), deltaTime);
        this.gl.uniform1f(this.gl.getUniformLocation(this.computeProgram, 'uSeed'), recipe.seed);
        this.gl.uniform1f(this.gl.getUniformLocation(this.computeProgram, 'uDirection'), recipe.direction * Math.PI / 180.0);
        this.gl.uniform1f(this.gl.getUniformLocation(this.computeProgram, 'uSpread'), recipe.spread);
        this.gl.uniform1f(this.gl.getUniformLocation(this.computeProgram, 'uSpeed'), recipe.speed);
        this.gl.uniform1f(this.gl.getUniformLocation(this.computeProgram, 'uBeatSensitivity'), recipe.beatSensitivity);

        this.gl.uniform1f(this.gl.getUniformLocation(this.computeProgram, 'uSpectralFlux'), analysis.spectralFlux);
        this.gl.uniform1f(this.gl.getUniformLocation(this.computeProgram, 'uTurbulence'), analysis.turbulence);
        this.gl.uniform1f(this.gl.getUniformLocation(this.computeProgram, 'uOrder'), analysis.order);

        this.gl.bindVertexArray(this.quadVao);
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);

        // --- RENDER PASS ---
        // Render to Canvas default framebuffer
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);

        // Clear
        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
        this.gl.clearColor(0.01, 0.01, 0.015, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        this.gl.useProgram(this.renderProgram);

        // 3D Matrix Math
        const projMatrix = mat4.create();
        mat4.perspective(projMatrix, 45 * Math.PI / 180, this.gl.canvas.width / this.gl.canvas.height, 0.1, 100.0);

        const viewMatrix = mat4.create();
        // Subtle camera rotation for 3D parallax
        const camX = Math.sin(this.time * 0.1) * recipe.cameraZ * 0.2;
        mat4.lookAt(viewMatrix, [camX, 0, recipe.cameraZ], [0, 0, 0], [0, 1, 0]);

        this.gl.uniformMatrix4fv(this.gl.getUniformLocation(this.renderProgram, 'uProjectionMatrix'), false, projMatrix);
        this.gl.uniformMatrix4fv(this.gl.getUniformLocation(this.renderProgram, 'uViewMatrix'), false, viewMatrix);

        this.gl.uniform1f(this.gl.getUniformLocation(this.renderProgram, 'uFocusDistance'), recipe.focusDistance);
        this.gl.uniform1f(this.gl.getUniformLocation(this.renderProgram, 'uFocalRange'), recipe.focalRange);
        this.gl.uniform1f(this.gl.getUniformLocation(this.renderProgram, 'uBlurStrength'), recipe.blurStrength);

        const resolutionScale = this.gl.canvas.height / 1080.0;
        this.gl.uniform1f(this.gl.getUniformLocation(this.renderProgram, 'uResolutionScale'), resolutionScale);

        // Use the newly written positions for rendering
        const newPosTex = this.writeFbo === this.fboA ? this.texPosA : this.texPosB;
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, newPosTex);
        this.gl.uniform1i(this.gl.getUniformLocation(this.renderProgram, 'uPositions'), 0);

        this.gl.uniform1f(this.gl.getUniformLocation(this.renderProgram, 'uDensity'), recipe.density);
        this.gl.uniform1f(this.gl.getUniformLocation(this.renderProgram, 'uFineness'), recipe.fineness);

        // Additive Blending for glow
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE); // Additive blending

        if (recipe.showMist) {
            this.gl.bindVertexArray(this.pointsVao);
            this.gl.drawArrays(this.gl.POINTS, 0, this.particleCount);
        }

        this.gl.disable(this.gl.BLEND);

        // PING PONG
        this.readFbo = this.readFbo === this.fboA ? this.fboB : this.fboA;
        this.writeFbo = this.writeFbo === this.fboA ? this.fboB : this.fboA;
    }
}
