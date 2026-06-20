// d3-force wrapper replacing v-network-graph's ForceLayout. Keeps the sim nodes
// + a flat positions Float32Array (written each tick, read by the renderer), and
// reproduces the drag/alt-click pin behavior. Hidden nodes stay in the sim.
import * as d3 from "d3-force";

// Track live layouts so a hot-reload can't leave old simulations ticking.
const LIVE_LAYOUTS = new Set();

export class GraphLayout {
  constructor() {
    // stop any previous layout's simulation first
    for (const l of Array.from(LIVE_LAYOUTS)) {
      try {
        l.destroy();
      } catch (e) {
        void e;
      }
    }
    LIVE_LAYOUTS.add(this);

    this.nodeIds = [];
    this.idToIndex = new Map();
    this.layoutNodes = [];
    this.layoutNodeMap = new Map();
    this.edgePairs = [];
    this.positions = new Float32Array(0);
    this.sim = null;
    /** Renderer hooks this to flag a redraw when positions move. */
    this.onPositionsChanged = null;
  }

  /**
   * (Re)build the layout from the component's reactive graph.
   * @param {Record<string, any>} nodesObj nodes keyed by id (this.nodes)
   * @param {Array<any>} edgesArr edges with .source/.target (this.edges)
   */
  build(nodesObj, edgesArr) {
    this.nodeIds = Object.keys(nodesObj);
    this.idToIndex = new Map(this.nodeIds.map((id, i) => [id, i]));
    this.layoutNodes = this.nodeIds.map((id, i) => ({ id, index: i }));
    this.layoutNodeMap = new Map(this.layoutNodes.map((n) => [n.id, n]));
    this.edgePairs = [];
    for (const e of edgesArr) {
      const s = e.source;
      const t = e.target;
      if (this.idToIndex.has(s) && this.idToIndex.has(t)) {
        this.edgePairs.push({ source: s, target: t });
      }
    }
    this.positions = new Float32Array(this.nodeIds.length * 2);
  }

  get nodeCount() {
    return this.nodeIds.length;
  }

  indexOf(id) {
    return this.idToIndex.get(id);
  }

  /** Fresh sim-edge objects each time (forceLink mutates source/target). */
  _freshSimEdges() {
    return this.edgePairs.map((p) => ({ source: p.source, target: p.target }));
  }

  /**
   * Create/replace the simulation. `makeFn(d3, nodes, edges)` must return a d3
   * simulation; it is the component's original createSimulation config.
   * @param {(d3lib:any, nodes:any[], edges:any[]) => any} makeFn
   */
  createSimulation(makeFn) {
    if (this.sim) this.sim.stop();
    const sim = makeFn(d3, this.layoutNodes, this._freshSimEdges());
    this.sim = sim;
    sim.on("tick", () => this._tick());
    this._tick(); // seed positions immediately (d3 places nodes on construction)
    return sim;
  }

  _tick() {
    const pos = this.positions;
    const nodes = this.layoutNodes;
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      pos[i * 2] = n.x || 0;
      pos[i * 2 + 1] = n.y || 0;
    }
    if (this.onPositionsChanged) this.onPositionsChanged();
  }

  /** Gentle restart (matches v-network-graph's internal `v()` helper). */
  restart() {
    if (this.sim) this.sim.alpha(0.1).restart();
  }

  /** Stop ticking but keep positions (used by Pause / unmount). */
  stop() {
    if (this.sim) this.sim.stop();
  }

  dragStart() {
    // Pinning happens on move (mirrors v-network-graph's pointermove handler).
  }

  dragMove(id, wx, wy) {
    const n = this.layoutNodeMap.get(id);
    if (!n) return;
    n.fx = wx;
    n.fy = wy;
    this.restart();
    // Reflect immediately so the dragged node tracks the cursor even when the
    // simulation is paused.
    const idx = this.idToIndex.get(id);
    if (idx !== undefined) {
      this.positions[idx * 2] = wx;
      this.positions[idx * 2 + 1] = wy;
      if (this.onPositionsChanged) this.onPositionsChanged();
    }
  }

  dragEnd(id) {
    // positionFixedByDrag: true -> keep the node pinned where it was dropped.
    const n = this.layoutNodeMap.get(id);
    if (!n) return;
    n.fixed = true;
    this.restart();
  }

  /** Alt+click toggles a node between pinned and free. */
  toggleFixed(id) {
    const n = this.layoutNodeMap.get(id);
    if (!n) return;
    if (n.fixed) {
      delete n.fixed;
      delete n.fx;
      delete n.fy;
    } else {
      n.fixed = true;
      n.fx = n.x;
      n.fy = n.y;
    }
    this.restart();
  }

  isFixed(id) {
    const n = this.layoutNodeMap.get(id);
    return !!(n && n.fixed);
  }

  getPosition(id) {
    const idx = this.idToIndex.get(id);
    if (idx === undefined) return null;
    return { x: this.positions[idx * 2], y: this.positions[idx * 2 + 1] };
  }

  destroy() {
    LIVE_LAYOUTS.delete(this);
    if (this.sim) {
      this.sim.on("tick", null);
      this.sim.stop();
      this.sim = null;
    }
    this.onPositionsChanged = null;
  }
}
