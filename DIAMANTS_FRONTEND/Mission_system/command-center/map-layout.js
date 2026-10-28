/** Screen-space grouping keeps marker positions truthful and labels separate. */
export function groupMarkers(points, selectedId, threshold = 28) {
  const groups = [];
  for (const point of [...points].sort((a, b) => a.id.localeCompare(b.id))) {
    if (point.id === selectedId) {
      groups.push({ x: point.x, y: point.y, points: [point], selected: true });
      continue;
    }
    const group = groups.find(
      (g) =>
        !g.selected && Math.hypot(g.x - point.x, g.y - point.y) < threshold,
    );
    if (group) {
      group.points.push(point);
      group.x = group.points.reduce((s, p) => s + p.x, 0) / group.points.length;
      group.y = group.points.reduce((s, p) => s + p.y, 0) / group.points.length;
    } else
      groups.push({ x: point.x, y: point.y, points: [point], selected: false });
  }
  return groups;
}
export function placeLabel(point, width, height, occupied, viewport) {
  for (const [dx, dy] of [
    [14, -24],
    [14, 10],
    [-width - 14, -24],
    [-width - 14, 10],
  ]) {
    const box = { x: point.x + dx, y: point.y + dy, w: width, h: height };
    if (
      box.x < 5 ||
      box.y < 5 ||
      box.x + width > viewport.width - 5 ||
      box.y + height > viewport.height - 5
    )
      continue;
    if (
      occupied.some(
        (b) =>
          box.x < b.x + b.w + 4 &&
          box.x + box.w + 4 > b.x &&
          box.y < b.y + b.h + 4 &&
          box.y + box.h + 4 > b.y,
      )
    )
      continue;
    return box;
  }
  return null;
}
