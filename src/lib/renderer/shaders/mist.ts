export const MIST_COMPUTE_VERTEX = `#version 300 es
in vec2 position;
out vec2 vUv;
void main() {
    vUv = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
}
`;

export const MIST_COMPUTE_FRAGMENT = `#version 300 es
precision highp float;

uniform sampler2D uPositions;
uniform sampler2D uVelocities;

uniform float uTime;
uniform float uDeltaTime;
uniform float uSeed;

// Mist controls
uniform float uDirection; // radians
uniform float uSpread;
uniform float uDensity;
uniform float uSpeed;
uniform float uBeatSensitivity;

// Analysis data
uniform float uSpectralFlux;
uniform float uTurbulence;
uniform float uOrder;

in vec2 vUv;
layout(location = 0) out vec4 outPosition;
layout(location = 1) out vec4 outVelocity;

// Classic simplex noise or curl noise can go here. For minimal code, simple snoise equivalent
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m;
  m = m*m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

// Curl Noise derived from 2D snoise
vec2 curlNoise(vec2 p) {
  float eps = 0.01;
  float n1 = snoise(vec2(p.x, p.y + eps));
  float n2 = snoise(vec2(p.x, p.y - eps));
  float n3 = snoise(vec2(p.x + eps, p.y));
  float n4 = snoise(vec2(p.x - eps, p.y));
  float x = (n1 - n2) / (2.0 * eps);
  float y = (n3 - n4) / (2.0 * eps);
  return vec2(-x, y); 
}

void main() {
    vec4 pos = texture(uPositions, vUv);
    vec4 vel = texture(uVelocities, vUv);

    // Use a fixed scale for elegant, fluid web patterns (not tied to turbulence)
    float noiseScale = 2.0; 
    
    // X/Y axes use the beautiful 2D fluid curl noise
    vec2 curl = curlNoise(pos.xy * noiseScale + uTime * 0.1);
    
    // Z axis uses a slower, more subtle pushing noise to create depth breathing
    float zNoise = snoise(pos.xy * 1.5 - uTime * 0.05);

    // uSpectralFlux dynamically boosts the fluid speed along its NATURAL path (no exploding)
    // The web dances faster, but doesn't get destroyed
    float beatPulse = 1.0 + (uSpectralFlux * 0.05) * uBeatSensitivity; 
    
    // uSpread Dampens the stringy fluid (curl noise) and introduces pure Brownian diffusion.
    // High spread = uniform fog. Low spread = stringy fluid lines.
    vec2 diffusion = vec2(
        snoise(vUv * 50.0 + uTime * 0.2), 
        snoise(vUv * 50.0 - uTime * 0.2)
    );
    vec2 flowPattern = mix(curl, diffusion, uSpread);
    
    // Combine into a 3D flow velocity
    vec3 flowVel = vec3(flowPattern.x, flowPattern.y, zNoise * 0.5) * beatPulse * uSpeed * 0.015;
    
    // Add directional drift (wind)
    vec3 dirVec = vec3(cos(uDirection), sin(uDirection), 0.0) * uSpeed * 0.01;

    // Velocity update
    vel.xyz += (flowVel + dirVec) * uDeltaTime;
    
    // Time-corrected friction (assuming 60fps base of 0.92)
    // pow(0.92, uDeltaTime * 60.0) ensures friction is applied consistently regardless of frame rate
    vel.xyz *= pow(0.92, uDeltaTime * 60.0); 
    
    // Position Update
    pos.xyz += vel.xyz * uDeltaTime * 60.0;

    // Soft constraint on Z axis to keep it in a "thick layer" instead of a cube
    pos.z -= pos.z * 0.1 * uDeltaTime * 60.0;

    // Slower aging (0.05 vs 0.1) allows particles enough lifespan to form long, coherent filaments
    pos.w -= uDeltaTime * (0.05 + uTurbulence * 0.2); 
    
    // Reset particles if they go out of bounds or age out
    if(abs(pos.x) > 1.5 || abs(pos.y) > 1.5 || abs(pos.z) > 1.0 || pos.w < 0.0) {
        // Respawn primarily in a flat-ish layer for a 2.5D look
        pos.x = snoise(vUv * 13.0 + vec2(uTime, 0.0)) * 1.5;
        pos.y = snoise(vUv * 29.0 - vec2(uTime, 0.0)) * 1.5;
        pos.z = snoise(vUv * 41.0 + vec2(0.0, uTime)) * 0.5; // Thinner starting Z
        pos.w = 1.0; // Reset age
        vel.xyz = vec3(0.0);
    }

    outPosition = pos;
    outVelocity = vel;
}
`;

export const RENDER_VERTEX = `#version 300 es
in vec2 position; // refers to the index in the position texture
uniform sampler2D uPositions;
uniform float uFineness; // controls base point size

// 3D Matrices and DoF
uniform mat4 uProjectionMatrix;
uniform mat4 uViewMatrix;
uniform float uFocusDistance;
uniform float uFocalRange;
uniform float uBlurStrength;
uniform float uResolutionScale;

out float vAge;
out float vCoc;

void main() {
    vec4 pos = texture(uPositions, position);
    vec4 viewPos = uViewMatrix * vec4(pos.xyz, 1.0);
    gl_Position = uProjectionMatrix * viewPos;
    
    // Depth of Field calculation
    float depth = abs(viewPos.z);
    float coc = clamp(abs(depth - uFocusDistance) / uFocalRange, 0.0, 1.0);
    
    // Fineness translates to point size. finer = smaller points
    float baseSize = mix(5.0, 1.0, uFineness); 
    
    // Apply CoC to point size (closer/further away = blurrier/larger)
    gl_PointSize = (baseSize + coc * uBlurStrength) * uResolutionScale;
    
    // Pass to fragment shader
    vCoc = coc;
    vAge = pos.w;
}
`;

export const RENDER_FRAGMENT = `#version 300 es
precision highp float;

in float vAge;
in float vCoc;
uniform float uDensity; // translates to opacity/alpha
out vec4 fragColor;

void main() {
    // Make them circular
    vec2 pt = gl_PointCoord - vec2(0.5);
    float distSq = dot(pt, pt);
    if(distSq > 0.25) discard;
    
    // Soft Gaussian-like particle edge for perfectly smooth cloud-like blending
    float r = sqrt(distSq) * 2.0; // range 0 to 1
    float edgeAlpha = pow(1.0 - r, 2.0);

    // Base alpha
    float alpha = vAge * uDensity * edgeAlpha;
    
    // DoF fade: highly blurred particles become very translucent
    alpha /= (1.0 + vCoc * 5.0);

    // Base mist color is white/cyan
    vec3 color = mix(vec3(0.0, 0.8, 1.0), vec3(1.0), vAge);

    fragColor = vec4(color, alpha);
}
`;
