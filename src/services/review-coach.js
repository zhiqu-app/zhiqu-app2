import { request } from "./api";
import { accountScope, assertScope, mergeTask } from "./courses";

let pendingDraft;

export const COACH_STATUS_MESSAGES = {
  no_evidence: "这个知识点暂时没有未做过的题，也没有检索到能支持出题的讲义。可以补充讲义后再生成。",
  no_history: "近 14 天没有仍答错的记录。可以先完成一次练习，教练会根据作答推荐复习内容。",
  needs_link: "近 14 天还有未纠正的错题，但这些题目尚未关联有效的星图知识点。请先在题库补绑知识点。",
  model_needed: "已找到讲义，但本课程没有未做过的题。配置出题模型后可生成草稿，也可以先手动添加。",
  drafts: "已找到相关讲义，题库暂时没有未做过的题。可以根据讲义生成草稿，核对后再入库。",
};

export async function runReviewCoach(body, signal) {
  const scope = accountScope();
  assertScope(scope);
  const result = await request("/assistant/review-coach", { method: "POST", body, signal });
  assertScope(scope);
  return result;
}

export async function saveCoachPlan(body) {
  const scope = accountScope();
  assertScope(scope);
  const task = await request("/assistant/review-coach/confirm", { method: "POST", body });
  assertScope(scope);
  return mergeTask(task);
}

export async function loadCoachHistory(offset, signal) {
  const scope = accountScope();
  assertScope(scope);
  const query = new URLSearchParams({ limit: 10, offset });
  const page = await request("/assistant/review-coach/history?" + query, { signal });
  assertScope(scope);
  if (!Array.isArray(page.items)) throw new Error("历史建议读取失败，请重试。");
  return page;
}

export function queueCoachDraft(courseId, nodeId, count) {
  pendingDraft = { scope: accountScope(), courseId, nodeId, count };
}

export function takeCoachDraft(courseId, nodeId) {
  if (!pendingDraft || pendingDraft.scope !== accountScope() || pendingDraft.courseId !== courseId || pendingDraft.nodeId !== nodeId)
    return null;
  const request = pendingDraft;
  pendingDraft = null;
  return request;
}
