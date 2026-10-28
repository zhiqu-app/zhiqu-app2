/** 后端偏移采用 UTF-16，与 JS slice 一致；先核对原文，避免旧偏移高亮到错误内容。 */
export function locateSource(text, source) {
  if (
    typeof text !== "string" ||
    typeof source?.excerpt !== "string" ||
    !source.excerpt.trim()
  )
    return null;
  const excerpt = source.excerpt;
  let start = source.start,
    end = source.end;
  if (
    !(
      Number.isInteger(start) &&
      Number.isInteger(end) &&
      start >= 0 &&
      end > start &&
      end <= text.length &&
      text.slice(start, end) === excerpt
    )
  ) {
    start = text.indexOf(excerpt);
    end = start + excerpt.length;
    if (start < 0) {
      // 兼容换行、PDF 折行和旧版本没有偏移的引用，保留到原始字符串的位置映射。
      const positions = [],
        compact = [];
      for (let i = 0; i < text.length; i++) {
        if (!/\s/.test(text[i])) {
          compact.push(text[i]);
          positions.push(i);
        }
      }
      const wanted = excerpt.replace(/\s/g, "");
      const index = compact.join("").indexOf(wanted);
      if (!wanted || index < 0) return null;
      start = positions[index];
      end = positions[index + wanted.length - 1] + 1;
    }
  }
  let page = null;
  for (const match of text.slice(0, start + 1).matchAll(/【第\s*(\d+)\s*页】/g))
    page = Number(match[1]);
  return { start, end, page };
}

/** 生成可由 Vue 安全插值的段落和高亮片段；不使用 v-html 渲染用户资料。 */
export function sourceParagraphs(text, range) {
  if (typeof text !== "string") return [];
  const paragraphs = [];
  for (const match of text.matchAll(/[^\r\n]+/g)) {
    if (!match[0].trim()) continue;
    const start = match.index,
      end = start + match[0].length;
    const left = Math.max(start, range?.start ?? end),
      right = Math.min(end, range?.end ?? start);
    const segments = [];
    if (left < right) {
      if (left > start)
        segments.push({ text: text.slice(start, left), highlighted: false });
      segments.push({ text: text.slice(left, right), highlighted: true });
      if (right < end)
        segments.push({ text: text.slice(right, end), highlighted: false });
    } else segments.push({ text: match[0], highlighted: false });
    paragraphs.push({ start, segments, highlighted: left < right });
  }
  return paragraphs;
}
