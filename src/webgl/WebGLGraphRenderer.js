// WebGL2 graph renderer replacing the SVG <v-network-graph>. The Vue component
// owns all semantics and feeds this layer node positions (a shared Float32Array)
// plus per-node/edge visual descriptors. Node positions live in a GPU texture so
// shaders compute edge/marker/label geometry from them; everything is instanced
// (one draw call per kind) and labels use a glyph atlas. A single pan/zoom
// transform scales everything (matches v-network-graph's scalingObjects).
import {
  createProgram,
  getLocations,
  createBuffer,
  setFloatAttrib,
  parseColor,
  rgbToHex,
} from "./glUtils";
import { LabelAtlas } from "./LabelAtlas";

const POS_TEX_W = 1024; // positions texture width (texels); height grows with N

// Shared vertex-shader header: world<->clip transform + positions-texture fetch.
const VS_HEADER = `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D u_positions;
uniform int u_texW;
uniform vec2 u_camCenter;
uniform float u_zoom;
uniform vec2 u_resolution;
vec2 fetchPos(int idx){
  int x = idx % u_texW;
  int y = idx / u_texW;
  return texelFetch(u_positions, ivec2(x, y), 0).xy;
}
vec4 worldToClip(vec2 world){
  vec2 s = (world - u_camCenter) * u_zoom + u_resolution * 0.5;
  return vec4(s.x / u_resolution.x * 2.0 - 1.0, 1.0 - s.y / u_resolution.y * 2.0, 0.0, 1.0);
}
`;

const NODE_VS = `${VS_HEADER}
in vec2 a_corner;          // unit quad in [-0.5, 0.5]
in float i_index;
in vec2 i_offset;          // rect center offset from node position
in vec2 i_size;            // rect width/height (0 => hidden, collapses quad)
in vec4 i_fill;
in vec4 i_stroke;
in float i_strokeW;        // base stroke width
in float i_radius;         // corner radius
in float i_state;          // 0 normal, 1 hover/selected
out vec2 v_local;
out vec2 v_half;
out float v_radius;
out float v_strokeW;
out vec4 v_fill;
out vec4 v_stroke;
void main(){
  vec2 nodePos = fetchPos(int(i_index + 0.5));
  vec2 center = nodePos + i_offset;
  vec2 local = a_corner * i_size;
  gl_Position = worldToClip(center + local);
  v_local = local;
  v_half = i_size * 0.5;
  v_radius = min(i_radius, min(v_half.x, v_half.y));
  v_strokeW = (i_state > 0.5) ? 6.0 : i_strokeW;
  v_fill = i_fill;
  v_stroke = i_stroke;
}
`;

const NODE_FS = `#version 300 es
precision highp float;
in vec2 v_local;
in vec2 v_half;
in float v_radius;
in float v_strokeW;
in vec4 v_fill;
in vec4 v_stroke;
out vec4 outColor;
void main(){
  vec2 p = abs(v_local);
  vec2 q = p - (v_half - vec2(v_radius));
  float dist = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - v_radius;
  float aa = max(fwidth(dist), 1e-4);
  float inside = 1.0 - smoothstep(-aa, aa, dist);
  float innerInside = 1.0 - smoothstep(-aa, aa, dist + v_strokeW);
  float strokeC = clamp(inside - innerInside, 0.0, 1.0);
  float fillC = innerInside;
  vec3 rgb = v_stroke.rgb * strokeC + v_fill.rgb * fillC;
  float a = v_stroke.a * strokeC + v_fill.a * fillC;
  if (a < 0.003) discard;
  outColor = vec4(rgb, a);
}
`;

const EDGE_VS = `${VS_HEADER}
in vec2 a_edge;            // x in [0,1] along edge, y in [-0.5,0.5] across
in float i_src;
in float i_tgt;
in vec4 i_color;
in float i_width;
in float i_state;
out vec4 v_color;
void main(){
  vec2 p0 = fetchPos(int(i_src + 0.5));
  vec2 p1 = fetchPos(int(i_tgt + 0.5));
  float w = (i_state > 0.5) ? 6.0 : i_width;
  vec2 d = p1 - p0;
  float len = length(d);
  vec2 dir = len > 0.0 ? d / len : vec2(1.0, 0.0);
  vec2 normal = vec2(-dir.y, dir.x);
  vec2 world = mix(p0, p1, a_edge.x) + normal * (a_edge.y * w);
  gl_Position = worldToClip(world);
  v_color = i_color;
}
`;

const SOLID_FS = `#version 300 es
precision highp float;
in vec4 v_color;
out vec4 outColor;
void main(){
  if (v_color.a < 0.003) discard;
  outColor = v_color;
}
`;

const MARKER_VS = `${VS_HEADER}
in vec2 a_tri;             // triangle verts (-5,-5)(5,0)(-5,5)
in float i_src;
in float i_tgt;
in vec4 i_color;
in float i_state;
out vec4 v_color;
void main(){
  vec2 p0 = fetchPos(int(i_src + 0.5));
  vec2 p1 = fetchPos(int(i_tgt + 0.5));
  vec2 center = (p0 + p1) * 0.5;
  vec2 d = p1 - p0;
  float ang = atan(d.y, d.x);
  float scale = (i_state > 0.5) ? 3.5 : 2.5;
  float c = cos(ang), s = sin(ang);
  vec2 r = vec2(a_tri.x * c - a_tri.y * s, a_tri.x * s + a_tri.y * c);
  gl_Position = worldToClip(center + r * scale);
  v_color = i_color;
}
`;

// Node label glyphs: anchored to a single node position.
const NODE_LABEL_VS = `${VS_HEADER}
in vec2 a_corner;
in float i_index;
in vec2 i_offset;          // glyph center offset from node position
in vec2 i_size;            // glyph quad size
in vec4 i_uv;              // u0,v0,u1,v1
in vec3 i_color;
out vec2 v_uv;
out vec3 v_color;
void main(){
  vec2 nodePos = fetchPos(int(i_index + 0.5));
  gl_Position = worldToClip(nodePos + i_offset + a_corner * i_size);
  vec2 t = a_corner + 0.5;
  v_uv = vec2(mix(i_uv.x, i_uv.z, t.x), mix(i_uv.y, i_uv.w, t.y));
  v_color = i_color;
}
`;

// Edge label glyphs: anchored to the edge midpoint (horizontal, above the line).
const EDGE_LABEL_VS = `${VS_HEADER}
in vec2 a_corner;
in float i_src;
in float i_tgt;
in vec2 i_offset;
in vec2 i_size;
in vec4 i_uv;
in vec3 i_color;
out vec2 v_uv;
out vec3 v_color;
void main(){
  vec2 p0 = fetchPos(int(i_src + 0.5));
  vec2 p1 = fetchPos(int(i_tgt + 0.5));
  vec2 center = (p0 + p1) * 0.5;
  // rotate the label parallel to the edge; flip when it points left so text stays upright
  vec2 d = p1 - p0;
  if (d.x < 0.0) d = -d;
  float ang = atan(d.y, d.x);
  float c = cos(ang), s = sin(ang);
  vec2 local = i_offset + a_corner * i_size; // x: along edge, y: perpendicular
  vec2 rot = vec2(local.x * c - local.y * s, local.x * s + local.y * c);
  gl_Position = worldToClip(center + rot);
  vec2 t = a_corner + 0.5;
  v_uv = vec2(mix(i_uv.x, i_uv.z, t.x), mix(i_uv.y, i_uv.w, t.y));
  v_color = i_color;
}
`;

const LABEL_FS = `#version 300 es
precision highp float;
uniform sampler2D u_atlas;
in vec2 v_uv;
in vec3 v_color;
out vec4 outColor;
void main(){
  float cov = texture(u_atlas, v_uv).a;
  if (cov < 0.01) discard;
  outColor = vec4(v_color * cov, cov); // premultiplied
}
`;

const EDGE_LABEL_MARGIN = 20; // matches configs.edge.label.margin
const WHITE3 = [1, 1, 1];
const BLACK3 = [0, 0, 0];

// Track live renderers so a hot-reload can't leave old render loops running.
const LIVE_RENDERERS = new Set();

export class WebGLGraphRenderer {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {object} callbacks event hooks back into the Vue component
   */
  constructor(canvas, callbacks = {}) {
    // tear down any previous renderer first (HMR-safe)
    for (const r of Array.from(LIVE_RENDERERS)) {
      try {
        r.destroy();
      } catch (e) {
        void e;
      }
    }

    this.canvas = canvas;
    this.callbacks = callbacks;
    this.layout = null;

    this.cam = { x: 0, y: 0, k: 0.5 }; // matches :zoom-level="0.5"
    this.minK = 0.0005;
    this.maxK = 30;
    // when true, keep the graph framed each frame; off once the user pans/zooms/drags
    this._autoFit = true;

    this.nodeDescs = [];
    this.edgeDescs = [];
    this.nodeCount = 0;
    this.edgeCount = 0;
    this.nodeLabelCount = 0;
    this.edgeLabelCount = 0;

    this.selectedNodeIdx = new Set();
    this.selectedEdgeIdx = new Set();
    this.hoverNodeIdx = -1;
    this.hoverEdgeIdx = -1;

    this._posDirty = false;
    this._frameRequested = false;
    this._destroyed = false;
    this._ptr = null;
    this._cssW = 0;
    this._cssH = 0;

    this._initGL();
    this._initPrograms();
    this._initGeometry();
    this._initInstanceBuffers();
    this._initPositionsTexture(1);

    this.atlas = new LabelAtlas(this.gl);

    this._buildTooltip();
    this._attachEvents();
    this.resize();
    LIVE_RENDERERS.add(this);
    this._requestFrame();
  }

  // ---- setup -------------------------------------------------------------

  _initGL() {
    // preserveDrawingBuffer lets us render on demand (keeps the last frame while idle)
    const gl = this.canvas.getContext("webgl2", {
      alpha: true,
      antialias: true,
      premultipliedAlpha: true,
      preserveDrawingBuffer: true,
    });
    if (!gl) throw new Error("WebGL2 is not available in this environment.");
    this.gl = gl;
    gl.clearColor(1, 1, 1, 1); // white background, like the SVG renderer
    gl.enable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
  }

  _initPrograms() {
    const gl = this.gl;
    const mk = (vs, fs, uniforms, attribs) => {
      const program = createProgram(gl, vs, fs);
      const loc = getLocations(gl, program, uniforms, attribs);
      return { program, ...loc };
    };
    const camU = ["u_positions", "u_texW", "u_camCenter", "u_zoom", "u_resolution"];
    this.progNode = mk(NODE_VS, NODE_FS, camU, [
      "a_corner", "i_index", "i_offset", "i_size", "i_fill", "i_stroke", "i_strokeW", "i_radius", "i_state",
    ]);
    this.progEdge = mk(EDGE_VS, SOLID_FS, camU, [
      "a_edge", "i_src", "i_tgt", "i_color", "i_width", "i_state",
    ]);
    this.progMarker = mk(MARKER_VS, SOLID_FS, camU, [
      "a_tri", "i_src", "i_tgt", "i_color", "i_state",
    ]);
    this.progNodeLabel = mk(NODE_LABEL_VS, LABEL_FS, [...camU, "u_atlas"], [
      "a_corner", "i_index", "i_offset", "i_size", "i_uv", "i_color",
    ]);
    this.progEdgeLabel = mk(EDGE_LABEL_VS, LABEL_FS, [...camU, "u_atlas"], [
      "a_corner", "i_src", "i_tgt", "i_offset", "i_size", "i_uv", "i_color",
    ]);
  }

  _initGeometry() {
    const gl = this.gl;
    // Unit quad (triangle strip) in [-0.5, 0.5] for nodes & labels.
    this.quadBuf = createBuffer(
      gl,
      new Float32Array([-0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5]),
      gl.STATIC_DRAW,
    );
    // Edge quad: x in [0,1] along, y in [-0.5,0.5] across.
    this.edgeGeoBuf = createBuffer(
      gl,
      new Float32Array([0, -0.5, 1, -0.5, 0, 0.5, 1, 0.5]),
      gl.STATIC_DRAW,
    );
    // Direction-marker triangle.
    this.triBuf = createBuffer(
      gl,
      new Float32Array([-5, -5, 5, 0, -5, 5]),
      gl.STATIC_DRAW,
    );
  }

  _initInstanceBuffers() {
    const gl = this.gl;
    const b = () => gl.createBuffer();
    this.buf = {
      nIndex: b(), nOffset: b(), nSize: b(), nFill: b(), nStroke: b(),
      nStrokeW: b(), nRadius: b(), nState: b(),
      eSrc: b(), eTgt: b(), eColor: b(), eWidth: b(), eState: b(),
      mColor: b(),
      nlIndex: b(), nlOffset: b(), nlSize: b(), nlUv: b(), nlColor: b(),
      elSrc: b(), elTgt: b(), elOffset: b(), elSize: b(), elUv: b(), elColor: b(),
    };
    // CPU-side state arrays (small) re-uploaded wholesale on hover/selection.
    this.nodeStateArr = new Float32Array(0);
    this.edgeStateArr = new Float32Array(0);
    this._buildVAOs();
  }

  _buildVAOs() {
    const gl = this.gl;
    const F = Float32Array.BYTES_PER_ELEMENT;
    // Node VAO
    this.vaoNode = gl.createVertexArray();
    gl.bindVertexArray(this.vaoNode);
    setFloatAttrib(gl, this.progNode.a.a_corner, this.quadBuf, 2);
    setFloatAttrib(gl, this.progNode.a.i_index, this.buf.nIndex, 1, { divisor: 1 });
    setFloatAttrib(gl, this.progNode.a.i_offset, this.buf.nOffset, 2, { divisor: 1 });
    setFloatAttrib(gl, this.progNode.a.i_size, this.buf.nSize, 2, { divisor: 1 });
    setFloatAttrib(gl, this.progNode.a.i_fill, this.buf.nFill, 4, { divisor: 1 });
    setFloatAttrib(gl, this.progNode.a.i_stroke, this.buf.nStroke, 4, { divisor: 1 });
    setFloatAttrib(gl, this.progNode.a.i_strokeW, this.buf.nStrokeW, 1, { divisor: 1 });
    setFloatAttrib(gl, this.progNode.a.i_radius, this.buf.nRadius, 1, { divisor: 1 });
    setFloatAttrib(gl, this.progNode.a.i_state, this.buf.nState, 1, { divisor: 1 });

    // Edge VAO
    this.vaoEdge = gl.createVertexArray();
    gl.bindVertexArray(this.vaoEdge);
    setFloatAttrib(gl, this.progEdge.a.a_edge, this.edgeGeoBuf, 2);
    setFloatAttrib(gl, this.progEdge.a.i_src, this.buf.eSrc, 1, { divisor: 1 });
    setFloatAttrib(gl, this.progEdge.a.i_tgt, this.buf.eTgt, 1, { divisor: 1 });
    setFloatAttrib(gl, this.progEdge.a.i_color, this.buf.eColor, 4, { divisor: 1 });
    setFloatAttrib(gl, this.progEdge.a.i_width, this.buf.eWidth, 1, { divisor: 1 });
    setFloatAttrib(gl, this.progEdge.a.i_state, this.buf.eState, 1, { divisor: 1 });

    // Marker VAO (reuses edge src/tgt/state buffers)
    this.vaoMarker = gl.createVertexArray();
    gl.bindVertexArray(this.vaoMarker);
    setFloatAttrib(gl, this.progMarker.a.a_tri, this.triBuf, 2);
    setFloatAttrib(gl, this.progMarker.a.i_src, this.buf.eSrc, 1, { divisor: 1 });
    setFloatAttrib(gl, this.progMarker.a.i_tgt, this.buf.eTgt, 1, { divisor: 1 });
    setFloatAttrib(gl, this.progMarker.a.i_color, this.buf.mColor, 4, { divisor: 1 });
    setFloatAttrib(gl, this.progMarker.a.i_state, this.buf.eState, 1, { divisor: 1 });

    // Node label VAO
    this.vaoNodeLabel = gl.createVertexArray();
    gl.bindVertexArray(this.vaoNodeLabel);
    setFloatAttrib(gl, this.progNodeLabel.a.a_corner, this.quadBuf, 2);
    setFloatAttrib(gl, this.progNodeLabel.a.i_index, this.buf.nlIndex, 1, { divisor: 1 });
    setFloatAttrib(gl, this.progNodeLabel.a.i_offset, this.buf.nlOffset, 2, { divisor: 1 });
    setFloatAttrib(gl, this.progNodeLabel.a.i_size, this.buf.nlSize, 2, { divisor: 1 });
    setFloatAttrib(gl, this.progNodeLabel.a.i_uv, this.buf.nlUv, 4, { divisor: 1 });
    setFloatAttrib(gl, this.progNodeLabel.a.i_color, this.buf.nlColor, 3, { divisor: 1 });

    // Edge label VAO
    this.vaoEdgeLabel = gl.createVertexArray();
    gl.bindVertexArray(this.vaoEdgeLabel);
    setFloatAttrib(gl, this.progEdgeLabel.a.a_corner, this.quadBuf, 2);
    setFloatAttrib(gl, this.progEdgeLabel.a.i_src, this.buf.elSrc, 1, { divisor: 1 });
    setFloatAttrib(gl, this.progEdgeLabel.a.i_tgt, this.buf.elTgt, 1, { divisor: 1 });
    setFloatAttrib(gl, this.progEdgeLabel.a.i_offset, this.buf.elOffset, 2, { divisor: 1 });
    setFloatAttrib(gl, this.progEdgeLabel.a.i_size, this.buf.elSize, 2, { divisor: 1 });
    setFloatAttrib(gl, this.progEdgeLabel.a.i_uv, this.buf.elUv, 4, { divisor: 1 });
    setFloatAttrib(gl, this.progEdgeLabel.a.i_color, this.buf.elColor, 3, { divisor: 1 });

    gl.bindVertexArray(null);
    void F;
  }

  _initPositionsTexture(n) {
    const gl = this.gl;
    this.posTexW = POS_TEX_W;
    this.posTexH = Math.max(1, Math.ceil(n / this.posTexW));
    this.posTexData = new Float32Array(this.posTexW * this.posTexH * 2);
    if (this.posTex) gl.deleteTexture(this.posTex);
    this.posTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.posTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG32F, this.posTexW, this.posTexH, 0, gl.RG, gl.FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  _buildTooltip() {
    const el = document.createElement("div");
    el.style.cssText =
      "position:absolute;pointer-events:none;z-index:20;background:rgba(0,0,0,0.8);" +
      "color:#fff;padding:2px 6px;border-radius:3px;font:12px Arial,sans-serif;" +
      "white-space:nowrap;display:none;transform:translate(-50%,-130%);max-width:480px;" +
      "overflow:hidden;text-overflow:ellipsis;";
    const parent = this.canvas.parentElement || document.body;
    if (getComputedStyle(parent).position === "static") parent.style.position = "relative";
    parent.appendChild(el);
    this.tooltipEl = el;
  }

  // ---- public API --------------------------------------------------------

  /** Wire the layout that owns node ids and the live positions array. */
  attachLayout(layout) {
    this.layout = layout;
    layout.onPositionsChanged = () => this.markPositionsDirty();
    this._initPositionsTexture(Math.max(1, layout.nodeCount));
    this.nodeStateArr = new Float32Array(layout.nodeCount);
    this.edgeStateArr = new Float32Array(layout.edgePairs.length);
    this._autoFit = true;
  }

  markPositionsDirty() {
    this._posDirty = true;
    this._requestFrame();
  }

  // Rebuild visual + label buffers from descriptors (on filter/color/hidden
  // changes, not per tick). edgeDescs carry sourceId/targetId, resolved here.
  updateVisuals(nodeDescs, edgeDescs) {
    this.nodeDescs = nodeDescs;
    this.edgeDescs = edgeDescs;
    this._buildNodeBuffers(nodeDescs);
    this._buildEdgeBuffers(edgeDescs);
    this._buildLabelBuffers(nodeDescs, edgeDescs);
    this._applyStateArrays();
    this._pickDirty = true;
    this._requestFrame();
  }

  setSelection(selectedNodeIds) {
    const idx = this.layout ? this.layout.idToIndex : new Map();
    this.selectedNodeIdx = new Set();
    for (const id of selectedNodeIds) {
      const i = idx.get(id);
      if (i !== undefined) this.selectedNodeIdx.add(i);
    }
    this._applyStateArrays();
    this._requestFrame();
  }

  // Recolor just the given nodes' border (stroke) — cheap update for the color
  // picker (no descriptor rebuild / label re-layout).
  setNodeStrokeColor(indices, rgba) {
    if (!this.gl || !indices || !indices.length) return;
    const gl = this.gl;
    if (!this._strokeTmp) this._strokeTmp = new Float32Array(4);
    const tmp = this._strokeTmp;
    tmp[0] = rgba[0];
    tmp[1] = rgba[1];
    tmp[2] = rgba[2];
    tmp[3] = rgba[3] == null ? 1 : rgba[3];
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf.nStroke);
    for (let k = 0; k < indices.length; k++) {
      const i = indices[k];
      if (i < 0 || i >= this.nodeCount) continue;
      const d = this.nodeDescs[i];
      if (d) d.stroke = [tmp[0], tmp[1], tmp[2], tmp[3]];
      gl.bufferSubData(gl.ARRAY_BUFFER, i * 16, tmp); // 4 floats * 4 bytes per node
    }
    this._requestFrame();
  }

  // ---- buffer building ---------------------------------------------------

  _setBuf(buffer, data) {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
  }

  _buildNodeBuffers(descs) {
    const n = descs.length;
    this.nodeCount = n;
    const idxA = new Float32Array(n);
    const off = new Float32Array(n * 2);
    const size = new Float32Array(n * 2);
    const fill = new Float32Array(n * 4);
    const stroke = new Float32Array(n * 4);
    const sw = new Float32Array(n);
    const rad = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const d = descs[i];
      idxA[i] = i;
      const visible = d.visible;
      off[i * 2] = d.offsetX;
      off[i * 2 + 1] = d.offsetY;
      size[i * 2] = visible ? d.w : 0;
      size[i * 2 + 1] = visible ? d.h : 0;
      fill[i * 4] = d.fill[0]; fill[i * 4 + 1] = d.fill[1]; fill[i * 4 + 2] = d.fill[2]; fill[i * 4 + 3] = d.fill[3];
      stroke[i * 4] = d.stroke[0]; stroke[i * 4 + 1] = d.stroke[1]; stroke[i * 4 + 2] = d.stroke[2]; stroke[i * 4 + 3] = d.stroke[3];
      sw[i] = d.strokeW;
      rad[i] = d.radius;
    }
    this._setBuf(this.buf.nIndex, idxA);
    this._setBuf(this.buf.nOffset, off);
    this._setBuf(this.buf.nSize, size);
    this._setBuf(this.buf.nFill, fill);
    this._setBuf(this.buf.nStroke, stroke);
    this._setBuf(this.buf.nStrokeW, sw);
    this._setBuf(this.buf.nRadius, rad);
    if (this.nodeStateArr.length !== n) this.nodeStateArr = new Float32Array(n);
  }

  _buildEdgeBuffers(descs) {
    const e = descs.length;
    this.edgeCount = e;
    const idx = this.layout ? this.layout.idToIndex : new Map();
    const src = new Float32Array(e);
    const tgt = new Float32Array(e);
    const color = new Float32Array(e * 4);
    const width = new Float32Array(e);
    const mColor = new Float32Array(e * 4);
    for (let j = 0; j < e; j++) {
      const d = descs[j];
      const si = idx.get(d.sourceId);
      const ti = idx.get(d.targetId);
      src[j] = si === undefined ? 0 : si;
      tgt[j] = ti === undefined ? 0 : ti;
      const lv = d.lineVisible && si !== undefined && ti !== undefined;
      color[j * 4] = d.color[0]; color[j * 4 + 1] = d.color[1]; color[j * 4 + 2] = d.color[2];
      color[j * 4 + 3] = lv ? d.color[3] : 0;
      width[j] = lv ? d.width : 0;
      const mv = d.markerVisible && si !== undefined && ti !== undefined;
      mColor[j * 4] = d.markerColor[0]; mColor[j * 4 + 1] = d.markerColor[1]; mColor[j * 4 + 2] = d.markerColor[2];
      mColor[j * 4 + 3] = mv ? d.markerColor[3] : 0;
    }
    this._setBuf(this.buf.eSrc, src);
    this._setBuf(this.buf.eTgt, tgt);
    this._setBuf(this.buf.eColor, color);
    this._setBuf(this.buf.eWidth, width);
    this._setBuf(this.buf.mColor, mColor);
    if (this.edgeStateArr.length !== e) this.edgeStateArr = new Float32Array(e);
  }

  _buildLabelBuffers(nodeDescs, edgeDescs) {
    const idx = this.layout ? this.layout.idToIndex : new Map();
    // Node labels
    const nl = { index: [], off: [], size: [], uv: [], color: [] };
    for (let i = 0; i < nodeDescs.length; i++) {
      const d = nodeDescs[i];
      if (!d.visible || !d.label) continue;
      const weight = d.bold ? "bold" : "normal";
      this._layoutLabel(d.label, d.fontPx, weight, d.labelAnchorX, 0, (cx, cy, w, h, uv) => {
        nl.index.push(i);
        nl.off.push(cx, cy);
        nl.size.push(w, h);
        nl.uv.push(uv[0], uv[1], uv[2], uv[3]);
        nl.color.push(WHITE3[0], WHITE3[1], WHITE3[2]);
      });
    }
    this.nodeLabelCount = nl.index.length;
    this._setBuf(this.buf.nlIndex, new Float32Array(nl.index));
    this._setBuf(this.buf.nlOffset, new Float32Array(nl.off));
    this._setBuf(this.buf.nlSize, new Float32Array(nl.size));
    this._setBuf(this.buf.nlUv, new Float32Array(nl.uv));
    this._setBuf(this.buf.nlColor, new Float32Array(nl.color));

    // Edge labels
    const el = { src: [], tgt: [], off: [], size: [], uv: [], color: [] };
    for (let j = 0; j < edgeDescs.length; j++) {
      const d = edgeDescs[j];
      if (!d.labelVisible || !d.label) continue;
      const si = idx.get(d.sourceId);
      const ti = idx.get(d.targetId);
      if (si === undefined || ti === undefined) continue;
      const fontPx = d.labelFontPx || 30;
      const fm = this.atlas.fontMetrics(fontPx, "normal");
      const anchorY = -(EDGE_LABEL_MARGIN + fm.lineHeight * 0.5);
      this._layoutLabel(d.label, fontPx, "normal", 0, anchorY, (cx, cy, w, h, uv) => {
        el.src.push(si);
        el.tgt.push(ti);
        el.off.push(cx, cy);
        el.size.push(w, h);
        el.uv.push(uv[0], uv[1], uv[2], uv[3]);
        el.color.push(BLACK3[0], BLACK3[1], BLACK3[2]);
      });
    }
    this.edgeLabelCount = el.src.length;
    this._setBuf(this.buf.elSrc, new Float32Array(el.src));
    this._setBuf(this.buf.elTgt, new Float32Array(el.tgt));
    this._setBuf(this.buf.elOffset, new Float32Array(el.off));
    this._setBuf(this.buf.elSize, new Float32Array(el.size));
    this._setBuf(this.buf.elUv, new Float32Array(el.uv));
    this._setBuf(this.buf.elColor, new Float32Array(el.color));
  }

  /** Lay out a string as centered glyph quads, invoking push() per glyph. */
  _layoutLabel(text, fontPx, weight, anchorX, anchorY, push) {
    const chars = Array.from(text);
    let total = 0;
    const glyphs = [];
    for (const ch of chars) {
      const g = this.atlas.ensureGlyph(ch, fontPx, weight);
      glyphs.push(g);
      total += g.advance;
    }
    let penX = anchorX - total / 2;
    for (const g of glyphs) {
      const cx = penX + g.advance / 2;
      push(cx, anchorY, g.advance, g.lineHeight, g.uv);
      penX += g.advance;
    }
  }

  _applyStateArrays() {
    const gl = this.gl;
    const ns = this.nodeStateArr;
    for (let i = 0; i < ns.length; i++) {
      ns[i] = this.selectedNodeIdx.has(i) || i === this.hoverNodeIdx ? 1 : 0;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf.nState);
    gl.bufferData(gl.ARRAY_BUFFER, ns, gl.DYNAMIC_DRAW);

    const es = this.edgeStateArr;
    for (let j = 0; j < es.length; j++) {
      es[j] = this.selectedEdgeIdx.has(j) || j === this.hoverEdgeIdx ? 1 : 0;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf.eState);
    gl.bufferData(gl.ARRAY_BUFFER, es, gl.DYNAMIC_DRAW);
  }

  // ---- camera ------------------------------------------------------------

  // Cached CSS size — reading clientWidth/Height in the loop forces a reflow,
  // so we sample it only in resize().
  get cssWidth() {
    return this._cssW || this.canvas.clientWidth || 1;
  }
  get cssHeight() {
    return this._cssH || this.canvas.clientHeight || 1;
  }

  screenToWorld(sx, sy) {
    return {
      x: (sx - this.cssWidth / 2) / this.cam.k + this.cam.x,
      y: (sy - this.cssHeight / 2) / this.cam.k + this.cam.y,
    };
  }

  worldToScreen(wx, wy) {
    return {
      x: (wx - this.cam.x) * this.cam.k + this.cssWidth / 2,
      y: (wy - this.cam.y) * this.cam.k + this.cssHeight / 2,
    };
  }

  // Center on the graph centroid at a readable (clamped) zoom, until the user
  // takes control. Centroid is robust to a few nodes flung far by the charge.
  _fitView() {
    const pos = this.layout && this.layout.positions;
    if (!pos || this.nodeCount === 0) return;
    let sumX = 0, sumY = 0, n = 0;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i < this.nodeCount; i++) {
      const d = this.nodeDescs[i];
      if (!d || !d.visible) continue;
      const cx = pos[i * 2] + d.offsetX;
      const cy = pos[i * 2 + 1] + d.offsetY;
      sumX += cx;
      sumY += cy;
      n++;
      if (cx - d.w / 2 < minX) minX = cx - d.w / 2;
      if (cx + d.w / 2 > maxX) maxX = cx + d.w / 2;
      if (cy - d.h / 2 < minY) minY = cy - d.h / 2;
      if (cy + d.h / 2 > maxY) maxY = cy + d.h / 2;
    }
    if (!n) return;
    this.cam.x = sumX / n; // centroid
    this.cam.y = sumY / n;
    const bw = Math.max(maxX - minX, 1);
    const bh = Math.max(maxY - minY, 1);
    const fitK = Math.min(this.cssWidth / bw, this.cssHeight / bh) * 0.9;
    // clamp zoom so nodes stay readable (original used ~0.5)
    this.cam.k = Math.min(Math.max(fitK, 0.4), 1.25);
  }

  // ---- events ------------------------------------------------------------

  _cssXY(e) {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  _attachEvents() {
    this._handlers = {
      down: (e) => this._onPointerDown(e),
      move: (e) => this._onPointerMove(e),
      up: (e) => this._onPointerUp(e),
      wheel: (e) => this._onWheel(e),
      dbl: (e) => this._onDblClick(e),
      ctx: (e) => this._onContextMenu(e),
      leave: () => this._hideTooltip(),
    };
    const c = this.canvas;
    c.addEventListener("pointerdown", this._handlers.down);
    c.addEventListener("pointermove", this._handlers.move);
    window.addEventListener("pointerup", this._handlers.up);
    c.addEventListener("wheel", this._handlers.wheel, { passive: false });
    c.addEventListener("dblclick", this._handlers.dbl);
    c.addEventListener("contextmenu", this._handlers.ctx);
    c.addEventListener("pointerleave", this._handlers.leave);
  }

  _onPointerDown(e) {
    if (e.button !== 0) return; // left button only; right -> contextmenu
    try { this.canvas.setPointerCapture(e.pointerId); } catch (err) { void err; }
    const { x, y } = this._cssXY(e);
    this._ptr = { id: e.pointerId, startX: x, startY: y, lastX: x, lastY: y, moved: false, alt: e.altKey };
    const idx = this._pickNode(x, y);
    if (idx >= 0) {
      this._ptr.mode = "drag";
      this._ptr.nodeIdx = idx;
      this._ptr.nodeId = this.layout.nodeIds[idx];
      if (this.callbacks.onNodeDragStart) this.callbacks.onNodeDragStart(this._ptr.nodeId);
    } else {
      this._ptr.mode = "pan";
    }
  }

  _onPointerMove(e) {
    const { x, y } = this._cssXY(e);
    if (this._ptr) {
      const dx = x - this._ptr.lastX;
      const dy = y - this._ptr.lastY;
      if (Math.abs(x - this._ptr.startX) > 3 || Math.abs(y - this._ptr.startY) > 3) {
        this._ptr.moved = true;
        this._autoFit = false; // user is panning/dragging -> stop auto-framing
      }
      if (this._ptr.mode === "drag") {
        const w = this.screenToWorld(x, y);
        if (this.callbacks.onNodeDragMove) this.callbacks.onNodeDragMove(this._ptr.nodeId, w.x, w.y);
      } else {
        this.cam.x -= dx / this.cam.k;
        this.cam.y -= dy / this.cam.k;
        this._requestFrame();
      }
      this._ptr.lastX = x;
      this._ptr.lastY = y;
    } else {
      this._updateHover(x, y);
    }
  }

  _onPointerUp(e) {
    if (!this._ptr || e.pointerId !== this._ptr.id) return;
    const { moved, mode, nodeId, alt } = this._ptr;
    try { this.canvas.releasePointerCapture(e.pointerId); } catch (err) { void err; }
    if (mode === "drag") {
      if (moved) {
        if (this.callbacks.onNodeDragEnd) this.callbacks.onNodeDragEnd(nodeId);
      } else if (this.callbacks.onNodeClick) {
        this.callbacks.onNodeClick(nodeId, { altKey: alt });
      }
    } else if (!moved && this.callbacks.onBackgroundClick) {
      this.callbacks.onBackgroundClick();
    }
    this._ptr = null;
  }

  _onWheel(e) {
    e.preventDefault();
    this._autoFit = false; // user is zooming -> stop auto-framing
    const { x, y } = this._cssXY(e);
    const before = this.screenToWorld(x, y);
    const factor = Math.exp(-e.deltaY * 0.001);
    this.cam.k = Math.min(Math.max(this.cam.k * factor, this.minK), this.maxK);
    const after = this.screenToWorld(x, y);
    this.cam.x += before.x - after.x;
    this.cam.y += before.y - after.y;
    this._requestFrame();
  }

  _onDblClick(e) {
    const { x, y } = this._cssXY(e);
    const idx = this._pickNode(x, y);
    if (idx >= 0 && this.callbacks.onNodeDblClick) {
      this.callbacks.onNodeDblClick(this.layout.nodeIds[idx]);
    }
  }

  _onContextMenu(e) {
    e.preventDefault();
    const { x, y } = this._cssXY(e);
    const idx = this._pickNode(x, y);
    if (idx >= 0 && this.callbacks.onNodeContextMenu) {
      this.callbacks.onNodeContextMenu(this.layout.nodeIds[idx]);
    }
  }

  // ---- hit testing -------------------------------------------------------

  _buildPickGrid() {
    const pos = this.layout && this.layout.positions;
    this._grid = new Map();
    this._gridCell = 256;
    if (!pos) return;
    const cs = this._gridCell;
    for (let i = 0; i < this.nodeCount; i++) {
      const d = this.nodeDescs[i];
      if (!d || !d.visible) continue;
      const cx = pos[i * 2] + d.offsetX;
      const cy = pos[i * 2 + 1] + d.offsetY;
      const x0 = Math.floor((cx - d.w / 2) / cs);
      const x1 = Math.floor((cx + d.w / 2) / cs);
      const y0 = Math.floor((cy - d.h / 2) / cs);
      const y1 = Math.floor((cy + d.h / 2) / cs);
      for (let gx = x0; gx <= x1; gx++) {
        for (let gy = y0; gy <= y1; gy++) {
          const key = gx + "," + gy;
          let arr = this._grid.get(key);
          if (!arr) this._grid.set(key, (arr = []));
          arr.push(i);
        }
      }
    }
    this._pickDirty = false;
  }

  /** @returns node index under (cssX,cssY) or -1 */
  _pickNode(sx, sy) {
    const pos = this.layout && this.layout.positions;
    if (!pos || this.nodeCount === 0) return -1;
    if (this._pickDirty || !this._grid) this._buildPickGrid();
    const w = this.screenToWorld(sx, sy);
    const gx = Math.floor(w.x / this._gridCell);
    const gy = Math.floor(w.y / this._gridCell);
    const candidates = this._grid.get(gx + "," + gy);
    if (!candidates) return -1;
    // Iterate in reverse so the topmost (later-drawn) node wins on overlap.
    for (let c = candidates.length - 1; c >= 0; c--) {
      const i = candidates[c];
      const d = this.nodeDescs[i];
      const cx = pos[i * 2] + d.offsetX;
      const cy = pos[i * 2 + 1] + d.offsetY;
      if (Math.abs(w.x - cx) <= d.w / 2 && Math.abs(w.y - cy) <= d.h / 2) return i;
    }
    return -1;
  }

  /** @returns edge index under (cssX,cssY) or -1 */
  _pickEdge(sx, sy) {
    const pos = this.layout && this.layout.positions;
    if (!pos) return -1;
    const idx = this.layout.idToIndex;
    const w = this.screenToWorld(sx, sy);
    const tolWorld = Math.max(6, 8 / this.cam.k);
    let best = -1;
    let bestDist = tolWorld;
    for (let j = 0; j < this.edgeCount; j++) {
      const d = this.edgeDescs[j];
      if (!d || !d.lineVisible) continue;
      const si = idx.get(d.sourceId);
      const ti = idx.get(d.targetId);
      if (si === undefined || ti === undefined) continue;
      const dist = pointSegDist(w.x, w.y, pos[si * 2], pos[si * 2 + 1], pos[ti * 2], pos[ti * 2 + 1]);
      if (dist < bestDist) {
        bestDist = dist;
        best = j;
      }
    }
    return best;
  }

  _updateHover(sx, sy) {
    const nodeIdx = this._pickNode(sx, sy);
    let edgeIdx = -1;
    if (nodeIdx < 0) edgeIdx = this._pickEdge(sx, sy);
    const changed = nodeIdx !== this.hoverNodeIdx || edgeIdx !== this.hoverEdgeIdx;
    this.hoverNodeIdx = nodeIdx;
    this.hoverEdgeIdx = edgeIdx;
    this.canvas.style.cursor = nodeIdx >= 0 ? "pointer" : "default";
    if (nodeIdx >= 0) {
      const tip = this.callbacks.getNodeTooltip
        ? this.callbacks.getNodeTooltip(this.layout.nodeIds[nodeIdx])
        : "";
      this._showTooltip(tip, sx, sy);
    } else {
      this._hideTooltip();
    }
    if (changed) {
      this._applyStateArrays();
      this._requestFrame();
    }
  }

  _showTooltip(text, sx, sy) {
    if (!text) return this._hideTooltip();
    const el = this.tooltipEl;
    el.textContent = text;
    el.style.left = sx + "px";
    el.style.top = sy + "px";
    el.style.display = "block";
  }

  _hideTooltip() {
    if (this.tooltipEl) this.tooltipEl.style.display = "none";
  }

  // ---- render loop -------------------------------------------------------

  // On-demand: schedule one frame per request; the GPU idles when nothing changes.
  _requestFrame() {
    if (this._frameRequested || this._destroyed) return;
    this._frameRequested = true;
    this._raf = requestAnimationFrame(() => {
      this._frameRequested = false;
      // try/catch so a frame error can't wedge future scheduling.
      try {
        this._frame();
      } catch (e) {
        if ((this._frameErrCount = (this._frameErrCount || 0) + 1) <= 5) {
          console.error("[WebGLGraph] _frame error:", e);
        }
      }
    });
  }

  _uploadPositions() {
    const pos = this.layout && this.layout.positions;
    if (!pos) return;
    this.posTexData.set(pos.subarray(0, Math.min(pos.length, this.posTexData.length)));
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.posTex);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.posTexW, this.posTexH, gl.RG, gl.FLOAT, this.posTexData);
    this._posDirty = false;
    this._pickDirty = true;
  }

  _setCameraUniforms(prog) {
    const gl = this.gl;
    gl.uniform1i(prog.u.u_positions, 0);
    gl.uniform1i(prog.u.u_texW, this.posTexW);
    gl.uniform2f(prog.u.u_camCenter, this.cam.x, this.cam.y);
    gl.uniform1f(prog.u.u_zoom, this.cam.k);
    gl.uniform2f(prog.u.u_resolution, this.cssWidth, this.cssHeight);
  }

  _frame() {
    if (this._destroyed || !this.gl) return;
    const gl = this.gl;

    // Clear first so a downstream issue can never leave a black canvas.
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);

    if (this._posDirty) this._uploadPositions();
    // Keep the graph framed while laying out (until the user takes control).
    if (this._autoFit) this._fitView();

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.posTex);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.atlas.texture);

    // Edges + markers (straight-alpha blend), under nodes.
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    if (this.edgeCount > 0) {
      gl.useProgram(this.progEdge.program);
      this._setCameraUniforms(this.progEdge);
      gl.bindVertexArray(this.vaoEdge);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.edgeCount);

      gl.useProgram(this.progMarker.program);
      this._setCameraUniforms(this.progMarker);
      gl.bindVertexArray(this.vaoMarker);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 3, this.edgeCount);
    }

    // Edge labels (premultiplied), above edges.
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    if (this.edgeLabelCount > 0) {
      gl.useProgram(this.progEdgeLabel.program);
      this._setCameraUniforms(this.progEdgeLabel);
      gl.uniform1i(this.progEdgeLabel.u.u_atlas, 1);
      gl.bindVertexArray(this.vaoEdgeLabel);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.edgeLabelCount);
    }

    // Nodes.
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    if (this.nodeCount > 0) {
      gl.useProgram(this.progNode.program);
      this._setCameraUniforms(this.progNode);
      gl.bindVertexArray(this.vaoNode);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.nodeCount);
    }

    // Node labels on top.
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    if (this.nodeLabelCount > 0) {
      gl.useProgram(this.progNodeLabel.program);
      this._setCameraUniforms(this.progNodeLabel);
      gl.uniform1i(this.progNodeLabel.u.u_atlas, 1);
      gl.bindVertexArray(this.vaoNodeLabel);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.nodeLabelCount);
    }

    gl.bindVertexArray(null);
  }

  // ---- resize ------------------------------------------------------------

  resize() {
    const dpr = window.devicePixelRatio || 1;
    // Fill from the canvas top to the viewport bottom so the height:100% chain
    // can't make the canvas taller than the window. Don't clear style.height
    // first (rect.top doesn't depend on it; clearing would loop the observer).
    const rect = this.canvas.getBoundingClientRect();
    const parent = this.canvas.parentElement;
    let cssW = this.canvas.clientWidth || (parent && parent.clientWidth) || window.innerWidth || 1;
    let cssH = Math.floor((window.innerHeight || 600) - rect.top - 2);
    if (!cssH || cssH < 60) {
      cssH = Math.max(60, this.canvas.clientHeight || 400);
    }
    this.canvas.style.height = cssH + "px";
    // Cache so the render loop never reads layout properties (avoids reflow).
    this._cssW = cssW;
    this._cssH = cssH;
    const w = Math.max(1, Math.floor(cssW * dpr));
    const h = Math.max(1, Math.floor(cssH * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this._requestFrame();
  }

  observeResize() {
    if (typeof ResizeObserver === "undefined") return;
    // Defer resize to a rAF (coalesced) and observe the container, to avoid the
    // benign "ResizeObserver loop" warning the dev-server overlay flags.
    this._ro = new ResizeObserver(() => {
      if (this._roScheduled || this._destroyed) return;
      this._roScheduled = true;
      requestAnimationFrame(() => {
        this._roScheduled = false;
        if (!this._destroyed) this.resize();
      });
    });
    this._ro.observe(this.canvas.parentElement || this.canvas);
  }

  // ---- SVG export --------------------------------------------------------

  // Reconstruct the current view as SVG text (for downloadSVG/exportAsSvgText).
  exportSvg() {
    const pos = this.layout && this.layout.positions;
    if (!pos) return "<svg xmlns='http://www.w3.org/2000/svg'></svg>";
    const idx = this.layout.idToIndex;
    const parts = [];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const expand = (x, y) => {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    };

    // Edges + markers (under nodes).
    const edgeSvg = [];
    for (let j = 0; j < this.edgeCount; j++) {
      const d = this.edgeDescs[j];
      if (!d || !d.lineVisible) continue;
      const si = idx.get(d.sourceId);
      const ti = idx.get(d.targetId);
      if (si === undefined || ti === undefined) continue;
      const x1 = pos[si * 2], y1 = pos[si * 2 + 1];
      const x2 = pos[ti * 2], y2 = pos[ti * 2 + 1];
      const sel = this.selectedEdgeIdx.has(j);
      const wWidth = sel ? 6 : d.width;
      expand(x1, y1); expand(x2, y2);
      edgeSvg.push(
        `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${rgbToHex(d.color)}" stroke-width="${wWidth}"/>`,
      );
      if (d.markerVisible) {
        const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
        const deg = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
        edgeSvg.push(
          `<path d="M-5 -5 L5 0 L-5 5 Z" transform="translate(${f(cx)} ${f(cy)}) scale(${sel ? 3.5 : 2.5}) rotate(${f(deg)})" fill="${rgbToHex(d.markerColor)}"/>`,
        );
      }
      if (d.labelVisible && d.label) {
        const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
        edgeSvg.push(
          `<text x="${f(cx)}" y="${f(cy - EDGE_LABEL_MARGIN)}" font-size="${d.labelFontPx || 30}" font-family="Arial, sans-serif" text-anchor="middle" fill="#000000">${esc(d.label)}</text>`,
        );
      }
    }

    // Nodes + labels (on top).
    const nodeSvg = [];
    for (let i = 0; i < this.nodeCount; i++) {
      const d = this.nodeDescs[i];
      if (!d || !d.visible) continue;
      const cx = pos[i * 2] + d.offsetX;
      const cy = pos[i * 2 + 1] + d.offsetY;
      const x = cx - d.w / 2;
      const y = cy - d.h / 2;
      const sw = this.selectedNodeIdx.has(i) ? 6 : d.strokeW;
      expand(x, y); expand(x + d.w, y + d.h);
      nodeSvg.push(
        `<rect x="${f(x)}" y="${f(y)}" width="${f(d.w)}" height="${f(d.h)}" rx="${d.radius}" fill="${rgbToHex(d.fill)}" stroke="${rgbToHex(d.stroke)}" stroke-width="${sw}"/>`,
      );
      if (d.label) {
        const lx = pos[i * 2] + d.labelAnchorX;
        const ly = pos[i * 2 + 1];
        nodeSvg.push(
          `<text x="${f(lx)}" y="${f(ly)}" font-size="${d.fontPx}" font-family="Arial, sans-serif" font-weight="${d.bold ? "bold" : "normal"}" text-anchor="middle" dominant-baseline="middle" fill="#ffffff">${esc(d.label)}<title>${esc(d.tooltip || d.label)}</title></text>`,
        );
      }
    }

    if (!isFinite(minX)) {
      minX = 0; minY = 0; maxX = 1; maxY = 1;
    }
    const pad = 50;
    const vbX = minX - pad, vbY = minY - pad;
    const vbW = maxX - minX + pad * 2, vbH = maxY - minY + pad * 2;
    parts.push(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f(vbX)} ${f(vbY)} ${f(vbW)} ${f(vbH)}">`,
    );
    parts.push(`<rect x="${f(vbX)}" y="${f(vbY)}" width="${f(vbW)}" height="${f(vbH)}" fill="#ffffff"/>`);
    parts.push(edgeSvg.join(""));
    parts.push(nodeSvg.join(""));
    parts.push("</svg>");
    return parts.join("");
  }

  // ---- teardown ----------------------------------------------------------

  destroy() {
    if (this._destroyed) return; // idempotent
    this._destroyed = true;
    LIVE_RENDERERS.delete(this);
    if (this._raf) cancelAnimationFrame(this._raf);
    const c = this.canvas;
    if (this._handlers) {
      c.removeEventListener("pointerdown", this._handlers.down);
      c.removeEventListener("pointermove", this._handlers.move);
      window.removeEventListener("pointerup", this._handlers.up);
      c.removeEventListener("wheel", this._handlers.wheel);
      c.removeEventListener("dblclick", this._handlers.dbl);
      c.removeEventListener("contextmenu", this._handlers.ctx);
      c.removeEventListener("pointerleave", this._handlers.leave);
    }
    if (this._ro) this._ro.disconnect();
    if (this.tooltipEl && this.tooltipEl.parentElement) {
      this.tooltipEl.parentElement.removeChild(this.tooltipEl);
    }
    if (this.atlas) this.atlas.destroy();
    const gl = this.gl;
    if (gl) {
      const ext = gl.getExtension("WEBGL_lose_context");
      if (ext) ext.loseContext();
    }
    this.gl = null;
    this.layout = null;
  }
}

// ---- free helpers --------------------------------------------------------

function pointSegDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

function f(n) {
  return Math.round(n * 100) / 100;
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
