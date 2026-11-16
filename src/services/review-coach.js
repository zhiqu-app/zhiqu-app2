import { request } from "./api";
import { accountScope, assertScope, mergeTask } from "./courses";

let pendingDraft;

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
