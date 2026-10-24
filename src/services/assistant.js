// 后端接入点：替换该函数的实现即可；密钥应仅保存在后端。
// 当前为本地关键词检索演示，既不请求大模型，也不伪造 AI 引用。
export async function askAssistant({ question, materials, signal }) {
  if (signal && signal.aborted) throw new DOMException('Aborted', 'AbortError')
  const terms = question
    .replace(/[？?，,。！!]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  const keywords = [
    '特征值',
    '特征向量',
    '对角矩阵',
    '二叉树',
    '前序',
    '中序',
    '后序',
    '栈',
    '队列'
  ]
  const wanted = keywords.filter((k) => question.includes(k))
  const matches = materials
    .filter((m) => m.text)
    .flatMap((m) =>
      m.text
        .split('\n')
        .filter((p) => p.trim())
        .map((p) => ({
          materialId: m.id,
          name: m.name,
          excerpt: p,
          score:
            wanted.filter((k) => p.includes(k)).length +
            terms.filter((t) => t.length >= 2 && p.includes(t)).length
        }))
    )
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
  return matches.length
    ? {
        text: '在当前课程资料中找到以下相关内容：\n\n' + matches.map((m) => m.excerpt).join('\n\n'),
        sources: matches
      }
    : {
        text: '当前课程资料不足以回答这个问题。你可以上传包含相关知识点的 TXT 资料，或换一个问题。',
        sources: []
      }
}
