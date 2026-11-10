const DRAW_TIME = 0.9;
const drawDelay = (index) => Math.min(index * 0.08, 0.35);
export const drawEnd = (count) => count ? DRAW_TIME + drawDelay(count - 1) : 0;

function circle(ctx, x, y, radius) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
}

function drawLink(ctx, link, index, time, packets, selected) {
  const { from, to } = link;
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const startRadius = from.node.id === selected ? 17 : 12;
  const endRadius = to.node.id === selected ? 19 : 14;
  const length = distance - startRadius - endRadius;
  if (length <= 1 || time < drawDelay(index)) return;

  const dx = (to.x - from.x) / distance;
  const dy = (to.y - from.y) / distance;
  const x = from.x + dx * startRadius;
  const y = from.y + dy * startRadius;
  const endX = x + dx * length;
  const endY = y + dy * length;
  const active = from.node.id === selected || to.node.id === selected;
  const progress = Math.min(1, (time - drawDelay(index)) / DRAW_TIME);
  if (progress <= 0) return;

  ctx.strokeStyle = active ? "#e2b46d" : "#207fc0";
  ctx.lineWidth = active ? 2 : 1.6;
  if (progress < 1) {
    ctx.setLineDash([length, length]);
    ctx.lineDashOffset = length * (1 - progress) ** 3;
  }
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(endX, endY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineDashOffset = 0;
  if (progress < 1) return;

  ctx.beginPath();
  ctx.moveTo(endX - dx * 8 + dy * 4, endY - dy * 8 - dx * 4);
  ctx.lineTo(endX, endY);
  ctx.lineTo(endX - dx * 8 - dy * 4, endY - dy * 8 + dx * 4);
  ctx.stroke();

  const age = packets - index * 0.17;
  if (index >= 24 || age < 0) return;
  const duration = Math.max(1.6, Math.min(4.5, length / 130));
  const cycle = age % (duration + 0.9);
  if (cycle >= duration) return;
  const offset = length * cycle / duration;
  ctx.save();
  ctx.globalAlpha = Math.min(1, cycle / 0.12, (duration - cycle) / 0.18);
  ctx.shadowColor = active ? "#ffc777" : "#32bcff";
  ctx.shadowBlur = 9;
  ctx.fillStyle = active ? "#fff0cb" : "#d6faff";
  circle(ctx, x + dx * offset, y + dy * offset, 2.6);
  ctx.fill();
  ctx.restore();
}

function drawNode(ctx, point, active, pulse) {
  const { x, y } = point;
  if (active && pulse >= 0) {
    ctx.save();
    ctx.strokeStyle = "#ffc777";
    ctx.lineWidth = 1.2;
    for (const delay of [0, 0.7]) {
      if (pulse < delay) continue;
      const progress = ((pulse - delay) % 2.05) / 1.7;
      if (progress >= 1) continue;
      ctx.globalAlpha = (1 - progress) * 0.65;
      circle(ctx, x, y, 15 + 28 * (1 - (1 - progress) ** 2));
      ctx.stroke();
    }
    ctx.restore();
  }

  const color = active ? "#ffc777" : "#32bcff";
  circle(ctx, x, y, active ? 22 : 16);
  ctx.fillStyle = active ? "#ffc77716" : "#32bcff18";
  ctx.fill();
  circle(ctx, x, y, active ? 17 : 12);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 13;
  ctx.fillStyle = active ? "#ffe6a9" : "#94eeff";
  circle(ctx, x, y, active ? 7 : 5);
  ctx.fill();
  ctx.restore();
}

export function drawCanvasGraph(ctx, points, links, selected, time, pulse, reduced) {
  ctx.lineCap = "round";
  const packets = reduced ? -1 : time - drawEnd(links.length);
  links.forEach((link, index) => drawLink(ctx, link, index, time, packets, selected));
  points.forEach((point) => drawNode(ctx, point, point.node.id === selected, reduced ? -1 : pulse));
}
