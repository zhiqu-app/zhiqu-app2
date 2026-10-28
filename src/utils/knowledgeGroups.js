// 大知识点分类与知识依赖分开：只过滤展示范围，始终用稳定节点 ID 保留跨组关系。
export const MAX_GROUP_NODES = 6;
const slots = [
  { x: 130, y: 80 },
  { x: 380, y: 80 },
  { x: 630, y: 80 },
  { x: 130, y: 210 },
  { x: 380, y: 210 },
  { x: 630, y: 210 },
];

// 只有用户点击“自动排布”才调用；普通增删与切换不修改已有节点坐标。
export function layoutGroup(nodes) {
  return nodes.map((node, index) => ({ ...node, ...(slots[index] || {}) }));
}

export function nextNodePosition(nodes) {
  if (nodes.length >= MAX_GROUP_NODES) return null;
  if (!nodes.length) return { ...slots[0] };
  const points = nodes.filter(
    (node) => Number.isFinite(node.x) && Number.isFinite(node.y),
  );
  const score = (point) =>
    points.length
      ? Math.min(
          ...points.map(
            (node) => (node.x - point.x) ** 2 + (node.y - point.y) ** 2,
          ),
        )
      : Infinity;
  let best = slots.reduce((a, b) => (score(b) > score(a) ? b : a));
  // 手动坐标可能占住候选位置；在剩余空间寻找离旧节点最远的点，仍不移动旧节点。
  if (score(best) < 75 ** 2) {
    for (let x = 90; x <= 670; x += 40) {
      for (let y = 65; y <= 220; y += 30) {
        if (score({ x, y }) > score(best)) best = { x, y };
      }
    }
  }
  return { ...best };
}

export function normalizeGroups(graph) {
  if (!graph) return { groups: [], nodes: [], links: [] };
  const groups = (graph.groups || []).map((group) => ({ ...group }));
  const ids = new Set(groups.map((group) => group.id));
  const nodes = (graph.nodes || []).map((node) => ({ ...node }));
  const unassigned = nodes.filter((node) => !ids.has(node.groupId));
  for (let offset = 0; offset < unassigned.length; offset += MAX_GROUP_NODES) {
    let id = "legacy-" + (offset / MAX_GROUP_NODES + 1);
    while (ids.has(id)) id += "-";
    ids.add(id);
    groups.push({
      id,
      title: "待整理大知识点 " + (offset / MAX_GROUP_NODES + 1),
      legacy: true,
    });
    unassigned.slice(offset, offset + MAX_GROUP_NODES).forEach((node) => {
      node.groupId = id;
    });
  }
  const links =
    graph.links ||
    (graph.edges || [])
      .map(([a, b]) => ({
        source: graph.nodes[a]?.id,
        target: graph.nodes[b]?.id,
      }))
      .filter((link) => link.source && link.target);
  return { ...graph, groups, nodes, links };
}

export function groupSlice(graph, groupId) {
  const nodes = graph.nodes.filter((node) => node.groupId === groupId);
  const indexes = new Map(nodes.map((node, index) => [node.id, index]));
  const edges = (graph.links || [])
    .filter((link) => indexes.has(link.source) && indexes.has(link.target))
    .map((link) => [indexes.get(link.source), indexes.get(link.target)]);
  return { nodes, edges };
}

export function relatedAcrossGroups(graph, selectedId) {
  const selected = graph.nodes.find((node) => node.id === selectedId);
  if (!selected) return [];
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const groups = new Map(
    (graph.groups || []).map((group) => [group.id, group.title]),
  );
  return (graph.links || [])
    .filter((link) => link.source === selectedId || link.target === selectedId)
    .map((link) => {
      const prerequisite = link.target === selectedId;
      const node = byId.get(prerequisite ? link.source : link.target);
      return node && node.groupId !== selected.groupId
        ? {
            ...node,
            direction: prerequisite ? "prerequisite" : "next",
            groupTitle: groups.get(node.groupId),
          }
        : null;
    })
    .filter(Boolean);
}
