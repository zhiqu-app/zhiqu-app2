import Vue from "vue";
import { request } from "./api";
import { state } from "../store";
import { accountScope, assertScope } from "./courses";

const pending = new Map();

function validateGraph(graph, courseId) {
  if (
    graph?.courseId !== courseId ||
    graph?.course?.id !== courseId ||
    !Array.isArray(graph.nodes) ||
    !Array.isArray(graph.edges) ||
    !Array.isArray(graph.links)
  ) {
    throw new Error("课程星图响应不完整，请重新加载。");
  }
  const ids = new Set();
  for (const node of graph.nodes) {
    if (
      !node.id ||
      ids.has(node.id) ||
      typeof node.label !== "string" ||
      !Number.isFinite(node.x) ||
      !Number.isFinite(node.y)
    ) {
      throw new Error("知识点数据无效，请重新加载。");
    }
    ids.add(node.id);
  }
  if (
    graph.edges.some(
      (edge) =>
        !Array.isArray(edge) ||
        edge.length !== 2 ||
        edge.some(
          (i) => !Number.isInteger(i) || i < 0 || i >= graph.nodes.length,
        ),
    )
  ) {
    throw new Error("知识点连线无效，请重新加载。");
  }
  return graph;
}

function applyGraph(graph) {
  Vue.set(state.knowledgeGraphs, graph.courseId, graph);
  if (state.knowledgeCourseId === graph.courseId) {
    state.knowledgeGraph = graph;
    state.knowledgeStatus = "ready";
    state.knowledgeError = "";
  }
}

export async function loadCourseGraph(courseId, { force = false } = {}) {
  const scope = accountScope();
  assertScope(scope);
  state.knowledgeCourseId = courseId;
  state.knowledgeGraph = state.knowledgeGraphs[courseId] || null;
  const key = `${scope}:${courseId}`;
  if (pending.has(key)) return pending.get(key);
  if (!force && state.knowledgeGraphs[courseId])
    return state.knowledgeGraphs[courseId];
  state.knowledgeStatus = "loading";
  const operation = request(
    "/courses/" + encodeURIComponent(courseId) + "/knowledge",
  )
    .then((result) => {
      assertScope(scope);
      const graph = validateGraph(result, courseId);
      applyGraph(graph);
      return graph;
    })
    .catch((error) => {
      if (scope === accountScope() && state.knowledgeCourseId === courseId) {
        state.knowledgeStatus = "error";
        state.knowledgeError = error.message;
      }
      throw error;
    })
    .finally(() => {
      if (pending.get(key) === operation) pending.delete(key);
    });
  pending.set(key, operation);
  return operation;
}

export async function saveCourseGraph(courseId, body) {
  const scope = accountScope();
  assertScope(scope);
  const result = await request(
    "/courses/" + encodeURIComponent(courseId) + "/knowledge",
    { method: "PUT", body },
  );
  assertScope(scope);
  const graph = validateGraph(result, courseId);
  applyGraph(graph);
  return graph;
}
