/* eslint-disable prettier/prettier */
/* eslint-disable no-undef */

/**
 * This function creates edges between nodes based on the given edge filter.
 * It first determines all eligible source and target nodes based on the filter criteria.
 * Then it calls the createEdges function to generate the edges between these nodes.
 * @param {ObjectConstructor} graph The generated graph
 * @param {JSON} filter A generated filter file.
 * @returns After edges were created.
 */
exports.filterEdge = async function (graph, filter) {
  /*
  Only nodes which have the given filter metadata are considered for edge creation:
    1. they need to have the specific filter tag
    2. they need to have the attribute the edge filter is looking for (depending on from/to)
  */
  let eligibleNodesFrom = graph.nodes.filter(
    (el) =>
      el.meta.filterID === filter.from.nodeFilterID &&
      el.meta.matches[filter.from.attribute]
  );
  let eligibleNodesTo = graph.nodes.filter(
    (el) =>
      el.meta.filterID === filter.to.nodeFilterID &&
      el.meta.matches[filter.to.attribute]
  );
  try {
    await createEdges(graph, eligibleNodesFrom, eligibleNodesTo, filter);
  } catch (e) {
    console.warn(e);
    throw (
      "An error has occurred while creating the edges of filter " + filter.id
    );
  }
  return;
};

/**
 * Decides whether two attribute values should be linked.
 *
 * The default is strict equality. A source value may still list several targets
 * (multiple inheritance, "Base, Mixin"), so it is split on commas first. Purely
 * substring matching was the previous behaviour and is still available per
 * filter via "mode": "contains" — it links "BaseEstimator" to "Base", which is
 * usually a false positive.
 *
 * Some languages ignore letter case: Fortran accepts CALL SOLVE and
 * SUBROUTINE Solve as the same routine, and the captured text keeps whatever
 * casing the source happened to use. Filters for those languages set
 * "caseInsensitive": true so the two still match.
 * @param {string} fromValue Attribute value of the source node.
 * @param {string} toValue Attribute value of the target node.
 * @param {string} mode Either "contains" or "strict" (the default).
 * @param {boolean} caseInsensitive Compare the values ignoring letter case.
 * @returns {boolean} True if an edge should be created.
 */
const matchesAttribute = function (fromValue, toValue, mode, caseInsensitive) {
  if (typeof fromValue !== "string" || typeof toValue !== "string") {
    return false;
  }
  const normalise = (value) => (caseInsensitive ? value.toLowerCase() : value);
  const from = normalise(fromValue);
  const to = normalise(toValue);
  if (mode === "contains") {
    return from.includes(to) || to.includes(from);
  }
  return from
    .split(",")
    .map((part) => part.trim())
    .includes(to.trim());
};

/**
 * Helper function to create the actual edges for edge filters from the eligible nodes which are being determined through the filterEdge function.
 * For every eligible source node it checks for each eligible target node if an edge should be created.
 * @param {ObjectConstructor} graph The graph data of the current graph with all its nodes and edges.
 * @param {Array} eligibleNodesFrom A list of eligible source nodes determined by the filterEdge function.
 * @param {Array} eligibleNodesTo A list of eligible target nodes determined by the filterEdge function.
 * @param {ObjectConstructor} filter The edge filter for which the edges should be created.
 */
const createEdges = async function (
  graph,
  eligibleNodesFrom,
  eligibleNodesTo,
  filter
) {
  const mode = filter.mode === "contains" ? "contains" : "strict";
  const caseInsensitive = filter.caseInsensitive === true;
  for (nodeFrom of eligibleNodesFrom) {
    for (nodeTo of eligibleNodesTo) {
      if (
        matchesAttribute(
          nodeFrom.meta.matches[filter.from.attribute],
          nodeTo.meta.matches[filter.to.attribute],
          mode,
          caseInsensitive
        )
      ) {
        graph.edges.push({
          from: nodeFrom.id,
          to: nodeTo.id,
          label: filter.label,
          meta: {
            filter: filter.id,
            color: filter.style.color,
          },
          arrows: "to",
        });
      }
    }
  }
};
