export const QUESTION_IMPORT_MAX_BYTES = 100 * 1024;

export const questionTemplate = {
  questions: [
    {
      title: "TCP 提供哪一种服务？",
      options: ["可靠的字节流传输", "只支持广播通信"],
      answer: 0,
      explanation: "TCP 提供面向连接的可靠字节流传输服务。",
      point: "可靠传输",
      source: null,
    },
  ],
};

// 前端负责可读的文件反馈；字段、所有权和配额最终仍由后端校验。
export function parseQuestionImport(text) {
  let parsed;
  try {
    parsed = JSON.parse(text.replace(/^\uFEFF/, ""));
  } catch (_) {
    throw new Error("JSON 格式不正确，请检查逗号、引号和括号。");
  }
  const body = Array.isArray(parsed) ? { questions: parsed } : parsed;
  if (
    !body ||
    typeof body !== "object" ||
    Object.keys(body).some((key) => key !== "questions") ||
    !Array.isArray(body.questions)
  ) {
    throw new Error('请使用 {"questions": [...]} 或题目数组格式。');
  }
  if (!body.questions.length || body.questions.length > 200)
    throw new Error("每次需要导入 1～200 道题。");
  const allowed = new Set([
    "title",
    "options",
    "answer",
    "explanation",
    "point",
    "source",
  ]);
  body.questions.forEach((q, index) => {
    const fail = (message) => {
      throw new Error("第 " + (index + 1) + " 题：" + message);
    };
    if (!q || typeof q !== "object" || Array.isArray(q))
      fail("题目必须是一个对象。");
    if (Object.keys(q).some((key) => !allowed.has(key)))
      fail("包含未支持的字段，请参照模板。");
    for (const [key, max] of [
      ["title", 500],
      ["explanation", 5000],
      ["point", 80],
    ]) {
      if (
        typeof q[key] !== "string" ||
        !q[key].trim() ||
        q[key].trim().length > max
      )
        fail(key + " 必须为 1～" + max + " 字的文字。");
    }
    if (
      !Array.isArray(q.options) ||
      q.options.length < 2 ||
      q.options.length > 6 ||
      q.options.some(
        (value) =>
          typeof value !== "string" ||
          !value.trim() ||
          value.trim().length > 500,
      )
    )
      fail("options 需要 2～6 个非空文字选项。");
    if (
      new Set(q.options.map((value) => value.trim())).size !== q.options.length
    )
      fail("选项不能重复。");
    if (
      !Number.isInteger(q.answer) ||
      q.answer < 0 ||
      q.answer >= q.options.length
    )
      fail("answer 必须是从 0 开始的有效整数选项下标。");
    if (
      q.source !== undefined &&
      q.source !== null &&
      (typeof q.source !== "string" || q.source.length > 64)
    )
      fail("source 应为同课程的资料 ID，或省略/传 null。");
  });
  return body;
}
