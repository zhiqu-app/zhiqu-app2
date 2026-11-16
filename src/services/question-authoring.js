import { request } from "./api";
import { accountScope, assertScope } from "./courses";
import { state } from "../store";

const recentDraftLimit = 24;

async function accountRequest(path, options) {
  const scope = accountScope();
  assertScope(scope);
  const result = await request(path, options);
  assertScope(scope);
  return result;
}

export async function generatePracticeDrafts(body, signal) {
  const historyKey = `zhixu-ai-drafts:${state.account?.id}:${body.courseId}`;
  const previousTitles = readDraftTitles(historyKey);
  const result = await accountRequest("/assistant/practice-drafts", {
    method: "POST",
    body: { ...body, ...(previousTitles.length ? { excludeTitles: previousTitles } : {}) },
    signal,
  });
  if (!Array.isArray(result?.questions)) throw new Error("草稿响应不完整，请重新生成。");
  const titles = result.questions.map(({ title }) => title).filter((title) => typeof title === "string");
  try {
    const recent = [...new Set([...previousTitles, ...titles])].slice(-recentDraftLimit);
    sessionStorage.setItem(historyKey, JSON.stringify(recent));
  } catch (_) {
    // 禁用浏览器存储时，后端仍会检查题库和当前生成的草稿。
  }
  return result;
}

function readDraftTitles(key) {
  try {
    const titles = JSON.parse(sessionStorage.getItem(key));
    return Array.isArray(titles) ? titles.filter((title) => typeof title === "string" && title.trim())
      .slice(-recentDraftLimit).map((title) => [...title].slice(0, 500).join("")) : [];
  } catch (_) {
    return [];
  }
}

export async function associateQuestionNode(courseId, questionId, knowledgeNodeId) {
  const path = `/courses/${encodeURIComponent(courseId)}/questions/${encodeURIComponent(questionId)}/knowledge`;
  const result = await accountRequest(path, { method: "PATCH", body: { knowledgeNodeId } });
  if (result?.id !== questionId || result.knowledgeNodeId !== knowledgeNodeId)
    throw new Error("关联结果不完整，请刷新题库后检查。");
  return result;
}
