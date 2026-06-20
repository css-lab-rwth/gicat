<template>
  <v-main style="border-right: 4px solid">
    <div class="network">
      <div class="network-nav">
        <v-btn
          v-on:click="downloadSVG()"
          prepend-icon="$fileExport"
          class="button"
        >
          Download
        </v-btn>
        <br />
        <br />
        <v-btn
          v-on:click="toggleSimulation()"
          prepend-icon="$playpause"
          class="button"
        >
          {{ playPause }}
        </v-btn>
        <v-select
          class="filter-selector"
          label="Select..."
          :items="this.filters"
          density="compact"
          multiple
          chips
          name="id"
          item-title="name"
          v-model="this.filtersSelected"
        ></v-select>
        <v-slider
          v-model="dist"
          :step="50"
          :min="-1000"
          :max="2000"
          class="slider"
          label="Edge distance:"
          rounded="0"
        ></v-slider>
        <v-slider
          v-model="strength"
          :step="0.05"
          :min="0"
          :max="2"
          class="slider"
          label="Edge strength:"
          rounded="0"
        ></v-slider>
        <v-slider
          v-model="charge"
          :step="500"
          :min="-20000"
          :max="0"
          class="slider"
          label="Graph strength:"
          rounded="0"
        ></v-slider>
      </div>

      <div class="renderer">
        <v-btn
          icon
          @click.stop="handleMetricsDrawer()"
          class="position-fixed"
          :style="{ right: drawer ? '250px' : '0', zIndex: 10 }"
          variant="text"
        >
          <v-icon>{{ drawer ? "$outRight" : "$outLeft" }}</v-icon>
        </v-btn>
        <v-navigation-drawer
          v-model="drawer"
          v-if="drawer !== null"
          location="right"
          :permanent="false"
          :disable-resize-watcher="true"
          :disable-route-watcher="true"
          :touchless="true"
          :scrim="false"
        >
          <v-list>
            <v-tooltip location="top">
              <template #activator="{ props }">
                <v-list-subheader
                  v-bind="props"
                  class="text-center justify-center"
                >
                  NODE FREQUENCY THRESHOLD
                </v-list-subheader>
              </template>
              <span>
                This shows the node labels that appear most frequently in the
                graph. You can adjust the slider to increase or decrease the
                threshold.
              </span>
            </v-tooltip>

            <v-list-item>
              <v-slider
                v-model="frequencySlider"
                class="mt-8"
                label="Frequency:"
                step="1"
                :max="10"
                :min="1"
                rounded="0"
                thumb-label="always"
                @update:model-value="getFrequentNodes(frequencySlider)"
              ></v-slider>
            </v-list-item>
            <v-list-item
              v-for="(value, key) in getFrequentNodes(frequencySlider)"
              :key="key"
              @click="highlightNodesByLabel(key)"
              :class="{
                'highlighted-entry': highlightedDrawerLabels.includes(key),
              }"
            >
              <v-list-item-content>
                <v-list-item-title>{{ key }}</v-list-item-title>
                <v-list-item-subtitle>
                  Frequency: {{ value }}
                </v-list-item-subtitle>
                <v-menu
                  v-model="colorMenus['n:' + key]"
                  :close-on-content-click="false"
                >
                  <template #activator="{ props }">
                    <v-icon
                      v-bind="props"
                      class="mr-2"
                      icon="$chevronDown"
                    ></v-icon>
                  </template>
                  <v-color-picker
                    hide-inputs
                    :model-value="getLabelColor(key)"
                    @update:model-value="setLabelColor(key, $event)"
                    width="300"
                  >
                    <template #actions>
                      <div
                        style="
                          display: flex;
                          align-items: center;
                          justify-content: space-between;
                          width: 100%;
                        "
                      >
                        <v-tooltip text="reset" location="top">
                          <template #activator="{ props }">
                            <v-icon
                              v-bind="props"
                              @click="setLabelColor(key, '#000000')"
                              icon="$undo"
                              style="cursor: pointer"
                            ></v-icon>
                          </template>
                        </v-tooltip>
                        <v-btn
                          size="small"
                          variant="tonal"
                          color="primary"
                          @click="colorMenus['n:' + key] = false"
                        >
                          Apply
                        </v-btn>
                      </div>
                    </template>
                  </v-color-picker>
                </v-menu>
              </v-list-item-content>
            </v-list-item>
            <v-tooltip location="top">
              <template #activator="{ props }">
                <v-list-subheader
                  v-bind="props"
                  class="text-center justify-center"
                >
                  FREQUENT TARGET NODES
                </v-list-subheader>
              </template>
              <span>
                These are nodes that are most frequently targeted by edges (i.e.
                most incoming connections).
              </span>
            </v-tooltip>

            <v-list-item
              v-for="target in getFrequentTargets(frequencySlider)"
              :key="target.node"
              @click="highlightNodesByLabel(target.label)"
              :class="{
                'highlighted-entry': highlightedDrawerLabels.includes(
                  target.label,
                ),
              }"
            >
              <v-list-item-content>
                <v-list-item-title>
                  {{ target.label }}
                </v-list-item-title>
                <v-list-item-subtitle>
                  Target of {{ target.count }} nodes
                </v-list-item-subtitle>
                <v-menu
                  v-model="colorMenus['t:' + target.label]"
                  :close-on-content-click="false"
                >
                  <template #activator="{ props }">
                    <v-icon
                      v-bind="props"
                      class="mr-2"
                      icon="$chevronDown"
                    ></v-icon>
                  </template>
                  <v-color-picker
                    hide-inputs
                    :model-value="getLabelColor(target.label)"
                    @update:model-value="setLabelColor(target.label, $event)"
                    width="300"
                  >
                    <template #actions>
                      <div
                        style="
                          display: flex;
                          justify-content: space-between;
                          align-items: center;
                          width: 100%;
                        "
                      >
                        <v-tooltip text="reset" location="top">
                          <template #activator="{ props }">
                            <v-icon
                              v-bind="props"
                              @click="setLabelColor(target.label, '#000000')"
                              icon="$undo"
                              style="cursor: pointer"
                            ></v-icon>
                          </template>
                        </v-tooltip>
                        <v-btn
                          size="small"
                          variant="tonal"
                          color="primary"
                          @click="colorMenus['t:' + target.label] = false"
                        >
                          Apply
                        </v-btn>
                      </div>
                    </template>
                  </v-color-picker>
                </v-menu>
              </v-list-item-content>
            </v-list-item>
          </v-list>
        </v-navigation-drawer>
        <canvas ref="glcanvas" class="graph"></canvas>
      </div>
    </div>
  </v-main>
</template>

<script>
import { ref, markRaw } from "vue";
import { mapActions, mapGetters } from "vuex";
import { persistentStore } from "../store/persistentStore";
import { GraphLayout } from "../webgl/GraphLayout";
import { WebGLGraphRenderer } from "../webgl/WebGLGraphRenderer";
import { parseColor } from "../webgl/glUtils";
const os = require("node:os");

export default {
  setup() {
    const graph = markRaw(ref(null));
    return { graph };
  },
  mounted() {
    this.initGraph();

    // d3-force layout + WebGL renderer (markRaw to keep them out of reactivity).
    this.layout = markRaw(new GraphLayout());
    this.layout.build(this.nodes, this.edges);

    // remove any stray graph canvases a hot-reload may have left behind
    const liveCanvas = this.$refs.glcanvas;
    document.querySelectorAll("canvas.graph").forEach((c) => {
      if (c !== liveCanvas && c.parentElement) {
        c.parentElement.removeChild(c);
      }
    });

    this.renderer = markRaw(
      new WebGLGraphRenderer(this.$refs.glcanvas, {
        onNodeClick: (id, evt) => {
          this.leftClick(id);
          // alt+click toggles a node's pin
          if (evt && evt.altKey) this.layout.toggleFixed(id);
        },
        onNodeDblClick: (id) => this.doubleClick(id),
        onNodeContextMenu: () => this.rightClick(),
        onBackgroundClick: () => this.clearGraphSelection(),
        onNodeDragStart: (id) => this.layout.dragStart(id),
        onNodeDragMove: (id, x, y) => this.layout.dragMove(id, x, y),
        onNodeDragEnd: (id) => this.layout.dragEnd(id),
        getNodeTooltip: (id) => {
          const n = this.nodes[id];
          return n ? n.fullLabel || n.label || "" : "";
        },
      }),
    );
    this.renderer.attachLayout(this.layout);
    this.renderer.observeResize();
    this.refreshVisuals();

    this.layout.createSimulation((d3, nodes, edges) =>
      this.makeInitialSimulation(d3, nodes, edges),
    );

    // keep downloadSVG() working
    this.graph = markRaw({ exportAsSvgText: () => this.renderer.exportSvg() });

    this.drawer = false;
    this.$nextTick(() => this.renderer && this.renderer.resize());
  },
  beforeUnmount() {
    if (this.renderer) this.renderer.destroy();
    if (this.layout) this.layout.destroy();
  },
  data() {
    return {
      frequencySlider: 2,
      drawer: null,
      highlightedDrawerLabels: [],
      colorMenus: {}, // per-label open state for the color-picker menus

      playPause: "Pause",
      nodes: [],
      edges: [],
      filters: [],
      filtersSelected: [],
      dist: 0,
      strength: 1,
      charge: -12000,
      physicsEnabled: true,
      savedLayout: null,
      selectedNodes: [],
      labelColors: {}, // { [label]: color }
    };
  },
  name: "NetworkNewView",
  components: {},
  methods: {
    // store
    ...mapActions([
      "setNodes",
      "setEdges",
      "setGraph",
      "addNodeFilter",
      "addEdgeFilter",
      "addFilter",
    ]),

    // background click clears the selection (called from the renderer)
    clearGraphSelection() {
      console.log("Renderer background clicked, clearing selection");
      this.selectedNodes = [];
      this.highlightedDrawerLabels = [];
      // Set isActive to false for all nodes
      Object.values(this.nodes).forEach((node) => {
        if (node.meta) node.meta.active = false;
      });
      if (this.renderer) this.renderer.setSelection(this.selectedNodes);
    },

    // ---- WebGL renderer integration --------------------------------------

    // initial d3-force config (kept identical to the old ForceLayout)
    makeInitialSimulation(d3, nodes, edges) {
      const forceLink = d3.forceLink(edges).id((d) => d.id);
      const sim = d3
        .forceSimulation(nodes)
        .force("edge", forceLink.distance(this.dist).strength(this.strength))
        .force("charge", d3.forceManyBody().strength(this.charge))
        .force("collide", d3.forceCollide(5).iterations(4))
        .force("x", d3.forceX())
        .force("y", d3.forceY())
        .alphaMin(0.0001);
      this.simulation = sim;
      return sim;
    },

    // d3-force config used when forces change / on resume
    makeSimulation(d3, nodes, edges) {
      const forceLink = d3.forceLink(edges).id((d) => d.id);
      const sim = d3
        .forceSimulation(nodes)
        .force("edge", forceLink.distance(this.dist).strength(this.strength))
        .force("charge", d3.forceManyBody().strength(this.charge))
        .force("collide", d3.forceCollide(5).iterations(2))
        .force("x", d3.forceX())
        .force("y", d3.forceY())
        .alphaMin(0.01)
        .alphaDecay(0.05)
        .velocityDecay(0.9);
      this.simulation = sim;
      return sim;
    },

    // build the per-node/edge visual descriptors the renderer draws, using the
    // same helpers and numbers the old SVG template used
    buildRenderDescriptors() {
      const nodeIds = this.layout.nodeIds;
      const nodeDescs = new Array(nodeIds.length);
      for (let i = 0; i < nodeIds.length; i++) {
        const node = this.nodes[nodeIds[i]];
        const folder = this.isFolder(node);
        const len = node.name ? node.name.length : 0;
        const k = folder ? 20 : 12;
        const w = Math.max(len * k, 200);
        const h = 50;
        // rect center offset from the node position (rect drawn at x=-(len*k)/2)
        const offsetX = -(len * k) / 2 + w / 2;
        const labelAnchorX = len * k >= 200 ? 0 : (200 - len * k) / 2;
        nodeDescs[i] = {
          visible: !node.hidden && this.isFilterSelected(node),
          w,
          h,
          offsetX,
          offsetY: 0,
          fill: parseColor(node.color),
          stroke: parseColor(node.strokeColor),
          strokeW: 3,
          radius: folder ? 2 : 25,
          label: node.name || "",
          labelAnchorX,
          fontPx: folder ? 30 : 20,
          bold: folder,
          tooltip: node.fullLabel || node.label || "",
        };
      }

      const edgeDescs = new Array(this.edges.length);
      for (let j = 0; j < this.edges.length; j++) {
        const edge = this.edges[j];
        const hidden = !!this.edgeHidden(edge);
        const labelHidden = !!this.edgeLabelHidden(edge);
        // labeled & visible -> edge.color; hidden -> invisible; else black
        const lineVisible = !labelHidden;
        const markerVisible = !(hidden || labelHidden);
        const baseColor = edge.label ? parseColor(edge.color) : [0, 0, 0, 1];
        edgeDescs[j] = {
          sourceId: edge.source,
          targetId: edge.target,
          lineVisible,
          color: baseColor,
          width: 2,
          markerVisible,
          markerColor: [0, 0, 0, 1],
          label: edge.label,
          labelVisible: !labelHidden && !!edge.label,
          labelFontPx: 30,
        };
      }
      return { nodeDescs, edgeDescs };
    },

    refreshVisuals() {
      if (!this.renderer) return;
      const d = this.buildRenderDescriptors();
      this.renderer.updateVisuals(d.nodeDescs, d.edgeDescs);
    },

    makeTransform(center, edgePos, scale, hovered, selected) {
      const radian = Math.atan2(
        edgePos.target.y - edgePos.source.y,
        edgePos.target.x - edgePos.source.x,
      );
      const degree = (radian * 180.0) / Math.PI;

      if (hovered || selected) {
        return [
          `translate(${center.x} ${center.y})`,
          `scale(${scale * 3.5}, ${scale * 3.5})`,
          `rotate(${degree})`,
        ].join(" ");
      }
      return [
        `translate(${center.x} ${center.y})`,
        `scale(${scale * 2.5}, ${scale * 2.5})`,
        `rotate(${degree})`,
      ].join(" ");
    },

    handleMetricsDrawer() {
      this.drawer = !this.drawer;
    },

    getFrequentTargets(threshold) {
      const nodes = Object.values(this.nodes);
      const edges = this.edges;

      const nodeMap = {};
      nodes.forEach((n) => (nodeMap[n.id] = n));

      // Count incoming edges for each target node, and also count how many are from active filter nodes
      const counts = {};
      const filteredCounts = {};

      edges.forEach((edge) => {
        const target = edge.to;
        const sourceNode = nodeMap[edge.from];
        counts[target] = (counts[target] || 0) + 1;
        if (sourceNode && this.isFilterSelected(sourceNode)) {
          filteredCounts[target] = (filteredCounts[target] || 0) + 1;
        }
      });

      // Map counts to objects with node ID, label, and count
      const result = Object.entries(counts).map(([nodeId, count]) => {
        const match = nodeMap[nodeId];
        return {
          node: nodeId,
          label: match ? match.label : nodeId,
          count: count,
          nodeObj: match,
          filteredCount: filteredCounts[nodeId] || 0,
        };
      });

      // For file nodes: show only if filteredCount >= threshold
      // For non-file nodes: show if count >= threshold and node is in active filter
      const filtered = result.filter((entry) => {
        if (!entry.nodeObj) return false;
        if (this.isFile(entry.nodeObj)) {
          return entry.filteredCount >= threshold;
        } else {
          return (
            entry.count >= threshold && this.isFilterSelected(entry.nodeObj)
          );
        }
      });
      filtered.sort((a, b) => b.count - a.count);
      return filtered;
    },

    getFrequentNodes(i) {
      const occ = {};
      for (let node of this.getNodes) {
        occ[node.label] = (occ[node.label] || 0) + 1;
      }

      // Filter and create array of [label, frequency]
      const filteredArr = Object.entries(occ)
        .filter(([label, freq]) => {
          const nodeObj = this.getNodes.find((n) => n.label === label);
          return freq > i && nodeObj && this.isFilterSelected(nodeObj);
        })
        .sort((a, b) => b[1] - a[1]);

      const sortedObj = Object.fromEntries(filteredArr);
      return sortedObj;
    },
    getNodeFilterNumbers(i) {
      var j = 0;
      for (let k = 0; k < this.getNodes.length; k++) {
        if (this.getNodes[k].meta.filterID === i) {
          j++;
        }
      }
      return "Quantity: " + j;
    },
    initGraph() {
      let inputNodes = JSON.parse(JSON.stringify(this.getNodes));
      let inputEdges = JSON.parse(JSON.stringify(this.getEdges));

      inputNodes.forEach((node, index) => {
        node.childrenCollapsed = false;
        node.hidden = false;
        node.index = index;
        node.hiddenCounter = 0;
        node.fullLabel = node.label;
        node.name = node.label ? node.label.substring(0, 20) : "";
        node.color = node.meta.color;
        node.strokeColor = "#000000"; // default border color
        // Initialize labelColors if not set
        if (!this.labelColors[node.label]) {
          this.labelColors[node.label] = node.color || "#2196f3";
        }
        node.meta = node.meta || {};
        node.selected = false;
      });

      inputEdges.forEach((edge) => {
        edge.hidden = false;
        edge.hiddenCounter = 0;
        edge.source = edge.from; // Make sure edge.from is a valid node id
        edge.target = edge.to; // Make sure edge.to is a valid node id
        edge.color = edge.meta.color;
      });

      // Use object for nodes, array for edges
      this.nodes = Object.fromEntries(
        inputNodes.map((node) => [node.id, node]),
      );
      this.edges = inputEdges; // <-- Use array for edges

      let appliedFilters = this.getFilterItems();
      this.filters = appliedFilters;
    },
    getFilterItems() {
      return this.getFilters.map((filter) => {
        return {
          name: filter.name,
          value: filter.id,
        };
      });
    },
    isFilterSelected(node) {
      if (node.meta?.filterID) {
        return this.filtersSelected.includes(node.meta.filterID);
      }
      return true;
    },
    isEdgeFilterSelected(edge) {
      if (edge.meta?.filter) {
        return this.filtersSelected.includes(edge.meta.filter);
      }
      return true;
    },
    changeObjectKey(o, old_key, new_key) {
      if (old_key !== new_key) {
        Object.defineProperty(
          o,
          new_key,
          Object.getOwnPropertyDescriptor(o, old_key),
        );
        delete o[old_key];
      }
    },
    back() {
      this.$router.push("/extractor");
    },
    doubleClick(hitNodeIndex) {
      //console.warn("double click");

      let hitNode = this.nodes[hitNodeIndex];
      if (hitNode.hidden) return;
      let isFolder = this.isFolder(hitNode);
      if (isFolder) {
        this.collapseChildren(hitNode);
      } else {
        this.openFile(hitNodeIndex);
      }
    },
    rightClick() {
      console.log("collapse children of node: ");
      this.getNodes.forEach((node) => {
        console.log(node.label);
      });
    },
    leftClick(nodeId) {
      let selectedNode = this.nodes[nodeId];
      selectedNode.meta.active = !selectedNode.meta.active;
      console.log(
        selectedNode.label + " is active: " + selectedNode.meta.active,
      );

      if (selectedNode.meta.active) {
        // Add to selectedNodes if not already present
        if (!this.selectedNodes.includes(nodeId)) {
          this.selectedNodes.push(nodeId);
        }
      } else {
        // Remove from selectedNodes
        this.selectedNodes = this.selectedNodes.filter((id) => id !== nodeId);
      }
      if (this.renderer) this.renderer.setSelection(this.selectedNodes);
    },
    highlightNodesByLabel(label) {
      const idx = this.highlightedDrawerLabels.indexOf(label);
      if (idx === -1) {
        this.highlightedDrawerLabels.push(label);
      } else {
        this.highlightedDrawerLabels.splice(idx, 1);
      }
      // Find matching nodes
      const nodeIds = Object.keys(this.nodes);
      const matchingNodeIds = nodeIds.filter((nodeId) => {
        const node = this.nodes[nodeId];
        return node && node.label === label;
      });

      // Trigger leftClick for each matching node to simulate actual clicks
      matchingNodeIds.forEach((nodeId) => {
        this.leftClick(nodeId);
      });
    },
    collapseChildren(hitNode) {
      console.warn("collapse children");
      if (hitNode.childrenCollapsed) {
        hitNode.childrenCollapsed = false;
      } else {
        hitNode.childrenCollapsed = true;
      }
      let isChildren = (e) => e.id.startsWith(hitNode.id) && e.id != hitNode.id;
      let children = Object.values(this.nodes).filter((e) => isChildren(e));
      children.forEach((element) => {
        if (hitNode.childrenCollapsed) {
          this.hideNode(element);
        } else {
          this.showNode(element);
        }
      });
      this.refreshVisuals();
    },

    hideNode(node) {
      node.hidden = true;
      node.hiddenCounter += 1;
    },
    showNode(node) {
      if (node.hiddenCounter > 0) {
        node.hiddenCounter -= 1;
      }
      if (node.hiddenCounter === 0) {
        node.hidden = false;
      }
    },
    edgeHidden(edge) {
      return (
        this.nodes[edge.source].hidden |
        this.nodes[edge.target].hidden |
        !this.isFilterSelected(this.nodes[edge.source]) |
        !this.isFilterSelected(this.nodes[edge.target])
      );
    },
    edgeLabelHidden(edge) {
      return (
        this.nodes[edge.source].hidden |
        this.nodes[edge.target].hidden |
        !this.isFilterSelected(this.nodes[edge.source]) |
        !this.isFilterSelected(this.nodes[edge.target]) |
        !this.isEdgeFilterSelected(edge)
      );
    },
    isFolder(node) {
      return !this.isFile(node) && node.meta.filterID == null;
    },
    isFile(node) {
      return node.meta.file === true;
    },
    openFile(nodeIndex) {
      console.warn("open file function");

      const { spawn } = require("child_process");
      const fs = require("fs");
      const persStore = persistentStore();
      console.log(persStore.getIsVsCode);

      if (persStore.getEditorPath === "") {
        return;
      }

      let path = this.nodes[nodeIndex].id.split("|")[0];

      const exists = fs.existsSync(path);
      if (!exists) {
        console.log("editor" + persStore.getEditorPath + " not found");
        console.error("editor not found");
      }

      const opts = {
        detached: true,
      };

      try {
        let platform = os.platform();
        if (persStore.getIsVsCode && platform !== "darwin") {
          path += ":" + (this.nodes[nodeIndex].meta.line ?? 0) + ":0";
          spawn(persStore.getEditorPath, ["--goto", path], opts);
        } else if (persStore.getIsVsCode && platform === "darwin") {
          console.log("VS Code erkannt:");
          let ep = persStore.getEditorPath + "/Contents/MacOS/Electron";
          path += ":" + (this.nodes[nodeIndex].meta.line ?? 0) + ":0";
          console.log("Spawn VS Code path: " + ep);
          spawn(ep, ["--goto", path], opts);
          // trying to guess the name of the code editors exe file on MacOS.
          // Won't work in most cases! Only VS Code has guaranteed support!
        } else if (!this.getVsCode && platform === "darwin") {
          let macOSPath = function (applicationPath) {
            let regexp = /\/([aA-zZ +]*)\.app/g;
            const array = [...applicationPath.matchAll(regexp)];
            const appName = array[0][1];
            return applicationPath + "/Contents/MacOS/" + appName;
          };
          console.log(macOSPath(persStore.getEditorPath));
          //path += ":" + (this.nodes[nodeIndex].meta.line ?? 0);
          console.log(path);
          spawn(macOSPath(persStore.getEditorPath) + " " + path, [], opts);
        } else {
          spawn(persStore.getEditorPath, [path], opts);
        }
      } catch (error) {
        console.log("editor" + persStore.getEditorPath + " not found");
        console.error("editor not found");
        return;
      }
    },
    toggleSimulation() {
      if (this.physicsEnabled) {
        // Pause: stop ticking (positions freeze in place, like SimpleLayout).
        this.layout.stop();
        this.simulation = null; // simulation is stopped
        this.physicsEnabled = false;
        this.playPause = "Play";
      } else {
        // Resume: re-create the simulation with the same force configuration.
        this.layout.createSimulation((d3, nodes, edges) =>
          this.makeSimulation(d3, nodes, edges),
        );
        this.physicsEnabled = true;
        this.playPause = "Pause";
      }
    },
    async downloadSVG() {
      const graph = { ...this.graph };
      let text = await graph.exportAsSvgText();

      // Add meta data
      const svgOpenTagMatch = text.match(/<svg[^>]*>/);
      if (svgOpenTagMatch) {
        const svgOpenTag = svgOpenTagMatch[0];
        const meta = `
  <metadata>
    <creator>GICAT</creator>
    <exported>${new Date().toISOString()}</exported>
    <description>GRAPH EXPORTED USING GICAT - CSS Lab at RWTH Aachen University</description>
  </metadata>
  `;
        text = text.replace(svgOpenTag, svgOpenTag + meta);
      }

      const url = URL.createObjectURL(
        new Blob([text], { type: "octet/stream" }),
      );
      const a = document.createElement("a");
      a.href = url;
      const filename = this.getRepoPath.split("/").slice(-1);
      const date = new Date();
      const dateString =
        date.getFullYear() +
        "-" +
        (date.getMonth() < 10 ? "0" + date.getMonth() : date.getMonth()) +
        "-" +
        (date.getDay() < 10 ? "0" + date.getDay() : date.getDay()) +
        "-" +
        date.getHours() +
        "-" +
        date.getMinutes();
      a.download = "gicat_" + filename + "_" + dateString + ".svg";
      a.click();
      window.URL.revokeObjectURL(url);
    },
    updatePhysicsForces() {
      if (!this.simulation) return;
      this.simulation
        .force("edge")
        ?.distance(this.dist)
        .strength(this.strength);
      this.simulation.force("charge")?.strength(this.charge);
      this.simulation.alpha(1).restart();
    },
    getLabelColor(label) {
      return this.labelColors[label] || "#2196f3";
    },
    setLabelColor(label, color) {
      this.labelColors[label] = color;
      // recolor matching nodes' border and push just those to the renderer
      // (cheap; keeps the color picker smooth)
      const rgba = parseColor(color);
      const ids = this.layout ? this.layout.nodeIds : [];
      const indices = [];
      for (let i = 0; i < ids.length; i++) {
        const node = this.nodes[ids[i]];
        if (node && node.label === label) {
          node.strokeColor = color;
          indices.push(i);
        }
      }
      if (this.renderer) this.renderer.setNodeStrokeColor(indices, rgba);
    },
    recreateSimulationPerformance() {
      if (!this.layout) return;
      this.layout.createSimulation((d3, nodes, edges) =>
        this.makeSimulation(d3, nodes, edges),
      );
    },
  },

  computed: {
    // store
    ...mapGetters([
      "getEditorPath",
      "getIsVsCode",
      "getNodes",
      "getEdges",
      "getGraph",
      "getNodeFilters",
      "getEdgeFilters",
      "getFilters",
      "getRepoPath",
    ]),
    getOptions() {
      return this.options;
    },
    getPhysicsEnabled() {
      return this.physicsEnabled;
    },
  },
  watch: {
    filtersSelected() {
      // filter selection changes visibility -> rebuild visuals
      this.refreshVisuals();
    },
    dist() {
      this.recreateSimulationPerformance();
      this.physicsEnabled = true;
      this.playPause = "Pause";
    },
    strength() {
      this.recreateSimulationPerformance();
      this.physicsEnabled = true;
      this.playPause = "Pause";
    },
    charge() {
      this.recreateSimulationPerformance();
      this.physicsEnabled = true;
      this.playPause = "Pause";
    },
  },
};
</script>

<style>
.renderer {
  height: 100%;
  width: 100%;
}

.network-nav {
  /* height: 50px; */
  margin-top: 15px;
}

.filter-selector {
  margin-left: 5px;
  margin-right: 5px;
  max-width: 25%;
  width: auto;
  height: auto;
}

.button {
  margin-left: 5px;
  margin-right: 5px;
}

.net {
  height: 100%;
  width: 100%;
  position: fixed;
  border-top: 1px solid #00549f;
}

.graph {
  width: 97%;
  height: 100%;
  border: 1px solid #000;
  display: block;
  box-sizing: border-box;
  touch-action: none;
}

.slider {
  margin-left: 100px;
}

.highlighted-entry {
  background-color: #f3f3f3 !important;
}
</style>
