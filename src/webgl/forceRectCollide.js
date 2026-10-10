// Rectangular collision force for d3-force.
//
// d3's own forceCollide treats every node as a circle. Our nodes are wide, flat
// label boxes — roughly 240 by 50 — so a circle big enough to stop two of them
// overlapping side by side also holds them about 240 apart vertically, five
// times further than they need, and the graph falls apart. This force resolves
// the real rectangles instead and pushes each overlapping pair apart along
// whichever axis they overlap least, so boxes separate sideways without being
// spread vertically.
//
// Structure follows d3-force's own collide: a quadtree per pass, carrying the
// largest half-extent in each branch so whole branches can be skipped.
import { quadtree } from "d3-quadtree";

const DEFAULT_PADDING = 12;
const DEFAULT_STRENGTH = 0.8;
const DEFAULT_ITERATIONS = 2;

/**
 * Builds the force.
 * @param {(node:any) => {w:number, h:number, offsetX?:number}} sizeOf Returns
 *   the drawn box for a simulation node. offsetX is how far the box centre sits
 *   from the node position, which is non-zero for short labels.
 * @returns {Function} A d3 force with chainable padding/strength/iterations.
 */
export function forceRectCollide(sizeOf) {
  let nodes = [];
  let halfW = [];
  let halfH = [];
  let shiftX = [];
  let padding = DEFAULT_PADDING;
  let strength = DEFAULT_STRENGTH;
  let iterations = DEFAULT_ITERATIONS;

  // Centre of the drawn box, which is where the collision happens — not the
  // node position, which can sit off to one side of it.
  const boxX = (node) => node.x + node.vx + shiftX[node.index];
  const boxY = (node) => node.y + node.vy;

  // Carry the widest and tallest box of each branch up the tree, so a branch
  // that cannot reach the node being tested is skipped whole.
  function prepare(quad) {
    if (quad.data) {
      quad.hw = halfW[quad.data.index];
      quad.hh = halfH[quad.data.index];
      // Coincident points share a leaf as a linked list.
      for (let q = quad.next; q; q = q.next) {
        if (halfW[q.data.index] > quad.hw) quad.hw = halfW[q.data.index];
        if (halfH[q.data.index] > quad.hh) quad.hh = halfH[q.data.index];
      }
      return;
    }
    quad.hw = 0;
    quad.hh = 0;
    for (let i = 0; i < 4; i++) {
      if (!quad[i]) continue;
      if (quad[i].hw > quad.hw) quad.hw = quad[i].hw;
      if (quad[i].hh > quad.hh) quad.hh = quad[i].hh;
    }
  }

  /** Pushes one overlapping pair apart along their shallower axis. */
  function separate(a, b, ax, ay, hwa, hha, k) {
    let dx = boxX(b) - ax;
    let dy = boxY(b) - ay;
    const overlapX = hwa + halfW[b.index] - Math.abs(dx);
    const overlapY = hha + halfH[b.index] - Math.abs(dy);
    if (overlapX <= 0 || overlapY <= 0) return;
    // Two boxes at exactly the same point have no direction to separate in.
    if (dx === 0 && dy === 0) dx = 1e-6;
    // Compare how deeply the boxes engage on each axis as a fraction of their
    // own size, not in raw pixels. These boxes are about five times wider than
    // they are tall, so in raw pixels the vertical overlap is almost always the
    // smaller one and every node ends up stacked in a single column.
    const spanX = hwa + halfW[b.index];
    const spanY = hha + halfH[b.index];
    if (overlapX / spanX < overlapY / spanY) {
      const push = (dx < 0 ? -overlapX : overlapX) * 0.5 * k;
      a.vx -= push;
      b.vx += push;
    } else {
      const push = (dy < 0 ? -overlapY : overlapY) * 0.5 * k;
      a.vy -= push;
      b.vy += push;
    }
  }

  // No alpha term, matching d3's own collide: overlap is a hard constraint, not
  // a pull that should fade out. Scaling by alpha let boxes settle overlapping,
  // because the force went to nothing before it had finished separating them.
  function force() {
    const k = strength;
    for (let pass = 0; pass < iterations; pass++) {
      const tree = quadtree(nodes, boxX, boxY).visitAfter(prepare);
      for (const node of nodes) {
        const hwa = halfW[node.index];
        const hha = halfH[node.index];
        const ax = boxX(node);
        const ay = boxY(node);
        tree.visit((quad, x0, y0, x1, y1) => {
          if (quad.data) {
            for (let q = quad; q; q = q.next) {
              // Each pair once, and never a node against itself.
              if (q.data.index > node.index) {
                separate(node, q.data, ax, ay, hwa, hha, k);
              }
            }
            return;
          }
          const reachX = hwa + quad.hw;
          const reachY = hha + quad.hh;
          return (
            x0 > ax + reachX ||
            x1 < ax - reachX ||
            y0 > ay + reachY ||
            y1 < ay - reachY
          );
        });
      }
    }
  }

  force.initialize = function (simNodes) {
    nodes = simNodes;
    halfW = new Array(nodes.length);
    halfH = new Array(nodes.length);
    shiftX = new Array(nodes.length);
    for (const node of nodes) {
      const box = sizeOf(node);
      // Half the gap on each box, so a pair ends up a full gap apart.
      halfW[node.index] = box.w / 2 + padding / 2;
      halfH[node.index] = box.h / 2 + padding / 2;
      shiftX[node.index] = box.offsetX || 0;
    }
  };

  force.padding = function (value) {
    if (value === undefined) return padding;
    padding = +value;
    if (nodes.length) force.initialize(nodes);
    return force;
  };

  force.strength = function (value) {
    if (value === undefined) return strength;
    strength = +value;
    return force;
  };

  force.iterations = function (value) {
    if (value === undefined) return iterations;
    iterations = +value;
    return force;
  };

  return force;
}
