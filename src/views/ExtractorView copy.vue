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
        <!-- <v-alert
          rounded="lg"
          v-model="alertWarning"
          closable
          text="The directory you have selected is relatively large. Please make sure that your machine has enough resources to display a large graph or the performance of the software will be significantly reduced. Otherwise, you can go deeper into the directory tree to first analyze parts of the code and further reduce the number of nodes generated in this way."
          type="warning"
          variant="tonal"
        ></v-alert> -->
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
  </v-main>
</template>

<script>
import { mapActions, mapGetters } from "vuex";
// import { readdir } from "node:fs/promises";
const ce = window.ce;
const { dialog } = require("@electron/remote");

export default {
  data() {
    return {
      alertWarning: false,
    };
  },
  name: "ExtractorView",
  components: {},
  methods: {
    // store
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

    /**
     * Opens a directory dialog and sets the selected path as the repository path in the store.
     * Also checks the number of files in the selected directory and sets a warning alert if it exceeds 200 files.
     * If no directory is selected, it resets the repository path in the store to an empty string.
     * @return {Promise<void>}
     */

// async openDir() {
//   let repoPath = await dialog.showOpenDialog({
//     properties: ["openDirectory"],
//   });

//   if (!repoPath.canceled && repoPath.filePaths[0]) {
//     this.setRepoPath(repoPath.filePaths[0]);
//     this.isDirEmpty = false;
    
//     // We remove the file counting logic to prevent Node.js crashes in the frontend.
//     // Backend filter will handle heavy folders safely.
//     this.alertWarning = false; 
//   } else {
//     this.setRepoPath("");
//   }
// },


async openDir() {
  let repoPath = await dialog.showOpenDialog({
    properties: ["openDirectory"],
  });

  if (!repoPath.canceled && repoPath.filePaths[0]) {
    this.setRepoPath(repoPath.filePaths[0]);
    this.isDirEmpty = false;
    
    // We remove the file counting logic to prevent Node.js crashes in the frontend.
    // Your backend filter will handle heavy folders safely.
    this.alertWarning = false; 
  } else {
    this.setRepoPath("");
  }
},

// async openDir() {
//       let repoPath = await dialog.showOpenDialog({
//         properties: ["openDirectory"],
//       });

//       if (!repoPath.canceled && repoPath.filePaths[0]) {
//         const selectedPath = repoPath.filePaths[0];
        
//         try {
//           // Secretly count the files using your existing function
//           let tempGraph = await ce.getGraph(selectedPath);
          
//           // If > 200 files, trigger the native OS popup IMMEDIATELY
//           if (tempGraph.nodes.length > 200) {
//             const userChoice = await dialog.showMessageBox({
//               type: "warning",
//               buttons: ["Cancel", "Continue"],
//               defaultId: 1, 
//               cancelId: 0,  
//               title: "Large Directory Warning",
//               message: "There are more than 200 files in this repository.",
//               detail: "Generating the graph may take some time. Do you want to continue?"
//             });
            
//             // If they click Cancel, stop here and clear the path
//             if (userChoice.response === 0) {
//               this.setRepoPath("");
//               return; 
//             }
//           }
          
//           // If < 200 files OR they clicked "Continue", set the path and proceed
//           this.setRepoPath(selectedPath);
//           this.isDirEmpty = false;

//         } catch (err) {
//           console.error(err);
//           this.setRepoPath("");
//         }
//       } else {
//         this.setRepoPath("");
//       }
//     },

// async openDir() {
//   let repoPath = await dialog.showOpenDialog({
//     properties: ["openDirectory"],
//   });

//   if (!repoPath.canceled && repoPath.filePaths[0]) {
//     this.setRepoPath(repoPath.filePaths[0]);
//     this.isDirEmpty = false;
    
//     try {
//       // Use your existing graph function to count the files safely
//       let tempGraph = await ce.getGraph(this.getRepoPath);
      
//       // If there are more than 200 nodes (files/folders), trigger the alert
//       if (tempGraph.nodes.length > 200) {
//         this.alertWarning = true;
//       } else {
//         this.alertWarning = false;
//       }
//     } catch (err) {
//       console.error(err);
//     }
//   } else {
//     this.setRepoPath("");
//   }
// },

    // async openDir() {
    //   let repoPath = await dialog.showOpenDialog({
    //     properties: ["openDirectory"],
    //   });
    //   if (!repoPath.canceled && repoPath.filePaths[0]) {
    //     this.setRepoPath(repoPath.filePaths[0]);
    //     this.isDirEmpty = false;
    //     let fileList;
    //     try {
    //       fileList = await readdir(this.getRepoPath, { recursive: true });
    //       if (fileList.length > 200) {
    //         this.alertWarning = true;
    //       } else {
    //         this.alertWarning = false;
    //       }
    //     } catch (err) {
    //       console.error(err);
    //     }
    //   } else {
    //     this.setRepoPath("");
    //   }
    // },

    /**
     *  Loads node and edge filters from selected files and adds them to the store.
     *  Uses a file dialog to select multiple filter files.
     *  @return {Promise<void>}
     */
    async loadFilters() {
      let arr = await dialog.showOpenDialog({
        properties: ["openFile", "multiSelections"],
      });
      if (!arr.canceled && arr.filePaths[0]) {
        for (const el of arr.filePaths) {
          // TODO check for existing filter id
          let filter = ce.loadNodeFilter(el);
          if (filter.spec === "node") {
            this.addNodeFilter(filter);
          } else if (filter.spec === "edge") {
            this.addEdgeFilter(filter);
          } else {
            console.warn("Filter not valid:");
            console.warn(filter);
          }
        }
      }
    },

    /**
     * Resets all node and edge filters in the store.
     * @return {void}
     */
    resetFiltersButton() {
      this.resetFilters();
    },

    /**
     * Starts the visualization process by generating a graph from the repository path.
     * Applies node and edge filters, and navigates to the network view.
     * @return {Promise<void>}
     */
  //   async startVisualization() {
  //     if (this.getRepoPath != "") {
  //       let graph = await ce.getGraph(this.getRepoPath);
  //       let nodeFilters = this.getNodeFilters;
  //       let edgeFilters = this.getEdgeFilters;

  //       for (const filter of nodeFilters) {
  //         await ce.filterNode(graph, filter);
  //       }
  //       for (const filter of edgeFilters) {
  //         await ce.filterEdge(graph, filter);
  //       }
  //       await this.setGraph(graph);
  //       this.$router.push({ path: "extractor/networkNew/" });
  //     } else {
  //       dialog.showMessageBox({
  //         title: "No valid entry",
  //         message: "You have to have at least a repo.",
  //       });
  //     }
  //   },
  // },

  //   async startVisualization() {
  //     if (this.getRepoPath != "") {
        
  //       // 1. Check if the warning is active and show native popup
  //       if (this.alertWarning) {
  //         const userChoice = await dialog.showMessageBox({
  //           type: "warning",
  //           buttons: ["Cancel", "Continue"],
  //           defaultId: 1, // 'Continue' is highlighted by default
  //           cancelId: 0,  // 'Cancel' is triggered if they press Esc
  //           title: "Large Directory Warning",
  //           message: "There are more than 200 files in this repository.",
  //           detail: "Generating the graph may take some time and reduce performance. Do you want to continue?"
  //         });
          
  //         // 2. If the user clicks "Cancel" (index 0), stop right here
  //         if (userChoice.response === 0) {
  //           return;
  //         }
  //       }

  //       try {
  //         // 3. Proceed with extraction
  //         let graph = await ce.getGraph(this.getRepoPath);
  //         let nodeFilters = this.getNodeFilters;
  //         let edgeFilters = this.getEdgeFilters;

  //         for (const filter of nodeFilters) {
  //           await ce.filterNode(graph, filter);
  //         }
  //         for (const filter of edgeFilters) {
  //           await ce.filterEdge(graph, filter);
  //         }
  //         await this.setGraph(graph);
  //         this.$router.push({ path: "extractor/networkNew/" });
  //       } catch (err) {
  //         console.error("Extraction failed:", err);
  //       }

  //     } else {
  //       dialog.showMessageBox({
  //         title: "No valid entry",
  //         message: "You have to have at least a repo.",
  //       });
  //     }
  //   },
  // },

// async startVisualization() {
//       if (this.getRepoPath != "") {
//         try {
//           // Just extract! No more popups or interruptions here.
//           let graph = await ce.getGraph(this.getRepoPath);
//           let nodeFilters = this.getNodeFilters;
//           let edgeFilters = this.getEdgeFilters;

//           for (const filter of nodeFilters) {
//             await ce.filterNode(graph, filter);
//           }
//           for (const filter of edgeFilters) {
//             await ce.filterEdge(graph, filter);
//           }
//           await this.setGraph(graph);
//           this.$router.push({ path: "extractor/networkNew/" });
//         } catch (err) {
//           console.error("Extraction failed:", err);
//         }
//       } else {
//         dialog.showMessageBox({
//           title: "No valid entry",
//           message: "You have to have at least a repo.",
//         });
//       }
//     },
//   },


async startVisualization() {
      if (this.getRepoPath != "") {
        try {
          // 1. Generate the graph safely in the background
          let graph = await ce.getGraph(this.getRepoPath);

          // 2. Check if the directory is large and show native OS popup
          if (graph.nodes.length > 200) {
            const userChoice = await dialog.showMessageBox({
              type: "warning",
              buttons: ["Cancel", "Continue"],
              defaultId: 1, 
              cancelId: 0,  
              title: "Large Directory Warning",

              
              message: "Rendering a large graph may reduce performance. Do you want to continue?",
              detail: "The directory you have selected is relatively large. Please make sure that your machine has enough resources to display a large graph or the performance of the software will be significantly reduced. Otherwise, you can go deeper into the directory tree to first analyze parts of the code and further reduce the number of nodes generated in this way."
            });

            // If user clicks "Cancel", stop the visualization process
            if (userChoice.response === 0) {
              return; 
            }
          }

          // 3. Proceed with filters and rendering
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
  },

  computed: {
    // store
    ...mapGetters([
      "getRepoPath",
      "getNodes",
      "getEdges",
      "getGraph",
      "getNodeFilters",
      "getEdgeFilters",
      "getFilters",
    ]),

    /**
     * Checks if the repository path is not empty.
     * @return {boolean} True if the repository path is not empty, false otherwise.
     */
    isRepoPathEmpty() {
      return this.getRepoPath != "";
    },
  },
};
</script>
