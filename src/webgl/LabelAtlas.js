// Per-glyph texture atlas for GPU label rendering. Each unique (char,fontPx,
// weight) is rasterized once in white (tinted per-instance in the shader), and
// labels are drawn as runs of instanced quads — scales to many labels without
// huge per-word textures. Cells are `advance` wide / `lineHeight` tall at the
// alphabetic baseline, so spacing matches the browser.

// Match the app shell (#app { font-family: Arial }).
const FONT_FAMILY = "Arial, sans-serif";

export class LabelAtlas {
  /**
   * @param {WebGL2RenderingContext} gl
   * @param {object} [opts]
   * @param {number} [opts.superSample] texel oversampling for crisp text
   * @param {number} [opts.maxSize] max atlas dimension (px)
   */
  constructor(gl, opts = {}) {
    this.gl = gl;
    this.superSample = opts.superSample || Math.min(Math.max(window.devicePixelRatio || 1, 2), 3);
    this.maxSize = opts.maxSize || 4096;
    this.size = 1024;
    this.pad = 1; // texel gap between cells to avoid bleeding

    this.glyphs = new Map(); // key -> entry
    this.order = []; // keys in insertion order (for re-raster on grow)
    this.fonts = new Map(); // fontKey -> { ascent, descent, lineHeight }
    this.version = 0; // bumped whenever texels change (renderer ignores; binds live texture)

    // 2D scratch canvas used to rasterize one glyph at a time.
    this.scratch = document.createElement("canvas");
    this.sctx = this.scratch.getContext("2d", { willReadFrequently: false });

    this.texture = this._createTexture(this.size);
    this._resetPacker();
  }

  _createTexture(size) {
    const gl = this.gl;
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA8,
      size,
      size,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  }

  _resetPacker() {
    this.cursorX = this.pad;
    this.cursorY = this.pad;
    this.rowHeight = 0;
  }

  _fontKey(fontPx, weight) {
    return `${weight}|${fontPx}`;
  }

  _cssFont(fontPx, weight, scale = 1) {
    return `${weight} ${Math.round(fontPx * scale)}px ${FONT_FAMILY}`;
  }

  /**
   * Per-font vertical metrics in logical units (cached).
   * @returns {{ascent:number, descent:number, lineHeight:number}}
   */
  fontMetrics(fontPx, weight) {
    const key = this._fontKey(fontPx, weight);
    let m = this.fonts.get(key);
    if (m) return m;
    const ctx = this.sctx;
    ctx.font = this._cssFont(fontPx, weight);
    ctx.textBaseline = "alphabetic";
    const tm = ctx.measureText("ÁgjyМ|");
    let ascent = tm.fontBoundingBoxAscent;
    let descent = tm.fontBoundingBoxDescent;
    if (!ascent || !descent) {
      // Fallback for engines without fontBoundingBox metrics.
      ascent = tm.actualBoundingBoxAscent || fontPx * 0.8;
      descent = tm.actualBoundingBoxDescent || fontPx * 0.25;
    }
    m = { ascent, descent, lineHeight: ascent + descent };
    this.fonts.set(key, m);
    return m;
  }

  /**
   * Get (rasterizing on demand) a glyph entry.
   * @returns {{uv:number[], advance:number, w:number, h:number,
   *            ascent:number, lineHeight:number}}
   */
  ensureGlyph(char, fontPx, weight) {
    const key = `${weight}|${fontPx}|${char}`;
    const existing = this.glyphs.get(key);
    if (existing) return existing;
    const entry = this._rasterize(char, fontPx, weight, key);
    this.glyphs.set(key, entry);
    this.order.push(key);
    return entry;
  }

  _rasterize(char, fontPx, weight, key) {
    const gl = this.gl;
    const ss = this.superSample;
    const fm = this.fontMetrics(fontPx, weight);

    const ctx = this.sctx;
    ctx.font = this._cssFont(fontPx, weight);
    const advance = Math.max(ctx.measureText(char).width, 1);

    const cellW = Math.max(1, Math.ceil(advance * ss));
    const cellH = Math.max(1, Math.ceil(fm.lineHeight * ss));

    // Shelf-pack: advance the cursor, wrapping rows as needed.
    if (this.cursorX + cellW + this.pad > this.size) {
      this.cursorX = this.pad;
      this.cursorY += this.rowHeight + this.pad;
      this.rowHeight = 0;
    }
    if (this.cursorY + cellH + this.pad > this.size) {
      // Out of room: grow and re-raster everything already placed.
      if (this._grow()) return this._rasterize(char, fontPx, weight, key);
      // Cannot grow further; clamp into the last row (degraded but safe).
    }
    const x = this.cursorX;
    const y = this.cursorY;
    this.cursorX += cellW + this.pad;
    this.rowHeight = Math.max(this.rowHeight, cellH);

    // Draw the glyph white onto a transparent scratch cell, then upload it.
    this.scratch.width = cellW;
    this.scratch.height = cellH;
    ctx.clearRect(0, 0, cellW, cellH);
    ctx.font = this._cssFont(fontPx, weight, ss);
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(char, 0, fm.ascent * ss);

    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      x,
      y,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      this.scratch,
    );
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    this.version++;

    const s = this.size;
    return {
      uv: [x / s, y / s, (x + cellW) / s, (y + cellH) / s],
      advance,
      w: advance,
      h: fm.lineHeight,
      ascent: fm.ascent,
      lineHeight: fm.lineHeight,
    };
  }

  _grow() {
    if (this.size >= this.maxSize) return false;
    const gl = this.gl;
    this.size = Math.min(this.size * 2, this.maxSize);
    gl.deleteTexture(this.texture);
    this.texture = this._createTexture(this.size);
    // Re-raster all previously placed glyphs into the larger page.
    const previous = this.order;
    this.glyphs.clear();
    this.order = [];
    this._resetPacker();
    for (const k of previous) {
      const parts = k.split("|");
      const weight = parts[0];
      const fontPx = parseInt(parts[1], 10);
      const char = parts.slice(2).join("|");
      const entry = this._rasterize(char, fontPx, weight, k);
      this.glyphs.set(k, entry);
      this.order.push(k);
    }
    return true;
  }

  destroy() {
    if (this.texture) {
      this.gl.deleteTexture(this.texture);
      this.texture = null;
    }
    this.glyphs.clear();
    this.fonts.clear();
    this.order = [];
  }
}
