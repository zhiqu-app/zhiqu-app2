import Vue from "vue";
import { state } from "../store";
import { request } from "./api";
import { accountScope, assertScope } from "./courses";

export const guideEvents = new Vue();
export const guideState = Vue.observable({ activeStep: "" });

export function recordGuideAction(step, courseId) {
  if (state.account?.id && courseId) {
    guideEvents.$emit("complete", { step, courseId, accountId: state.account.id });
  }
}

export async function askWorkspaceGuide(body, signal) {
  const scope = accountScope();
  assertScope(scope);
  const result = await request("/assistant/workspace-guide", { method: "POST", body, signal });
  assertScope(scope);
  return result;
}
