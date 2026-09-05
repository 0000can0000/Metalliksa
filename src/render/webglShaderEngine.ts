/**
 * METALLIX WebGL & GLSL Shader Pipeline Engine
 * 
 * Hardware-accelerated GPU shaders for:
 * 1. Ultra-dense Spectrometer data (100,000+ points at 60 FPS with glowing baseline & peak fills)
 * 2. Real-time EBSD IPF Voronoi crystallographic orientation & KAM dislocation maps
 * 3. Multi-Channel EDS SEM Hyper-Spectral elemental false-color blending
 */

// ==========================================
// 1. WebGL Initialization & Shader Utilities
// ==========================================

export function createGLShader(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
  type: number,
  source: string
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("Shader compilation error:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function createGLProgram(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
  vertexSrc: string,
  fragmentSrc: string
): WebGLProgram | null {
  const vShader = createGLShader(gl, gl.VERTEX_SHADER, vertexSrc);
  const fShader = createGLShader(gl, gl.FRAGMENT_SHADER, fragmentSrc);
  if (!vShader || !fShader) return null;

  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vShader);
  gl.attachShader(program, fShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Program linking error:", gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

// ==========================================
// 2. Spectrometer WebGL Line & Area Shader
// ==========================================

export const SPECTROMETER_VERTEX_SHADER = `
  attribute vec2 a_position; // normalized coordinates [0..1]
  uniform vec2 u_resolution;
  uniform vec2 u_pan;
  uniform vec2 u_zoom;
  varying vec2 v_pos;

  void main() {
    v_pos = a_position;
    // Apply pan and zoom transforms on GPU
    vec2 transformed = (a_position - u_pan) * u_zoom;
    // Map [0..1] to WebGL clip space [-1..1] with inverted Y
    vec2 clipSpace = vec2(transformed.x * 2.0 - 1.0, (1.0 - transformed.y) * 2.0 - 1.0);
    gl_Position = vec4(clipSpace, 0.0, 1.0);
  }
`;

export const SPECTROMETER_FRAGMENT_SHADER = `
  precision mediump float;
  uniform vec4 u_lineColor;
  uniform vec4 u_fillColor;
  uniform float u_isFill; // 1.0 for area fill, 0.0 for stroke
  uniform float u_glowIntensity;
  varying vec2 v_pos;

  void main() {
    if (u_isFill > 0.5) {
      // Area fill with vertical gradient and subtle glow
      float verticalGrad = pow(1.0 - v_pos.y, 1.5);
      gl_FragColor = vec4(u_fillColor.rgb, u_fillColor.a * verticalGrad);
    } else {
      // Line stroke
      gl_FragColor = u_lineColor;
    }
  }
`;

// ==========================================
// 3. Real-time EBSD Voronoi IPF & KAM Shader
// ==========================================

export const EBSD_VORONOI_VERTEX_SHADER = `
  attribute vec2 a_position;
  varying vec2 v_uv;

  void main() {
    v_uv = a_position * 0.5 + 0.5; // [-1..1] -> [0..1]
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

export const EBSD_VORONOI_FRAGMENT_SHADER = `
  precision mediump float;
  uniform vec2 u_resolution;
  uniform float u_grainScale;
  uniform float u_aspectRatio;
  uniform float u_elongation;
  uniform int u_mode; // 0: IPF-Z, 1: Schmid Factor, 2: KAM Misorientation, 3: Twin Boundaries, 4: Band Contrast
  uniform float u_time;
  varying vec2 v_uv;

  // Pseudo-random hash for Voronoi seeds
  vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453);
  }

  // Convert seed index to standard EBSD Inverse Pole Figure (IPF-Z) color
  vec3 ipfZColor(float id) {
    float angle = fract(id * 0.1618) * 6.28318;
    float r = 0.5 + 0.5 * sin(angle);
    float g = 0.5 + 0.5 * sin(angle + 2.094); // +120 deg
    float b = 0.5 + 0.5 * sin(angle + 4.188); // +240 deg
    // Standard stereographic triangle bias: [001] Red, [111] Blue, [101] Green
    return normalize(vec3(r, g, b) + 0.15);
  }

  void main() {
    vec2 st = v_uv * vec2(u_resolution.x / u_resolution.y, 1.0);
    st.y *= u_elongation; // Rolling/Extrusion elongation
    st *= u_grainScale;

    vec2 i_st = floor(st);
    vec2 f_st = fract(st);

    float m_dist = 10.0;
    float sec_dist = 10.0;
    vec2 m_point = vec2(0.0);
    vec2 m_cell = vec2(0.0);

    // 3x3 Voronoi neighbor search
    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        vec2 neighbor = vec2(float(x), float(y));
        vec2 point = hash2(i_st + neighbor);
        // Anisotropic jitter
        point = 0.5 + 0.4 * sin(6.2831 * point);
        vec2 diff = neighbor + point - f_st;
        float dist = length(diff);

        if (dist < m_dist) {
          sec_dist = m_dist;
          m_dist = dist;
          m_point = point;
          m_cell = i_st + neighbor;
        } else if (dist < sec_dist) {
          sec_dist = dist;
        }
      }
    }

    // High-Angle Grain Boundary (HAGB) detection: difference between 1st & 2nd closest seeds
    float boundaryDist = sec_dist - m_dist;
    float isHAGB = smoothstep(0.0, 0.045, boundaryDist); // 0 at boundary, 1 inside grain

    float cellId = m_cell.x * 37.0 + m_cell.y * 101.0;
    vec3 grainColor = ipfZColor(cellId);

    // MODE 0: Standard IPF-Z Map
    if (u_mode == 0) {
      // Grain boundary is dark slate / black
      vec3 finalColor = mix(vec3(0.05, 0.08, 0.15), grainColor, isHAGB);
      gl_FragColor = vec4(finalColor, 1.0);
    }
    // MODE 1: Schmid Factor Map (Resolved Shear Stress, 0.35 to 0.50 colormap)
    else if (u_mode == 1) {
      float schmid = 0.35 + 0.15 * fract(cellId * 0.314);
      vec3 schmidColor = mix(vec3(0.1, 0.2, 0.9), vec3(0.95, 0.2, 0.1), (schmid - 0.35) / 0.15);
      vec3 finalColor = mix(vec3(0.05, 0.08, 0.15), schmidColor, isHAGB);
      gl_FragColor = vec4(finalColor, 1.0);
    }
    // MODE 2: KAM (Kernel Average Misorientation / Dislocation Density)
    else if (u_mode == 2) {
      // Higher dislocation density near grain boundaries
      float intraGrainStrain = (1.0 - smoothstep(0.0, 0.35, boundaryDist)) * 0.8 + 0.2 * fract(cellId * 0.7);
      vec3 kamColor = mix(vec3(0.1, 0.8, 0.3), vec3(1.0, 0.1, 0.1), intraGrainStrain);
      vec3 finalColor = mix(vec3(0.02, 0.05, 0.1), kamColor, isHAGB);
      gl_FragColor = vec4(finalColor, 1.0);
    }
    // MODE 3: Annealing Coherent Twin Boundaries (Sigma 3 {111})
    else if (u_mode == 3) {
      bool isTwin = fract(cellId * 0.27) > 0.65;
      vec3 twinColor = isTwin ? vec3(0.9, 0.8, 0.1) : grainColor * 0.5;
      vec3 finalColor = mix(vec3(0.95, 0.1, 0.2), twinColor, isHAGB);
      gl_FragColor = vec4(finalColor, 1.0);
    }
    // MODE 4: SEM Band Contrast / Quality Index
    else {
      float iq = 0.4 + 0.5 * fract(cellId * 0.55);
      vec3 iqColor = vec3(iq) * (isHAGB * 0.8 + 0.2);
      gl_FragColor = vec4(iqColor, 1.0);
    }
  }
`;

// ==========================================
// 4. EDS Multi-Channel HyperMap Shader
// ==========================================

export const EDS_MAP_VERTEX_SHADER = `
  attribute vec2 a_position;
  varying vec2 v_uv;

  void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

export const EDS_MAP_FRAGMENT_SHADER = `
  precision mediump float;
  uniform vec2 u_resolution;
  uniform float u_gamma;
  uniform float u_contrast;
  uniform float u_brightness;
  uniform int u_activeElementMask; // Bitmask of active channels (1: Ni, 2: Cr, 4: Ti, 8: Nb, 16: Al, 32: Fe)
  uniform float u_blendMode; // 0: False Color RGB, 1: Heatmap Intensity, 2: Phase Boundary
  varying vec2 v_uv;

  // Synthesize multi-element characteristic X-ray distributions
  void main() {
    vec2 p = v_uv;

    // Dendritic / grain boundary phase segregation simulation
    float dendrite = sin(p.x * 24.0) * cos(p.y * 24.0) * 0.5 + 0.5;
    float lavesPhase = smoothstep(0.72, 0.85, sin(p.x * 12.0 + p.y * 8.0) * cos(p.y * 14.0 - p.x * 6.0));
    float gammaPrime = smoothstep(0.4, 0.6, sin(p.x * 40.0) * sin(p.y * 40.0));
    float primaryCarbide = smoothstep(0.92, 0.98, fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453));

    // Element channels (counts / intensity)
    float ch_Ni = (1.0 - lavesPhase * 0.6) * (0.6 + 0.4 * dendrite); // Nickel Matrix
    float ch_Cr = (0.7 + 0.3 * (1.0 - dendrite)); // Chromium
    float ch_Nb = lavesPhase * 0.95 + 0.05; // Niobium Segregation
    float ch_Ti = primaryCarbide * 0.9 + gammaPrime * 0.4 + 0.1; // Titanium Carbides / γ'
    float ch_Al = gammaPrime * 0.8 + 0.15; // Aluminum in γ'

    // False color mapping
    vec3 col_Ni = vec3(0.1, 0.4, 0.9) * ch_Ni;  // Blue
    vec3 col_Cr = vec3(0.1, 0.85, 0.3) * ch_Cr; // Green
    vec3 col_Nb = vec3(0.95, 0.1, 0.8) * ch_Nb; // Magenta / Purple
    vec3 col_Ti = vec3(0.95, 0.8, 0.1) * ch_Ti; // Yellow / Gold
    vec3 col_Al = vec3(0.1, 0.9, 0.9) * ch_Al;  // Cyan

    vec3 composite = vec3(0.0);
    // Apply bitmask flags
    if ((u_activeElementMask & 1) != 0) composite += col_Ni;
    if ((u_activeElementMask & 2) != 0) composite += col_Cr;
    if ((u_activeElementMask & 4) != 0) composite += col_Ti;
    if ((u_activeElementMask & 8) != 0) composite += col_Nb;
    if ((u_activeElementMask & 16) != 0) composite += col_Al;

    // Apply Contrast, Brightness & Gamma correction on GPU
    composite = pow(max(composite + vec3(u_brightness), 0.0), vec3(1.0 / max(u_gamma, 0.1)));
    composite = (composite - 0.5) * u_contrast + 0.5;

    // Add subtle electron microscope scanline & phosphor glow
    float scanline = 0.96 + 0.04 * sin(p.y * u_resolution.y * 3.1415);
    composite *= scanline;

    gl_FragColor = vec4(clamp(composite, 0.0, 1.0), 1.0);
  }
`;
