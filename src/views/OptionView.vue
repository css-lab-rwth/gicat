<template>
  <v-main>
    <div class="options">
      <h1>Settings</h1>
      <p>
        Here you can choose your Code Editor of choice to further inspect the
        program code. You can also decide to save the code editor path in a
        preference file on your system to store the path persistently.
      </p>
      <p>
        We suggest using VS Code since some of our features might not work
        correctly for other code editors.
      </p>
    </div>
    <div>
      <div>Current path of your code editor:</div>
      <div>{{ persStore.getEditorPath }}</div>
      <br />
      <v-btn id="codeEditorFinder" @click="openEditor()">
        Find Code Editor
      </v-btn>
    </div>
    <div class="version-info">
      <br />
      <p>
        You are running <strong>GICAT v{{ appVersion }}</strong
        >. A newer version may be available — please check the releases page and
        download the latest build here:
      </p>
      <a
        href="https://github.com/css-lab-rwth/gicat/releases"
        target="_blank"
        rel="noopener noreferrer"
      >
        github.com/css-lab-rwth/gicat/releases
      </a>
    </div>
  </v-main>
</template>

<script>
import { mapActions, mapGetters } from "vuex";
const { dialog } = require("@electron/remote");
const os = require("node:os");
//const { app } = require("@electron/remote");
//const fs = require("node:fs");
import * as path from "path";
import { persistentStore } from "../store/persistentStore";
import pkg from "../../package.json";
//const { systemPreferences } = require("@electron/remote");

export default {
  setup() {
    const persStore = persistentStore();
    return {
      persStore,
    };
  },
  data() {
    return {
      appVersion: pkg.version,
    };
  },
  name: "OptionsView",
  components: {},
  methods: {
    // store
    ...mapActions(["setEditorPath", "setIsVsCode"]),

    // functions
    async openEditor() {
      let editorPath = await dialog.showOpenDialog({
        properties: ["openFile"],
      });
      let platform = os.platform();
      if (!editorPath.canceled && editorPath.filePaths[0]) {
        //this.setEditorPath(editorPath.filePaths[0]);
        this.persStore.setEditorPath(editorPath.filePaths[0]);
        // Editor Path for VS Code and Platform is not MacOS
        if (
          path.basename(this.persStore.getEditorPath).split(".")[0] === "code"
        ) {
          this.persStore.setIsVsCode(true);
          // Platform is Mac OS and VS Code is Editor
        } else if (
          platform === "darwin" &&
          path.basename(this.persStore.getEditorPath).split(".")[0] ===
            "Visual Studio Code"
        ) {
          this.persStore.setIsVsCode(true);
        } else {
          this.persStore.setIsVsCode(false);
        }
      } else {
        this.setEditorPath("");
        this.persStore.setEditorPath("");
        this.persStore.setIsVsCode(false);
      }
      //console.log(editorPath);
    },
  },
  computed: {
    // store
    ...mapGetters(["getEditorPath", "getIsVsCode"]),
  },
  editorPath: {
    get() {
      return this.persStore.getEditorPath();
    },
    set(payload) {
      this.persStore.setEditorPath(payload);
    },
  },
};
</script>
