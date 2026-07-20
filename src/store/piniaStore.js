import { defineStore, acceptHMRUpdate } from "pinia";

export const useMainStore = defineStore("main", {
  state: () => ({
    filterPackage: {
      packageName: "",
      authors: "",
      desc: "",
      date: "",
      nodeFilterList: [],
      edgeFilterList: [],
    },
    json: null,
    // true once a filter package has been imported — the package explorer is
    // only shown for imported packages, not while building one from scratch.
    imported: false,
    edgeName: "",
    attributes: {},
    loopSelection: "",
    codeInput: "",
    generatedRegex: "",
    //captureGroup: "",
    fileExtension: "",
    regexName: "",
    excludes: "",
    nodeLabel: "",
    nodeAttributes: "",
    nodeCaptureGroups: "",
    nodeColor: "#8ebae5",
    labelAttribute: "",
    labelAttributeSelection: "",
    fromAttributeSelection: "",
    edgeLabel: "",
    edgeColorpicker: "#8ebae5",
    toSelection: "",
    fromSelection: "",
    toAttributeSelection: "",
    temp: "",
    inEditMode: false,
    labelSelection: [],
    // Separate scopes so a node filter and an edge filter can be loaded for
    // editing independently — a single shared scope locked the other section.
    editModeScope: "",
    edgeEditModeScope: "",
  }),
  getters: {
    getInEditMode: (state) => state.inEditMode,
    getEditModeScope: (state) => state.editModeScope,
    getEdgeEditModeScope: (state) => state.edgeEditModeScope,
    getTemp: (state) => state.temp,
    getFilterPackage: (state) => state.filterPackage,
    getPackageName: (state) => state.filterPackage.packageName,
    getAuthors: (state) => state.filterPackage.authors,
    getDesc: (state) => state.filterPackage.desc,
    getDate: (state) => state.filterPackage.date,
    getNodeFilterList: (state) => state.filterPackage.nodeFilterList,
    getEdgeFilterList: (state) => state.filterPackage.edgeFilterList,
    getJson: (state) => state.json,
    getImported: (state) => state.imported,
    getEdgeName: (state) => state.edgeName,
    getAttributes: (state) => state.attributes,
    getLoopSelection: (state) => state.loopSelection,
    getCodeInput: (state) => state.codeInput,
    getGeneratedRegex: (state) => state.generatedRegex,
    //getCaptureGroup: (state) => state.captureGroup,
    getFileExtension: (state) => state.fileExtension,
    getRegexName: (state) => state.regexName,
    getExcludes: (state) => state.excludes,
    getNodeLabel: (state) => state.nodeLabel,
    getNodeAttributes: (state) => state.nodeAttributes,
    getNodeCaptureGroups: (state) => state.nodeCaptureGroups,
    getNodeColor: (state) => state.nodeColor,
    getLabelAttribute: (state) => state.labelAttribute,
    getLabelAttributeSelection: (state) => state.labelAttributeSelection,
    getEdgeLabel: (state) => state.edgeLabel,
    getEdgeColorPicker: (state) => state.edgeColorpicker,
    getToSelection: (state) => state.toSelection,
    getFromSelection: (state) => state.fromSelection,
    getFromAttributeSelection: (state) => state.fromAttributeSelection,
    getToAttributeSelection: (state) => state.toAttributeSelection,
  },
  actions: {
    setInEditMode(payload) {
      this.inEditMode = payload;
    },
    setEditModeScope(payload) {
      this.editModeScope = payload;
    },
    setEdgeEditModeScope(payload) {
      this.edgeEditModeScope = payload;
    },
    setLabelSelection(payload) {
      this.labelSelection = payload;
    },
    setEdgeFilterList(payload) {
      this.filterPackage.edgeFilterList = payload;
    },
    setFromAttributeSelection(payload) {
      this.fromAttributeSelection = payload;
    },
    setTemp(payload) {
      this.temp = payload;
    },
    setAttributesByElement(att, payload) {
      this.attributes[att] = payload;
    },
    setPackageName(payload) {
      this.filterPackage.packageName = payload;
    },
    setAuthors(payload) {
      this.filterPackage.authors = payload;
    },
    setDesc(payload) {
      this.filterPackage.desc = payload;
    },
    setDate(payload) {
      this.filterPackage.date = payload;
    },
    setNodeFilterList(payload) {
      this.filterPackage.nodeFilterList = payload;
    },
    setNodeEdgeList(payload) {
      this.filterPackage.nodeEdgeList = payload;
    },
    setJson(payload) {
      this.json = payload;
    },
    setImported(payload) {
      this.imported = payload;
    },
    setEdgeName(payload) {
      this.edgeName = payload;
    },
    setAttributes(payload) {
      this.attributes = payload;
    },
    setLoopSelection(payload) {
      this.loopSelection = payload;
    },
    setCodeInput(payload) {
      this.codeInput = payload;
    },
    setGeneratedRegex(payload) {
      this.generatedRegex = payload;
    },
    //setCaptureGroup(payload) {
    //  this.captureGroup = payload;
    //},
    setFileExtension(payload) {
      this.fileExtension = payload;
    },
    setRegexName(payload) {
      this.regexName = payload;
    },
    setExcludes(payload) {
      this.excludes = payload;
    },
    setNodeLabel(payload) {
      this.nodeLabel = payload;
    },
    setNodeAttributes(payload) {
      this.nodeAttributes = payload;
    },
    setNodeCaptureGroups(payload) {
      this.nodeCaptureGroups = payload;
    },
    setNodeColor(payload) {
      this.nodeColor = payload;
    },
    setLabelAttribute(payload) {
      this.labelAttribute = payload;
    },
    setLabelAttributeSelection(payload) {
      this.labelAttributeSelection = payload;
    },
    setEdgeLabel(payload) {
      this.edgeLabel = payload;
    },
    setEdgeColorPicker(payload) {
      this.edgeColorpicker = payload;
    },
    setToSelection(payload) {
      this.toSelection = payload;
    },
    setFromSelection(payload) {
      this.fromSelection = payload;
    },
    setToAttributeSelection(payload) {
      this.toAttributeSelection = payload;
    },
  },
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useMainStore, import.meta.hot));
}
