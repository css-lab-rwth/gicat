<template>
  <v-main>
    <div id="section">
      <v-card
        v-if="main.getImported"
        width="40%"
        color="#c7ddf2"
        density="comfortable"
        elevation="2"
        location="sticky right"
        class="text-center"
        position="fixed"
      >
        <v-list id="packageExplorer">
          <v-list-item
            value="explorer"
            title="Package Explorer"
            color="#00549f"
          ></v-list-item>
          <!-- Package details are always expanded — a collapsible group kept
               hiding the filter lists (and their edit buttons) after import. -->
          <template v-if="main.getJson != null">
            <v-list-item
              :title="main.getPackageName"
              prepend-icon="$package"
              class="listItem"
              elevation="2"
            ></v-list-item>
            <v-list-item
              v-if="main.getAuthors"
              title="Authors:"
              :subtitle="main.getAuthors"
              class="subItem"
            ></v-list-item>
            <v-list-item
              v-if="main.getDesc"
              title="Description:"
              :subtitle="main.getDesc"
              lines="three"
              class="subItem"
            ></v-list-item>
            <v-list-item title="Node filter list"></v-list-item>
            <v-list-group
              v-for="filter in main.getJson['nodeFilterList']"
              :key="filter.name"
            >
              <template v-slot:activator="{ props }">
                <v-list-item
                  :title="filter.name"
                  v-bind="props"
                  class="listItem"
                ></v-list-item>
              </template>
              <v-list-item
                title="Regex:"
                :subtitle="filter.regex"
                class="subItem"
              ></v-list-item>
              <!--<v-list-item
                v-if="filter.exclude != ''"
                title="Exclude:"
                :subtitle="filter.exclude"
                class="subItem"
              ></v-list-item>-->
              <v-list-item
                v-if="filter.label"
                title="Node label:"
                :subtitle="filter.label"
                class="subItem"
              ></v-list-item>
              <v-list-item
                v-if="filter.labelAttribute"
                title="Node label attribute:"
                :subtitle="filter.labelAttribute"
                class="subItem"
              ></v-list-item>
              <v-btn
                prepend-icon="$edit"
                @click="nodeEditMode(filter.name)"
                >edit</v-btn
              >
            </v-list-group>
            <v-list-item title="Edge filter list"></v-list-item>
            <v-list-group
              v-for="edge in main.getJson['edgeFilterList']"
              :key="edge.name"
            >
              <template v-slot:activator="{ props }">
                <v-list-item
                  :title="edge.name"
                  v-bind="props"
                  class="listItem"
                ></v-list-item>
              </template>
              <v-list-item
                title="Edge label:"
                :subtitle="edge.label"
                class="subItem"
              ></v-list-item>
              <v-list-item
                title="Source:"
                :subtitle="edge.from.attribute"
                class="subItem"
              ></v-list-item>
              <v-list-item
                title="Target:"
                :subtitle="edge.to.attribute"
                class="subItem"
              ></v-list-item>
              <v-btn
                prepend-icon="$edit"
                @click="edgeEditMode(edge.name)"
                >edit</v-btn
              >
            </v-list-group>
          </template>
        </v-list>
      </v-card>
      <br />
      <v-form>
        <v-container>
          <h1>Package Information</h1>
          <br />
          <v-row>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="packageName"
                label="Package name"
                hide-details
              ></v-text-field>
              <!--<v-tooltip activator="parent" location="packageName"
                >This is a tooltip</v-tooltip
              >-->
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="authors"
                label="Author"
                hide-details
              ></v-text-field>
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="description"
                label="Description"
                hide-details
              ></v-text-field>
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="12" md="4">
              <v-btn @click="generatePackage" prepend-icon="$packagePlus">
                Generate package
              </v-btn>
            </v-col>
          </v-row>
          <v-row>
            <v-col>
              <v-file-input
                label="Filter import..."
                variant="underlined"
                density="compact"
                :rules="rules"
                max-width="480"
                accept=".json"
                v-model="importedFilter"
              ></v-file-input>
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="12" md="4">
              <v-btn
                @click="importFilter"
                prepend-icon="$fileExport"
                :disabled="importedFilter == null"
              >
                Import
              </v-btn>
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="12" md="4">
              <v-btn
                @click="exportFilter"
                prepend-icon="$fileExport"
                :disabled="main.getJson == null"
              >
                Export
              </v-btn>
            </v-col>
          </v-row>
        </v-container>
      </v-form>
      <br />
      <v-container>
        <h1>Node Filter</h1>
        <br />
        <v-row>
          <v-col cols="12" md="8">
            <v-text-field
              v-model="codeInput"
              label="Code snippet"
              hide-details
            ></v-text-field>
          </v-col>
        </v-row>
        <v-row>
          <v-col cols="12" md="4">
            <v-select
              v-model="generatorSelection"
              label="Select..."
              :items="[
                'Mandatory characters',
                'Arbitrary characters of the alphabet',
                'Mandatory special character',
                'Any character (except line breaks)',
                'Force whitespace',
                'Exclude',
              ]"
            ></v-select>
          </v-col>
        </v-row>
        <v-row>
          <v-col cols="12" md="4">
            <v-checkbox
              label="Assign capture group"
              v-model="captureGroup"
            ></v-checkbox>
          </v-col>
          <v-col cols="12" md="2">
            <v-text-field
              v-model="quantifier"
              label="Quantifier"
              hide-details
            ></v-text-field>
          </v-col>
        </v-row>
        <v-row>
          <v-col>
            <v-btn @click="generateRegex">Submit</v-btn>
          </v-col>
        </v-row>
        <br /><br />
        <v-row>
          <v-col cols="12" md="8">
            <v-text-field
              v-model="generatedRegex"
              label="(Generated) Regex"
              hide-details
            ></v-text-field>
          </v-col>
        </v-row>
        <v-row>
          <v-col cols="12" md="4">
            <v-btn @click="resetRegex" prepend-icon="$arrowDownLeft">
              Reset
            </v-btn>
          </v-col>
        </v-row>
        <br />
        <br />
        <v-row>
          <v-col cols="12" md="4">
            <v-text-field
              v-model="fileExtension"
              label="File extension"
              hide-details
            ></v-text-field>
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field
              v-model="regexName"
              label="Filter name"
              hide-details
            ></v-text-field>
          </v-col>
        </v-row>
        <!--
        <v-row>
          <v-col cols="12" md="8">
            <v-text-field
              v-model="excludes"
              label="Exclude Regex"
              hide-details
            ></v-text-field>
          </v-col>
        </v-row>
      -->
        <br /><br />
        <v-row>
          <v-col cols="12" md="4">
            <v-text-field
              v-model="nodeLabel"
              label="Node label"
              hide-details
            ></v-text-field>
          </v-col>
        </v-row>
        <v-row>
          <v-col cols="12" md="4">
            <v-text-field
              v-model="nodeAttributes"
              label="Capture group name"
              hide-details
            ></v-text-field>
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field
              v-model="nodeCaptureGroups"
              label="Set capture groups"
              hide-details
            ></v-text-field>
          </v-col>
        </v-row>
        <v-row>
          <v-col>
            <v-btn
              @click="addNodeAttributes"
              prepend-icon="$plus"
              :disabled="main.getJson == null"
              >Add
            </v-btn>
            <v-dialog v-model="addNodeAttributesDialog" width="auto">
              <v-card>
                <v-card-text>Your capture group was generated!</v-card-text>
                <v-card-actions>
                  <v-btn block @click="addNodeAttributesDialog = false"
                    >Close
                  </v-btn>
                </v-card-actions>
              </v-card>
            </v-dialog>
          </v-col>
        </v-row>
        <v-row>
          <v-col cols="12" md="4">
            <v-color-picker
              width="100%"
              show-swatches
              :swatches="swatches"
              swatches-max-height="400px"
              v-model="nodeColor"
            ></v-color-picker>
          </v-col>
        </v-row>
        <v-row>
          <v-col cols="12" md="4">
            <v-select
              v-model="labelAttributeSelection"
              label="Label attribute"
              :items="labelSelection"
            ></v-select>
          </v-col>
        </v-row>
        <v-row>
          <v-col cols="12" md="4">
            <v-btn
              prepend-icon="$plus"
              @click="addNodeFilter"
              :disabled="main.getJson == null"
              >{{ main.getEditModeScope ? "save" : "Add filter" }}
            </v-btn>
            <v-btn class="ml-2" prepend-icon="$undo" @click="clearNodeFilter">
              Clear all
            </v-btn>
            <v-dialog v-model="addNodeFilterDialog" width="auto">
              <v-card>
                <v-card-text>
                  {{ "Your package explorer has been updated!" }}
                </v-card-text>
                <v-card-actions>
                  <v-btn block @click="addNodeFilterDialog = false"
                    >Close
                  </v-btn>
                </v-card-actions>
              </v-card>
            </v-dialog>
          </v-col>
        </v-row>
      </v-container>
      <br /><br />
      <v-container>
        <h1>Edge Filter</h1>
        <br />
        <v-row>
          <v-col cols="12" md="4">
            <v-text-field
              v-model="edgeName"
              label="Edge filter name"
              hide-details
            ></v-text-field>
          </v-col>
          <v-col cols="12" md="4">
            <v-select
              v-model="loopSelection"
              label="Allow loops"
              :items="['True', 'False']"
            ></v-select>
          </v-col>
        </v-row>
        <v-row>
          <v-col cols="12" md="4">
            <v-select
              v-model="fromSelection"
              label="Select source"
              :items="getFromSelection"
            ></v-select>
          </v-col>
          <v-col cols="12" md="4">
            <v-select
              v-model="fromAttributeSelection"
              label="Select source attribute"
              :items="getFromAttributes"
            ></v-select>
          </v-col>
        </v-row>
        <v-row>
          <v-col cols="12" md="4">
            <v-select
              v-model="toSelection"
              label="Select target"
              :items="getFromSelection"
            ></v-select>
          </v-col>
          <v-col cols="12" md="4">
            <v-select
              v-model="toAttributeSelection"
              label="Select target attribute"
              :items="getToAttributes"
            ></v-select>
          </v-col>
        </v-row>
        <v-row>
          <v-col cols="12" md="4">
            <v-color-picker
              width="100%"
              show-swatches
              :swatches="swatches"
              swatches-max-height="400px"
              v-model="edgeColorpicker"
            ></v-color-picker>
          </v-col>
        </v-row>
        <v-row>
          <v-col cols="12" md="4">
            <v-text-field
              v-model="edgeLabel"
              label="Edge label"
              hide-details
            ></v-text-field>
          </v-col>
        </v-row>
        <v-row>
          <v-col cols="12" md="4">
            <br />
            <v-btn
              prepend-icon="$plus"
              @click="addEdgeFilter"
              :disabled="main.getJson == null"
              >{{ main.getEdgeEditModeScope ? "save" : "Add filter" }}
            </v-btn>
            <v-btn class="ml-2" prepend-icon="$undo" @click="clearEdgeFilter">
              Clear all
            </v-btn>
            <v-dialog v-model="addEdgeFilterDialog" width="auto">
              <v-card>
                <v-card-text>
                  {{ "Your package explorer has been updated!" }}
                </v-card-text>
                <v-card-actions>
                  <v-btn block @click="addEdgeFilterDialog = false"
                    >Close
                  </v-btn>
                </v-card-actions>
              </v-card>
            </v-dialog>
          </v-col>
        </v-row>
      </v-container>
    </div>
    <br />
  </v-main>
</template>
<script>
import { useMainStore } from "../store/piniaStore";
export default {
  setup() {
    const main = useMainStore();
    return {
      main,
    };
  },
  name: "GeneratorView",
  components: {},
  data() {
    return {
      swatches: [
        ["#FF0000", "#AA0000", "#550000"],
        ["#FFFF00", "#AAAA00", "#555500"],
        ["#00FF00", "#00AA00", "#005500"],
        ["#0000FF", "#0000AA", "#000055"],
      ],
      importedFilter: null,
      attributes: {},
      quantifier: "",
      selected: "",
      generatorSelection: "",
      snippetSelection: "",
      captureGroup: "",
      addNodeAttributesDialog: false,
      addNodeFilterDialog: false,
      addEdgeFilterDialog: false,
      rules: [],
    };
  },

  computed: {
    // store
    inEditMode: {
      get() {
        return this.main.getInEditMode;
      },
      set(payload) {
        this.main.setInEditMode(payload);
      },
    },
    editModeScope: {
      get() {
        return this.main.getEditModeScope;
      },
      set(payload) {
        this.main.setEditModeScope(payload);
      },
    },
    edgeColorpicker: {
      get() {
        return this.main.getEdgeColorPicker;
      },
      set(payload) {
        this.main.setEdgeColorPicker(payload);
      },
    },
    labelAttributeSelection: {
      get() {
        return this.main.getLabelAttributeSelection;
      },
      set(payload) {
        this.main.setLabelAttributeSelection(payload);
      },
    },
    labelAttribute: {
      get() {
        return this.main.getLabelAttribute;
      },
      set(payload) {
        this.main.setLabelAttribute(payload);
      },
    },
    toAttributeSelection: {
      get() {
        return this.main.getToAttributeSelection;
      },
      set(payload) {
        this.main.setToAttributeSelection(payload);
      },
    },
    toSelection: {
      get() {
        return this.main.getToSelection;
      },
      set(payload) {
        this.main.setToSelection(payload);
      },
    },
    fromAttributeSelection: {
      get() {
        return this.main.getFromAttributeSelection;
      },
      set(payload) {
        this.main.setFromAttributeSelection(payload);
      },
    },
    fromSelection: {
      get() {
        return this.main.getFromSelection;
      },
      set(payload) {
        this.main.setFromSelection(payload);
      },
    },
    edgeName: {
      get() {
        return this.main.getEdgeName;
      },
      set(payload) {
        this.main.setEdgeName(payload);
      },
    },
    edgeLabel: {
      get() {
        return this.main.getEdgeLabel;
      },
      set(payload) {
        this.main.setEdgeLabel(payload);
      },
    },
    loopSelection: {
      get() {
        return this.main.getLoopSelection;
      },
      set(payload) {
        this.main.setLoopSelection(payload);
      },
    },
    temp: {
      get() {
        return this.main.getTemp;
      },
      set(payload) {
        this.main.setTemp(payload);
      },
    },
    nodeColor: {
      get() {
        return this.main.getNodeColor;
      },
      set(payload) {
        this.main.setNodeColor(payload);
      },
    },
    nodeCaptureGroups: {
      get() {
        return this.main.getNodeCaptureGroups;
      },
      set(payload) {
        this.main.setNodeCaptureGroups(payload);
      },
    },
    nodeAttributes: {
      get() {
        return this.main.getNodeAttributes;
      },
      set(payload) {
        this.main.setNodeAttributes(payload);
      },
    },
    nodeLabel: {
      get() {
        return this.main.getNodeLabel;
      },
      set(payload) {
        this.main.setNodeLabel(payload);
      },
    },
    fileExtension: {
      get() {
        return this.main.getFileExtension;
      },
      set(payload) {
        this.main.setFileExtension(payload);
      },
    },
    /*excludes: {
      get() {
        return this.main.getExcludes;
      },
      set(payload) {
        this.main.setExcludes(payload);
      },
    },*/
    regexName: {
      get() {
        return this.main.getRegexName;
      },
      set(payload) {
        this.main.setRegexName(payload);
      },
    },
    generatedRegex: {
      get() {
        return this.main.getGeneratedRegex;
      },
      set(payload) {
        this.main.setGeneratedRegex(payload);
      },
    },
    codeInput: {
      get() {
        return this.main.getCodeInput;
      },
      set(payload) {
        this.main.setCodeInput(payload);
      },
    },
    packageName: {
      get() {
        return this.main.getPackageName;
      },
      set(payload) {
        this.main.setPackageName(payload);
      },
    },
    authors: {
      get() {
        return this.main.getAuthors;
      },
      set(payload) {
        this.main.setAuthors(payload);
      },
    },
    description: {
      get() {
        return this.main.getDesc;
      },
      set(payload) {
        this.main.setDesc(payload);
      },
    },

    /**
     * Generates a list of label attributes from the current attributes in the store.
     * This list is used to populate the label attribute selection dropdown.
     * @return {Array} An array of label attribute names.
     */
    labelSelection() {
      const opt = [];
      if (
        this.main.getJson != null &&
        Object.keys(this.main.getAttributes).length > 0
      ) {
        for (let e in this.main.getAttributes) {
          opt.push(e);
        }
        return opt;
      }
      return opt;
    },

    /**
     * Generates a list of node filter names from the current node filters in the store.
     * @return {Array} An array of node filter names.
     */
    getFromSelection() {
      const opt = [];
      let i = 0;
      if (
        this.main.getJson != null &&
        Object.keys(this.main.getJson["nodeFilterList"]).length > 0
      ) {
        while (i < Object.keys(this.main.getJson["nodeFilterList"]).length) {
          opt.push(this.main.getJson["nodeFilterList"][i].name);
          i++;
        }
      }
      return opt;
    },
    getFromAttributes() {
      const opt = [];
      let i = 0;
      if (
        this.main.getJson != null &&
        Object.keys(this.main.getJson["nodeFilterList"]).length > 0
      ) {
        while (i < Object.keys(this.main.getJson["nodeFilterList"]).length) {
          for (const [key] of Object.entries(
            this.main.getJson["nodeFilterList"][i].attributes
          )) {
            if (
              this.main.getJson["nodeFilterList"][i].name ===
              this.main.fromSelection
            ) {
              opt.push(key);
            }
          }
          i++;
        }
      }
      //console.log(opt)
      return opt;
    },
    getToAttributes() {
      const opt = [];
      let i = 0;
      if (
        this.main.getJson != null &&
        Object.keys(this.main.getJson["nodeFilterList"]).length > 0
      ) {
        while (i < Object.keys(this.main.getJson["nodeFilterList"]).length) {
          for (const [key] of Object.entries(
            this.main.getJson["nodeFilterList"][i].attributes
          )) {
            if (
              this.main.getJson["nodeFilterList"][i].name ===
              this.main.toSelection
            ) {
              opt.push(key);
            }
          }
          i++;
        }
      }
      //console.log(opt);
      return opt;
    },
  },
  props: {},
  methods: {
    nodeEditMode(filterName) {
      //console.log(filterName);
      for (let i = 0; i < this.main.getJson.nodeFilterList.length; i++) {
        if (this.main.getJson.nodeFilterList[i].name === filterName) {
          //console.log(this.main.getJson.nodeFilterList[i]);
          this.main.setEditModeScope(this.main.getJson.nodeFilterList[i].id);
          this.generatedRegex = this.main.getJson.nodeFilterList[
            i
          ].regex.substr(
            1,
            this.main.getJson.nodeFilterList[i].regex.length - 4
          );
          this.fileExtension = this.main.getJson.nodeFilterList[i].extension;
          this.regexName = this.main.getJson.nodeFilterList[i].name;
          this.nodeLabel = this.main.getJson.nodeFilterList[i].label;
          /*this.excludes = this.main.getJson.nodeFilterList[i].exclude[0].substr(
            1,
            this.main.getJson.nodeFilterList[i].exclude[0].length - 4
          );*/
          this.labelAttributeSelection =
            this.main.getJson.nodeFilterList[i].labelAttribute; //???
          this.nodeColor = this.main.getJson.nodeFilterList[i].style.color;
          this.main.setAttributes(
            this.main.getJson.nodeFilterList[i].attributes
          );
        }
      }
    },
    edgeEditMode(edgeFilterName) {
      for (let i = 0; i < this.main.getJson.edgeFilterList.length; i++) {
        if (this.main.getJson.edgeFilterList[i].name === edgeFilterName) {
          this.main.setEdgeEditModeScope(
            this.main.getJson.edgeFilterList[i].id
          );
          this.edgeName = this.main.getJson.edgeFilterList[i].name;
          this.fromAttributeSelection =
            this.main.getJson.edgeFilterList[i].from.attribute;
          this.toAttributeSelection =
            this.main.getJson.edgeFilterList[i].to.attribute;
          for (let j = 0; j < this.main.getJson.nodeFilterList.length; j++) {
            if (
              this.main.getJson.nodeFilterList[j].id ===
              this.main.getJson.edgeFilterList[i].from.nodeFilterID
            ) {
              this.fromSelection = this.main.getJson.nodeFilterList[j].name;
            }
          }
          for (let k = 0; k < this.main.getJson.nodeFilterList.length; k++) {
            if (
              this.main.getJson.nodeFilterList[k].id ===
              this.main.getJson.edgeFilterList[i].to.nodeFilterID
            ) {
              this.toSelection = this.main.getJson.nodeFilterList[k].name;
            }
          }
          // These belong to the matched filter — they used to sit outside the
          // name check, so the LAST edge filter's color/label always loaded.
          this.edgeColorpicker =
            this.main.getJson.edgeFilterList[i].style.color;
          this.edgeLabel = this.main.getJson.edgeFilterList[i].label;
        }
      }
    },
    nodeListDropdown() {
      if (document.getElementById("filterElement").style.display == "none") {
        document.getElementById("filterElement").style.display = "block";
      } else {
        document.getElementById("filterElement").style.display = "none";
      }
    },
    addNodeAttributes() {
      if (Object.keys(this.main.getAttributes).length === 0) {
        console.log("Attributes leer");
        this.main.setAttributes({
          [this.main.getNodeAttributes]: this.main.getNodeCaptureGroups
            .split(",")
            .map((e) => e.trim())
            .map((e) => Number(e)),
        });
      } else {
        this.main.setAttributesByElement(
          this.main.getNodeAttributes,
          this.main.getNodeCaptureGroups
            .split(",")
            .map((e) => e.trim())
            .map((e) => Number(e))
        );
      }
      //console.log("Node attributes: " + this.main.getNodeAttributes);
      this.main.setTemp(this.main.getNodeLabel);
      this.addNodeAttributesDialog = true;
      this.main.setNodeAttributes("");
      this.main.setNodeCaptureGroups("");
    },
    resetRegex() {
      this.main.setGeneratedRegex("");
    },
    // Reset only clears the regex. This wipes every field of the node filter
    // form (name, extension, label, capture groups, colour, ...) and leaves
    // edit mode, so a different filter can be edited from a clean slate.
    clearNodeFilter() {
      this.codeInput = "";
      this.generatedRegex = "";
      this.fileExtension = "";
      this.regexName = "";
      this.nodeLabel = "";
      this.nodeAttributes = "";
      this.nodeCaptureGroups = "";
      this.labelAttributeSelection = "";
      this.nodeColor = "#8ebae5";
      this.quantifier = "";
      this.selected = "";
      this.generatorSelection = "";
      this.snippetSelection = "";
      this.captureGroup = "";
      this.main.setAttributes({});
      this.main.setEditModeScope("");
      this.main.setInEditMode(false);
    },
    // Same idea for the edge filter form.
    clearEdgeFilter() {
      this.edgeName = "";
      this.edgeLabel = "";
      this.loopSelection = "";
      this.fromSelection = "";
      this.fromAttributeSelection = "";
      this.toSelection = "";
      this.toAttributeSelection = "";
      this.edgeColorpicker = "#8ebae5";
      this.main.setEdgeEditModeScope("");
      this.main.setInEditMode(false);
    },
    addNodeFilter() {
      if (!this.main.getEditModeScope) {
        this.main.setGeneratedRegex("/" + this.main.getGeneratedRegex + "/gm"),
          this.main.getJson["nodeFilterList"].push({
            name: this.main.getRegexName,
            regex: this.main.getGeneratedRegex,
            id: (
              this.main.getJson.packageName + this.main.getRegexName
            ).replace(/\s/g, ""),
            spec: "node",
            //exclude: [this.main.getExcludes],
            extension: this.main.getFileExtension,
            attributes: this.main.getAttributes,
            style: { color: this.main.getNodeColor },
            failures: [""],
            label: this.main.getNodeLabel,
            labelAttribute: this.main.getLabelAttributeSelection,
          }),
          this.main.setAttributes({});
        this.main.setTemp(this.main.getRegexName);
        this.addNodeFilterDialog = true;
        this.main.setRegexName("");
        this.main.setGeneratedRegex("");
        //this.main.setExcludes("");
        this.main.setFileExtension("");
        this.main.setLabelAttributeSelection("");
        this.main.setNodeLabel("");
        this.main.setRegexName("");
        this.main.setNodeLabel("");
        this.main.setNodeAttributes("");
        this.main.setNodeCaptureGroups("");
        this.main.setNodeColor("#8ebae5");
      } else {
        for (let i = 0; i < this.main.getJson.nodeFilterList.length; i++) {
          if (
            this.main.getJson.nodeFilterList[i].id ===
            this.main.getEditModeScope
          ) {
            let tempFilter = this.main.getJson.nodeFilterList;
            console.log(tempFilter[i]);
            tempFilter[i].name = this.regexName;
            tempFilter[i].regex = "/" + this.generatedRegex + "/gm";
            //tempFilter[i].exclude = ["/" + this.excludes + "/gm"];
            tempFilter[i].extension = this.fileExtension;
            tempFilter[i].style.color = this.nodeColor;
            tempFilter[i].label = this.nodeLabel;
            tempFilter[i].labelAttribute = this.labelAttributeSelection;

            this.main.setAttributes({});
            this.main.setTemp(this.main.getRegexName);
            this.addNodeFilterDialog = true;
            this.main.setRegexName("");
            this.main.setGeneratedRegex("");
            //this.main.setExcludes("");
            this.main.setFileExtension("");
            this.main.setLabelAttributeSelection("");
            this.main.setNodeLabel("");
            this.main.setRegexName("");
            this.main.setNodeLabel("");
            this.main.setNodeAttributes("");
            this.main.setNodeCaptureGroups("");
            this.main.setNodeColor("#8ebae5");
            this.main.setNodeFilterList(tempFilter);
          }
        }
      }
      this.main.setEditModeScope("");
      this.main.setInEditMode(false);
    },
    addEdgeFilter() {
      if (!this.main.getEdgeEditModeScope) {
        this.main.getJson["edgeFilterList"].push({
          "allow-loop": this.main.getLoopSelection,
          mode: "",
          label: this.main.getEdgeLabel,
          spec: "edge",
          id: (this.main.getJson.packageName + this.main.getEdgeName).replace(
            /\s/g,
            ""
          ),
          name: this.main.getEdgeName,
          from: {
            nodeFilterID: (
              this.main.getJson.packageName + this.main.getFromSelection
            ).replace(/\s/g, ""),
            attribute: this.main.getFromAttributeSelection,
          },
          to: {
            nodeFilterID: (
              this.main.getJson.packageName + this.main.getToSelection
            ).replace(/\s/g, ""),
            attribute: this.main.getToAttributeSelection,
          },
          style: {
            color: this.main.getEdgeColorPicker,
          },
        });
        this.main.setEdgeName("");
        this.main.setLoopSelection("");
        this.main.setEdgeColorPicker("#8ebae5");
        this.main.setEdgeLabel("");
        this.addEdgeFilterDialog = true;
      } else {
        for (let i = 0; i < this.main.getJson.edgeFilterList.length; i++) {
          if (
            this.main.getJson.edgeFilterList[i].id ===
            this.main.getEdgeEditModeScope
          ) {
            let tempFilter = this.main.getJson.edgeFilterList;
            tempFilter[i].label = this.edgeLabel;
            tempFilter[i].name = this.edgeName;
            tempFilter[i].from.attribute = this.fromAttributeSelection;
            tempFilter[i].to.attribute = this.toAttributeSelection;
            tempFilter[i].style.color = this.edgeColorpicker;

            for (let j = 0; j < this.main.getJson.nodeFilterList.length; j++) {
              if (
                this.fromSelection === this.main.getJson.nodeFilterList[j].name
              ) {
                tempFilter[i].from.nodeFilterID =
                  this.main.getJson.nodeFilterList[j].id;
              }
              if (
                this.toSelection === this.main.getJson.nodeFilterList[j].name
              ) {
                tempFilter[i].to.nodeFilterID =
                  this.main.getJson.nodeFilterList[j].id;
              }
            }
            this.addEdgeFilterDialog = true;
            this.main.setEdgeEditModeScope("");
          }
        }
      }
    },
    generateRegex() {
      let snippetSelection = window.getSelection();
      if (
        this.generatorSelection == "Mandatory characters" &&
        this.captureGroup
      ) {
        this.main.setGeneratedRegex(
          this.main.getGeneratedRegex +
            "(" +
            snippetSelection +
            ")" +
            this.quantifier
        );
      } else if (
        this.generatorSelection == "Mandatory characters" &&
        !this.captureGroup
      ) {
        this.main.setGeneratedRegex(
          this.main.getGeneratedRegex + snippetSelection + this.quantifier
        );
      } else if (
        this.generatorSelection == "Arbitrary characters of the alphabet" &&
        this.captureGroup
      ) {
        this.main.setGeneratedRegex(
          this.main.getGeneratedRegex + "([A-Za-z]" + this.quantifier + ")"
        );
      } else if (
        this.generatorSelection == "Arbitrary characters of the alphabet" &&
        !this.captureGroup
      ) {
        this.main.setGeneratedRegex(
          this.main.getGeneratedRegex + "[A-Za-z]" + this.quantifier
        );
      } else if (this.generatorSelection == "Force whitespace") {
        this.main.setGeneratedRegex(
          this.main.getGeneratedRegex + "\\s" + this.quantifier
        );
      } else if (this.generatorSelection == "Mandatory special character") {
        this.main.setGeneratedRegex(
          this.main.getGeneratedRegex + "\\" + snippetSelection
        );
      } else if (
        this.generatorSelection == "Any character (except line breaks)" &&
        !this.captureGroup
      ) {
        this.main.setGeneratedRegex(
          this.main.getGeneratedRegex + "." + this.quantifier
        );
      } else if (
        this.generatorSelection == "Any character (except line breaks)" &&
        this.captureGroup
      ) {
        this.main.setGeneratedRegex(
          this.main.getGeneratedRegex + "(." + this.quantifier + ")"
        );
      } else if (this.generatorSelection == "Exclude") {
        this.main.setGeneratedRegex(
          this.main.getGeneratedRegex +
            "[^" +
            snippetSelection +
            "]" +
            this.quantifier
        );
      }
      this.quantifier = "";
      this.main.setCaptureGroup = false;
      this.selected = "";
      this.generatorSelection = "";
    },
    generatePackage() {
      const date = new Date();
      this.main.setDate(date);
      this.main.setJson(this.main.getFilterPackage);
    },
    importFilter() {
      // v-file-input can hand back a single File or an array of files.
      const file = Array.isArray(this.importedFilter)
        ? this.importedFilter[0]
        : this.importedFilter;
      if (!file) return;

      file.text().then((value) => {
        let parsedInput;
        try {
          parsedInput = JSON.parse(value);
        } catch (e) {
          console.error("The imported filter file could not be parsed.", e);
          return;
        }

        const packageName = parsedInput.packageName || "";
        const authors = parsedInput.authors || "";
        const desc = parsedInput.desc || "";
        const date = parsedInput.date || new Date();
        const nodeFilterList = Array.isArray(parsedInput.nodeFilterList)
          ? parsedInput.nodeFilterList
          : [];
        const edgeFilterList = Array.isArray(parsedInput.edgeFilterList)
          ? parsedInput.edgeFilterList
          : [];

        this.main.setPackageName(packageName);
        this.main.setAuthors(authors);
        this.main.setDesc(desc);
        this.main.setNodeFilterList(nodeFilterList);
        this.main.setEdgeFilterList(edgeFilterList);
        this.main.setDate(date);
        this.main.setInEditMode(false);
        this.main.setEditModeScope("");
        this.main.setEdgeEditModeScope("");

        // Set the package explorer's json to a *fresh* object. generatePackage()
        // reused the same filterPackage reference, so when json already pointed
        // at it the node/edge lists in the explorer never re-rendered — only the
        // package header (name/author/desc) updated. A new object guarantees the
        // v-for over nodeFilterList/edgeFilterList re-renders on import.
        this.main.setJson({
          packageName,
          authors,
          desc,
          date,
          nodeFilterList,
          edgeFilterList,
        });

        // Reveal the package explorer — it only shows for imported packages.
        this.main.setImported(true);
      });
    },
    exportFilter() {
      const exportJson = JSON.parse(JSON.stringify(this.main.getJson || {}));
      if (!exportJson.meta) {
        exportJson.meta = {
          metaInfo:
            "This filter was generated with the GICAT Tool at the CSS-Lab at RWTH Aachen University. \n (https://www.css-lab.rwth-aachen.de/tools/overview)",
        };
      }
      let fileString = JSON.stringify(exportJson, null, "\t");
      let fileUri =
        "data:application/json;charset=utf-8," + encodeURIComponent(fileString);
      let exportFileDefaultName = "filter.json";
      let linkElement = document.createElement("a");
      linkElement.setAttribute("href", fileUri);
      linkElement.setAttribute("download", exportFileDefaultName);
      linkElement.click();
    },
  },
};
</script>
<style scoped lang="scss">
@use "../styles/settings.scss";
.subItem {
  text-align: left;
}

#section {
  height: 100%;
  width: 75%;
  text-align: left;
  margin-left: 5px;
}

#packageExplorer {
  // Fill the panel down to the bottom of the window instead of a fixed 400px,
  // and scroll vertically only — the horizontal bar just clipped the labels.
  overflow-x: hidden;
  overflow-y: auto;
  max-height: calc(100vh - 96px);
}

li {
  font-size: 12px;
  display: block;
  text-align: left;
  list-style-position: inside;
  margin-left: 2px;
}

.listItem {
  font-size: 2vw;
  background-color: rgb(240, 240, 240);
}
</style>
