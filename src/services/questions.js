import { request } from "./api";
import { accountScope, assertScope, mergeTask } from "./courses";

async function list(path, params = {}) {
  const scope = accountScope();
  assertScope(scope);
  const items = [];
  let offset = 0;
  while (offset < 10000) {
    const query = new URLSearchParams({ ...params, limit: 100, offset });
    const page = await request(path + "?" + query);
    assertScope(scope);
    if (!Array.isArray(page.items)) throw new Error("列表响应不完整，请重试。");
    items.push(...page.items);
    offset += page.items.length;
    if (!page.items.length || offset >= page.total) return items;
  }
  throw new Error("数据过多，请缩小查询范围。");
}

export const loadQuestions = (courseId, knowledgeNodeId, taskId) =>
  list("/questions", {
    ...(courseId ? { courseId } : {}),
    ...(knowledgeNodeId ? { knowledgeNodeId } : {}),
    ...(taskId ? { taskId } : {}),
  });
export async function loadQuestion(id) {
  const scope = accountScope();
  const result = await request("/questions/" + encodeURIComponent(id));
  assertScope(scope);
  return result;
}
export async function importQuestions(courseId, body) {
  const scope = accountScope();
  const result = await request(
    "/courses/" + encodeURIComponent(courseId) + "/questions/import",
    { method: "POST", body },
  );
  assertScope(scope);
  return result;
}
export async function deleteQuestion(courseId, questionId) {
  const scope = accountScope();
  assertScope(scope);
  await request(
    `/courses/${encodeURIComponent(courseId)}/questions/${encodeURIComponent(questionId)}`,
    { method: "DELETE" },
  );
  assertScope(scope);
}
export async function submitAnswer(body) {
  const scope = accountScope();
  const result = await request("/attempts", { method: "POST", body });
  assertScope(scope);
  if (!result.attempt?.id || !Number.isInteger(result.answer))
    throw new Error("判分结果不完整，请重试保存。");
  return result;
}
export const loadMistakes = (courseId, status = "all", knowledgeNodeId) =>
  list("/mistakes", {
    ...(courseId ? { courseId } : {}),
    ...(knowledgeNodeId ? { knowledgeNodeId } : {}),
    status,
  });
async function scheduleMistake(id, action) {
  const scope = accountScope();
  const result = await request(
    "/mistakes/" + encodeURIComponent(id) + "/" + action,
    { method: "POST" },
  );
  assertScope(scope);
  mergeTask(result?.task);
  return result;
}
export const planMistake = (id) => scheduleMistake(id, "plan");
export const retestMistake = (id) => scheduleMistake(id, "retest");
export async function loadReport(range = "all", courseId) {
  const scope = accountScope();
  const result = await request(
    "/reports/summary?" +
      new URLSearchParams({ range, ...(courseId ? { courseId } : {}) }),
  );
  assertScope(scope);
  return result;
}
export async function loadOverview() {
  const scope = accountScope();
  const result = await request("/overview");
  assertScope(scope);
  return result;
}
