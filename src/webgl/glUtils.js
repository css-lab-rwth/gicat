// Low-level WebGL2 helpers (shaders, buffers, color parsing) for the renderer.

/**
 * Compile a single shader stage and throw with the info log on failure.
 * @param {WebGL2RenderingContext} gl
 * @param {number} type gl.VERTEX_SHADER | gl.FRAGMENT_SHADER
 * @param {string} source GLSL source
 * @returns {WebGLShader}
 */
export function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    const kind = type === gl.VERTEX_SHADER ? "vertex" : "fragment";
    throw new Error(`Failed to compile ${kind} shader: ${log}\n${source}`);
  }
  return shader;
}

/**
 * Compile + link a program from vertex/fragment sources.
 * @param {WebGL2RenderingContext} gl
 * @param {string} vsSource
 * @param {string} fsSource
 * @returns {WebGLProgram}
 */
export function createProgram(gl, vsSource, fsSource) {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSource);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSource);
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`Failed to link program: ${log}`);
  }
  return program;
}

/**
 * Cache uniform + attribute locations for a program.
 * @param {WebGL2RenderingContext} gl
 * @param {WebGLProgram} program
 * @param {string[]} uniforms
 * @param {string[]} attribs
 */
export function getLocations(gl, program, uniforms, attribs) {
  const u = {};
  for (const name of uniforms) u[name] = gl.getUniformLocation(program, name);
  const a = {};
  for (const name of attribs) a[name] = gl.getAttribLocation(program, name);
  return { u, a };
}

/**
 * Create a buffer and upload data (or allocate `size` bytes for streaming).
 * @param {WebGL2RenderingContext} gl
 * @param {ArrayBufferView|number} dataOrSize
 * @param {number} usage gl.STATIC_DRAW | gl.DYNAMIC_DRAW
 */
export function createBuffer(gl, dataOrSize, usage) {
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, dataOrSize, usage);
  return buffer;
}

/**
 * Configure a float vertex attribute and (optionally) make it instanced.
 * @param {WebGL2RenderingContext} gl
 * @param {number} location attribute location
 * @param {WebGLBuffer} buffer
 * @param {number} size components per vertex (1..4)
 * @param {object} [opts]
 * @param {number} [opts.stride=0] bytes
 * @param {number} [opts.offset=0] bytes
 * @param {number} [opts.divisor] set 1 for per-instance
 */
export function setFloatAttrib(gl, location, buffer, size, opts = {}) {
  if (location < 0) return; // attribute optimized away
  const { stride = 0, offset = 0, divisor } = opts;
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, size, gl.FLOAT, false, stride, offset);
  if (divisor !== undefined) gl.vertexAttribDivisor(location, divisor);
}

const NAMED_COLORS = {
  white: [1, 1, 1, 1],
  black: [0, 0, 0, 1],
  transparent: [0, 0, 0, 0],
  none: [0, 0, 0, 0],
  red: [1, 0, 0, 1],
};

/**
 * Parse a color (hex, rgb()/rgba(), v-color-picker object, or named) into
 * [r,g,b,a] floats in 0..1. Falls back to opaque black if unrecognized.
 * @param {string|object|null|undefined} input
 * @param {number[]} [out] optional 4-length array to write into
 * @returns {number[]} [r, g, b, a]
 */
export function parseColor(input, out = [0, 0, 0, 1]) {
  if (input == null) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    out[3] = 1;
    return out;
  }

  if (typeof input === "object") {
    // v-color-picker may emit { r, g, b, a } (0..255) or expose a hex string.
    if (typeof input.hex === "string") return parseColor(input.hex, out);
    if (typeof input.hexa === "string") return parseColor(input.hexa, out);
    if ("r" in input && "g" in input && "b" in input) {
      out[0] = clamp01(input.r / 255);
      out[1] = clamp01(input.g / 255);
      out[2] = clamp01(input.b / 255);
      out[3] = input.a == null ? 1 : clamp01(input.a > 1 ? input.a / 255 : input.a);
      return out;
    }
    return parseColor(String(input), out);
  }

  let str = String(input).trim().toLowerCase();
  if (NAMED_COLORS[str]) {
    const c = NAMED_COLORS[str];
    out[0] = c[0];
    out[1] = c[1];
    out[2] = c[2];
    out[3] = c[3];
    return out;
  }

  if (str[0] === "#") {
    str = str.slice(1);
    if (str.length === 3 || str.length === 4) {
      out[0] = hexPair(str[0] + str[0]);
      out[1] = hexPair(str[1] + str[1]);
      out[2] = hexPair(str[2] + str[2]);
      out[3] = str.length === 4 ? hexPair(str[3] + str[3]) : 1;
      return out;
    }
    if (str.length === 6 || str.length === 8) {
      out[0] = hexPair(str.slice(0, 2));
      out[1] = hexPair(str.slice(2, 4));
      out[2] = hexPair(str.slice(4, 6));
      out[3] = str.length === 8 ? hexPair(str.slice(6, 8)) : 1;
      return out;
    }
  }

  const rgb = str.match(/rgba?\(([^)]+)\)/);
  if (rgb) {
    const parts = rgb[1].split(",").map((p) => parseFloat(p));
    out[0] = clamp01((parts[0] || 0) / 255);
    out[1] = clamp01((parts[1] || 0) / 255);
    out[2] = clamp01((parts[2] || 0) / 255);
    out[3] = parts[3] == null ? 1 : clamp01(parts[3]);
    return out;
  }

  // Unrecognized -> opaque black (matches the SVG renderer's default fill).
  out[0] = 0;
  out[1] = 0;
  out[2] = 0;
  out[3] = 1;
  return out;
}

function hexPair(h) {
  return clamp01(parseInt(h, 16) / 255);
}

function clamp01(v) {
  if (Number.isNaN(v)) return 0;
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * Convert normalized RGB floats back to a `#rrggbb` string (used by SVG export).
 * @param {number[]} rgba
 * @returns {string}
 */
export function rgbToHex(rgba) {
  const to2 = (v) => {
    const n = Math.round(clamp01(v) * 255);
    return n.toString(16).padStart(2, "0");
  };
  return `#${to2(rgba[0])}${to2(rgba[1])}${to2(rgba[2])}`;
}
