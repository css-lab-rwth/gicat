<template>
  <v-main>
    <div class="extractor">
      <div>
        <br />
        <v-btn @click="openDir()" prepend-icon="$folderArrowUp"
          >Open Repository
        </v-btn>
        <br />
        <br />
        <div>Current path:</div>
        <div>{{ getRepoPath }}</div>
        <br />
        <v-btn
          id="startVisButton"
          prepend-icon="$folderArrowDown"
          @click="startVisualization()"
          :disabled="!isRepoPathEmpty"
          >Start Visualization
        </v-btn>
      </div>
    </div>

    <!-- Custom Vue Dialog for the large-graph warning -->
    <v-dialog v-model="showWarningDialog" max-width="500px" persistent>
      <v-card rounded="lg">
        <v-card-title class="text-h5 pt-4 pb-2">Large Directory Warning</v-card-title>
        
        <v-card-text>
          This directory generated
          <strong>{{ warningNodeCount.toLocaleString() }}</strong>
          nodes (files &amp; folders), above the ~2,000 recommended for smooth
          performance. Rendering it may reduce the performance — do you want to continue?

          <br /><br />
          
          <!-- The clickable 'More info' link -->
          <a 
            href="#" 
            @click.prevent="showMoreInfo = !showMoreInfo" 
            style="text-decoration: none; color: #1976D2; font-weight: 500;"
          >
            {{ showMoreInfo ? 'Hide info ▲' : 'More info ▼' }}
          </a>

          <!-- The dropdown description -->
          <v-expand-transition>
            <div v-if="showMoreInfo" class="mt-3 text-body-2 text-grey-darken-1">
              The directory you have selected is relatively large. Please make sure that your machine has enough resources to display a large graph or the performance of the software will be significantly reduced. Otherwise, you can go deeper into the directory tree to first analyze parts of the code and further reduce the number of nodes generated in this way.
            </div>
          </v-expand-transition>

        </v-card-text>

        <v-card-actions class="pb-4 pr-4">
          <v-spacer></v-spacer>
          <v-btn color="grey-darken-1" variant="text" @click="cancelVisualization">Cancel</v-btn>
          <v-btn color="primary" variant="elevated" @click="confirmVisualization">Continue</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

  </v-main>
</template>

<script>
import { mapActions, mapGetters } from "vuex";
const ce = window.ce;
const { dialog } = require("@electron/remote");

export default {
  name: "ExtractorView",
  data() {
    return {
      showWarningDialog: false, // Controls the popup visibility
      showMoreInfo: false,      // Controls the dropdown text
      tempGraph: null,          // Temporarily holds the graph while waiting for user input
    };
  },
  methods: {
    ...mapActions([
      "setRepoPath",
      "setNodes",
      "setEdges",
      "setGraph",
      "addNodeFilter",
      "addEdgeFilter",
      "addFilter",
      "resetFilters",
    ]),

    async openDir() {
      let repoPath = await dialog.showOpenDialog({
        properties: ["openDirectory"],
      });

      if (!repoPath.canceled && repoPath.filePaths[0]) {
        this.setRepoPath(repoPath.filePaths[0]);
      } else {
        this.setRepoPath("");
      }
    },

    async loadFilters() {
      let arr = await dialog.showOpenDialog({
        properties: ["openFile", "multiSelections"],
      });
      if (!arr.canceled && arr.filePaths[0]) {
        for (const el of arr.filePaths) {
          let filter = ce.loadNodeFilter(el);
          if (filter.spec === "node") {
            this.addNodeFilter(filter);
          } else if (filter.spec === "edge") {
            this.addEdgeFilter(filter);
          } else {
            console.warn("Filter not valid:", filter);
          }
        }
      }
    },

    resetFiltersButton() {
      this.resetFilters();
    },

    // --- PHASE 1: GENERATE GRAPH & CHECK SIZE ---
    async startVisualization() {
      if (this.getRepoPath != "") {
        try {
          let graph = await ce.getGraph(this.getRepoPath);

          if (graph.nodes.length > 2000) {
            // Store the graph and open the Vue dialog
            this.tempGraph = graph;
            this.showMoreInfo = false; // Reset dropdown state
            this.showWarningDialog = true;
            return; // Stop here and wait for user to click Continue or Cancel
          }

          // Below the threshold, skip the warning and process immediately
          await this.processAndNavigate(graph);

        } catch (err) {
          console.error("Extraction failed:", err);
        }
      } else {
        dialog.showMessageBox({
          title: "No valid entry",
          message: "You have to have at least a repo.",
        });
      }
    },

    // --- PHASE 2: HANDLE DIALOG BUTTON CLICKS ---
    cancelVisualization() {
      this.showWarningDialog = false;
      this.tempGraph = null; // Dump the graph from memory
    },

    async confirmVisualization() {
      this.showWarningDialog = false;
      if (this.tempGraph) {
        await this.processAndNavigate(this.tempGraph);
        this.tempGraph = null; // Clean up memory
      }
    },

    // --- PHASE 3: APPLY FILTERS AND ROUTE ---
    async processAndNavigate(graph) {
      let nodeFilters = this.getNodeFilters;
      let edgeFilters = this.getEdgeFilters;

      for (const filter of nodeFilters) {
        await ce.filterNode(graph, filter);
      }
      for (const filter of edgeFilters) {
        await ce.filterEdge(graph, filter);
      }
      
      await this.setGraph(graph);
      this.$router.push({ path: "extractor/networkNew/" });
    }
  },

  computed: {
    ...mapGetters([
      "getRepoPath",
      "getNodes",
      "getEdges",
      "getGraph",
      "getNodeFilters",
      "getEdgeFilters",
      "getFilters",
    ]),

    isRepoPathEmpty() {
      return this.getRepoPath != "";
    },

    // node count shown in the large-graph warning dialog
    warningNodeCount() {
      return this.tempGraph ? this.tempGraph.nodes.length : 0;
    },
  },
};
</script>