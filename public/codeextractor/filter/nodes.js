/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
let helper = require("./helper/regExHelper");
let fs = require("fs");
let util = require("util");
let readFile = util.promisify(fs.readFile);
let matchAll = require("string.prototype.matchall");

/**
 * This function extracts the RegEx from the given node filter and selects all file-nodes with a matching file extension as eligible.
 * Then runs the addNodeToGraph function to resolve the Promise and add the data to the file-node.
 * @param {Object} graph The current graph Object.
 * @param {Object} filter The node filter Object.
 * @returns After all eligible file-nodes were processed.
 */
const NOTEBOOK_EXTENSION = ".ipynb";

/**
 * Extracts the executable source from a Jupyter/Colab notebook.
 *
 * A notebook is nested JSON, not source code, so a regular expression run over
 * the raw file also matches markdown cells and stored cell outputs. Those are
 * separated structurally here instead: only code cells are read, and their
 * outputs are never looked at. The concatenated result is ordinary source, so
 * the existing language filters apply to it unchanged.
 *
 * Note that line numbers then refer to the concatenated code rather than to a
 * position in the .ipynb file.
 * @param {string} raw Contents of the .ipynb file.
 * @param {string} expectedExtension File extension the filter targets, e.g. ".py".
 * @returns {string|null} The code cells joined together, or null when the
 * notebook is unreadable or written in another language.
 */
const ipynbToSource = function (raw, expectedExtension) {
  let notebook;
  try {
    notebook = JSON.parse(raw);
  } catch (e) {
    console.warn("Notebook could not be parsed and was skipped: " + e.message);
    return null;
  }
  // Apply a filter only to notebooks of its own language.
  let info = (notebook.metadata && notebook.metadata.language_info) || {};
  let notebookExtension = info.file_extension || ".py";
  if (expectedExtension && notebookExtension !== expectedExtension) {
    return null;
  }
  return (notebook.cells || [])
    .filter((cell) => cell.cell_type === "code")
    .map((cell) =>
      Array.isArray(cell.source) ? cell.source.join("") : cell.source || ""
    )
    .join("\n");
};

exports.filterNode = async function (graph, filter) {
  let filterRegExp = RegExp.fromString(filter.regex);
  // Set all file-nodes to be modified by the specific filter (for all eligible
  // files). Notebooks are included too: their code cells are written in the
  // filter's language even though the file extension is .ipynb.
  let eligibleFiles = graph.nodes.filter(
    (el) =>
      el.meta.file &&
      (el.meta.extension === filter.extension ||
        el.meta.extension === NOTEBOOK_EXTENSION)
  );
  // For every eligible file add data to file-node
  await Promise.all(
    eligibleFiles.map(async (e) => {
      let data = await readFile(e.id, "utf-8");
      if (e.meta.extension === NOTEBOOK_EXTENSION) {
        data = ipynbToSource(data, filter.extension);
        if (data === null) return;
      }
      addNodeToGraph(graph, filterRegExp, filter, e, data);
    })
  );
  return;
};

/**
 * Blanks out all occurrences of the Regular Expressions inside the data.
 *
 * Empty entries are skipped: the shipped filters carry an "exclude": [""]
 * placeholder, and an empty pattern would otherwise match everywhere.
 *
 * The matched text is replaced with its own line breaks rather than with
 * nothing, so every later line keeps its original number. Deleting a
 * multi-line docstring outright would shift every following line upwards and
 * the recorded line numbers — which "open in editor" jumps to — would point at
 * the wrong place.
 * @param {Array<string>} excludes Exclude RegEx strings.
 * @param {string} data Code File.
 * @returns The data with every excluded region blanked out.
 */
const replaceExcludes = function (excludes, data) {
  for (exclude of excludes) {
    if (!exclude) continue;
    let r = RegExp.fromString(exclude);
    data = data.replace(r, (match) => match.replace(/[^\n]/g, ""));
  }

  return data;
};

/**
 * Adds nodes to the graph based on the matches of the RegExp in the data of the file-node.
 * @param {Object} graph The current graph object.
 * @param {RegExp} regExp A Regular Expression.
 * @param {Object} filter A valid node filter.
 * @param {Object} fileNode A node of the graph representing a file.
 * @param {string} data Code File.
 * @returns After the nodes were added to the graph.
 */
const addNodeToGraph = function (graph, regExp, filter, fileNode, data) {
  // The filter files spell this key "exclude"; reading "excludes" meant the
  // feature never ran.
  if (filter.exclude) {
    data = replaceExcludes(filter.exclude, data);
  }
  let lineArr = data.split("\n");
  let matches = [];
  // for every line, test for regexp
  lineArr.forEach((line, index) => {
    let matchArr = [...matchAll(line, regExp)];
    // for every match (in every line, see above) push match data and line to match array
    matchArr.forEach((matchData) => {
      matches.push({
        matchData,
        lineIndex: index + 1,
      });
    });
  });
  // for every match
  for (match of matches) {
    // define every predefined attribute
    let attributes = {};
    for (a in filter.attributes) {
      // by trying to match the index to the attribute
      for (index of filter.attributes[a]) {
        if (match.matchData[index]) {
          attributes[a] = match.matchData[index];
          break;
        }
      }
    }
    // Generates the String of an attribute Object entry
    let attributesToString = function (obj) {
      let arr = Object.keys(obj).reduce(function (res, v) {
        return res.concat(obj[v]);
      }, []);
      return arr.toString();
    };
    let idStringTemp = fileNode.id + "|" + attributesToString(attributes);
    // Handles duplicates. Two declarations in one file that carry the same
    // attribute values collapse into a single node, so the count is recorded on
    // the graph — otherwise there is no way to report how many symbols were
    // dropped.
    if (graph.nodes.some((e) => e.id === idStringTemp)) {
      if (!graph.meta) graph.meta = {};
      if (!graph.meta.duplicates) graph.meta.duplicates = {};
      graph.meta.duplicates[filter.id] =
        (graph.meta.duplicates[filter.id] || 0) + 1;
      console.warn("duplicate node skipped: " + idStringTemp);
      continue;
    }
    // Actual generation of a node
    // If a label Attribute exists in the filter file: generate the label as expected
    let generatedLabel = filter.labelAttribute
      ? filter.label + ": " + attributes[filter.labelAttribute]
      : filter.label;
    //create new node
    let newNode = {
      id: idStringTemp,
      label: generatedLabel,
      group: fileNode.id,
      meta: {
        color: filter.style.color,
        filterID: filter.id,
        matches: attributes,
        line: match.lineIndex,
      },
    };
    //create edge
    graph.nodes.push(newNode);
    let newEdge = {
      from: idStringTemp,
      to: fileNode.id,
      meta: {
        filterID: filter.id,
        color: filter.style.color,
      },
    };
    graph.edges.push(newEdge);
  }
  return;
};
