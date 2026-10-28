import { groupMarkers, placeLabel } from "./map-layout.js";
/** Canvas renders measured world positions. All coordinates are local metres. */
export class TacticalMap {
  constructor(canvas, onSelect) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.onSelect = onSelect;
    this.zoom = 1;
    this.framing = "fleet";
    this.center = { x: 0, z: 0 };
    this.layers = { trails: true, links: false, coverage: true };
    this.showLabels = true;
    this.trails = new Map();
    this.selected = null;
    this.snapshot = {
      drones: [],
      trees: [],
      visited: new Set(),
      cellSize: 5,
      zoneRadius: 30,
    };
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.onClick = (event) => {
      if (this.dragged) {
        this.dragged = false;
        return;
      }
      const r = canvas.getBoundingClientRect(),
        x = event.clientX - r.left,
        y = event.clientY - r.top;
      if (this.onPickTarget) {this.onPickTarget(this.unproject(x,y));return;}
      if (this.onPlanPoint && this.editingPlan) {
        this.onPlanPoint(this.unproject(x, y));
        return;
      }
      const cluster = this.groups?.find(
        (g) => g.points.length > 1 && Math.hypot(g.x - x, g.y - y) < 20,
      );
      if (cluster) {
        this.framing = null;
        this.center = this.unproject(cluster.x, cluster.y);
        this.zoom = Math.min(9, this.zoom * 2);
        this.draw();
        return;
      }
      let best = null,
        distance = 22;
      for (const d of this.snapshot.drones) {
        if (!d.position) continue;
        const p = this.project(d.position.x, d.position.z),
          dist = Math.hypot(p.x - x, p.y - y);
        if (dist < distance) {
          best = d;
          distance = dist;
        }
      }
      if (best) onSelect(best.id);
    };
    canvas.addEventListener("click", this.onClick);
    canvas.addEventListener("pointerdown", (e) => {
      if(e.shiftKey && this.onSelectGroup) {
        this.framing=null;
        const r=canvas.getBoundingClientRect();
        this.selectionBox={x:e.clientX-r.left,y:e.clientY-r.top,endX:e.clientX-r.left,endY:e.clientY-r.top};
        this.dragged=true;canvas.setPointerCapture(e.pointerId);return;
      }
      if (this.canResizeBounds && !this.editingPlan && !this.onPickTarget) {
        const rect = canvas.getBoundingClientRect();
        const hit = this.boundsHandle(e.clientX - rect.left, e.clientY - rect.top);
        const b = this.snapshot.halfBounds;
        if (hit) {
          this.resizeAxes = hit;
          this.framing = null;
          this.resizingBounds = true;
          this.dragged = true;
          this.previewBounds = { ...b };
          canvas.setPointerCapture(e.pointerId);
          return;
        }
      }
      this.drag = { x: e.clientX, y: e.clientY, center: { ...this.center } };
      this.dragged = false;
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener("pointermove", (e) => {
      if(this.selectionBox) {
        const r=canvas.getBoundingClientRect();
        this.selectionBox.endX=e.clientX-r.left;this.selectionBox.endY=e.clientY-r.top;this.draw();return;
      }
      if (this.resizingBounds) {
        const rect = canvas.getBoundingClientRect();
        const p = this.unproject(e.clientX - rect.left, e.clientY - rect.top);
        this.previewBounds = {
          x: this.resizeAxes.x ? Math.max(5, Math.min(5000, Math.round(Math.abs(p.x)))) : this.previewBounds.x,
          z: this.resizeAxes.z ? Math.max(5, Math.min(5000, Math.round(Math.abs(p.z)))) : this.previewBounds.z,
        };
        this.draw();
        return;
      }
      const rect = canvas.getBoundingClientRect();
      this.hoverBounds = this.canResizeBounds && !this.editingPlan && this.boundsHandle(e.clientX - rect.left, e.clientY - rect.top);
      canvas.style.cursor = this.hoverBounds ? (this.hoverBounds.x && this.hoverBounds.z ? "nwse-resize" : this.hoverBounds.x ? "ew-resize" : "ns-resize") : "crosshair";
      this.draw();
      if (this.drag && e.buttons) {
        const dx = e.clientX - this.drag.x,
          dy = e.clientY - this.drag.y;
        if (Math.hypot(dx, dy) > 5) this.dragged = true;
        if (this.dragged) {
          this.framing = null;
          this.center.x = this.drag.center.x - dx / this.scale;
          this.center.z = this.drag.center.z - dy / this.scale;
          this.draw();
        }
      }
    });
    canvas.addEventListener("pointerup", () => {
      if(this.selectionBox) {
        const b=this.selectionBox;
        const ids=this.snapshot.drones.filter(d=>{if(!d.position)return false;const p=this.project(d.position.x,d.position.z);return p.x>=Math.min(b.x,b.endX)&&p.x<=Math.max(b.x,b.endX)&&p.y>=Math.min(b.y,b.endY)&&p.y<=Math.max(b.y,b.endY);}).map(d=>d.id);
        this.selectionBox=null;this.onSelectGroup(ids);this.draw();return;
      }
      if (this.resizingBounds) {
        const bounds = this.previewBounds;
        this.resizingBounds = false;
        this.previewBounds = null;
        this.onBoundsChange?.(bounds);
        this.draw();
      }
      this.drag = null;
    });
    canvas.addEventListener("pointercancel", () => {
      this.selectionBox=null;
      this.resizingBounds = false;
      this.previewBounds = null;
      this.draw();
      this.drag = null;
    });
    canvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        if (this.resizingBounds) return;
        this.changeZoom(e.deltaY < 0 ? 1.12 : 1 / 1.12);
      },
      { passive: false },
    );
  }
  boundsHandle(x, y) {
    const b = this.snapshot.halfBounds;
    if (!b) return null;
    const a = this.project(-b.x, -b.z), c = this.project(b.x, b.z);
    const nearX = Math.min(Math.abs(x-a.x), Math.abs(x-c.x)) < 16;
    const nearZ = Math.min(Math.abs(y-a.y), Math.abs(y-c.y)) < 16;
    if (x < a.x-16 || x > c.x+16 || y < a.y-16 || y > c.y+16) return null;
    return nearX || nearZ ? {x:nearX, z:nearZ} : null;
  }
  resize() {
    const r = this.canvas.getBoundingClientRect();
    this.width = r.width;
    this.height = r.height;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(r.width * dpr);
    this.canvas.height = Math.round(r.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.draw();
  }
  get scale() {
    return (Math.min(this.width || 500, this.height || 400) / 190) * this.zoom;
  }
  project(x, z) {
    return {
      x: this.width / 2 + (x - this.center.x) * this.scale,
      y: this.height / 2 + (z - this.center.z) * this.scale,
    };
  }
  unproject(x, y) {
    return {
      x: (x - this.width / 2) / this.scale + this.center.x,
      z: (y - this.height / 2) / this.scale + this.center.z,
    };
  }
  changeZoom(factor) {
    this.framing = null;
    this.zoom = Math.max(0.001, Math.min(9, this.zoom * factor));
    this.draw();
  }
  fitBounds() {
    const b = this.snapshot.halfBounds;
    if (!b) return;
    this.framing = null;
    this.center = { x: 0, z: 0 };
    this.zoom = Math.min((this.width - 110) / (b.x * 2), (this.height - 110) / (b.z * 2)) / (Math.min(this.width, this.height) / 190);
    this.draw();
  }
  reset() {
    this.framing = "fleet";
    this.frameCurrent();
    this.draw();
  }
  focusAgent() {
    this.framing = "agent";
    this.frameCurrent();
    this.draw();
  }
  frameCurrent() {
    if (!this.framing) return;
    const positions = this.snapshot.drones
      .filter(
        (d) =>
          d.position && (this.framing !== "agent" || d.id === this.selected),
      )
      .map((d) => d.position);
    if (!positions.length) return;
    const minX = Math.min(...positions.map((p) => p.x)),
      maxX = Math.max(...positions.map((p) => p.x)),
      minZ = Math.min(...positions.map((p) => p.z)),
      maxZ = Math.max(...positions.map((p) => p.z));
    this.center = { x: (minX + maxX) / 2, z: (minZ + maxZ) / 2 };
    const scale = Math.min(
      Math.max(50, this.width - 150) / Math.max(50, maxX - minX + 20),
      Math.max(50, this.height - 180) / Math.max(50, maxZ - minZ + 20),
    );
    this.zoom = Math.max(
      0.55,
      Math.min(
        this.framing === "agent" ? 6 : 4,
        scale / (Math.min(this.width || 500, this.height || 400) / 190),
      ),
    );
  }
  update(snapshot, selected) {
    this.snapshot = snapshot;
    this.selected = selected;
    this.frameCurrent();
    for (const d of snapshot.drones) {
      if (!d.position) continue;
      let trail = this.trails.get(d.id) || [];
      const last = trail.at(-1);
      if (
        !last ||
        Math.hypot(last.x - d.position.x, last.z - d.position.z) > 0.4
      ) {
        trail.push({ ...d.position });
        if (trail.length > 180) trail.shift();
        this.trails.set(d.id, trail);
      }
    }
    this.draw();
  }
  draw() {
    const ctx = this.ctx,
      w = this.width,
      h = this.height;
    if (!w || !h) return;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#172118";
    ctx.fillRect(0, 0, w, h);
    const glow = ctx.createRadialGradient(
      w * 0.46,
      h * 0.48,
      10,
      w * 0.46,
      h * 0.48,
      w * 0.65,
    );
    glow.addColorStop(0, "#34412b");
    glow.addColorStop(1, "#121b15");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
    // Survey grid, not a fabricated geographic basemap.
    ctx.lineWidth = 0.7;
    ctx.strokeStyle = "#a3bb7d0d";
    for (let a = -400; a <= 400; a += 10) {
      const x = this.project(a, 0).x,
        y = this.project(0, a).y;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.font = '8px "IBM Plex Mono",monospace';
    ctx.fillStyle = "#71856670";
    for (let a = -200; a <= 200; a += 40) {
      const x = this.project(a, 0).x;
      if (x > 10 && x < w - 10) ctx.fillText(`${a}`, x + 4, 13);
      const y = this.project(0, a).y;
      if (y > 85 && y < h - 50) ctx.fillText(`${a}`, 7, y - 4);
    }
    // Draw the actual forest inventory supplied by TerrainEnvironment.
    for (const tree of this.snapshot.trees) {
      const p = this.project(tree.x, tree.z),
        radius = 4 * this.scale;
      if (
        p.x < -radius ||
        p.x > w + radius ||
        p.y < -radius ||
        p.y > h + radius
      )
        continue;
      const shade = ctx.createRadialGradient(
        p.x - 2,
        p.y - 3,
        0,
        p.x,
        p.y,
        radius,
      );
      shade.addColorStop(0, "#74825780");
      shade.addColorStop(0.43, "#53684475");
      shade.addColorStop(0.75, "#2c492e60");
      shade.addColorStop(1, "#17301e00");
      ctx.fillStyle = shade;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#83936725";
      ctx.beginPath();
      ctx.arc(p.x - 1, p.y - 2, radius * 0.6, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (this.layers.coverage) {
      ctx.fillStyle = "#bddc7e16";
      const size = this.snapshot.cellSize * this.scale;
      for (const key of this.snapshot.visited) {
        const [x, z] = String(key).split(",").map(Number);
        if (!Number.isFinite(x) || !Number.isFinite(z)) continue;
        const p = this.project(
          x * this.snapshot.cellSize,
          z * this.snapshot.cellSize,
        );
        ctx.fillRect(p.x, p.y, size - 1, size - 1);
      }
    }
    if(this.squadPath?.length) {
      ctx.strokeStyle='#76c8ee';ctx.fillStyle='#b4e6ff';ctx.lineWidth=2;ctx.setLineDash([4,4]);ctx.beginPath();
      this.squadPath.forEach((p,i)=>{const q=this.project(p.x,p.z);if(i)ctx.lineTo(q.x,q.y);else ctx.moveTo(q.x,q.y);});ctx.stroke();ctx.setLineDash([]);
      this.squadPath.forEach((p,i)=>{const q=this.project(p.x,p.z);ctx.strokeRect(q.x-6,q.y-6,12,12);ctx.font='11px monospace';ctx.fillText(`E${i+1}`,q.x+9,q.y-9);});
    }
    if(this.squadTarget) {
      const q=this.project(this.squadTarget.x,this.squadTarget.z);ctx.strokeStyle='#f5c275';ctx.fillStyle='#ffe2b0';ctx.lineWidth=3;
      ctx.beginPath();ctx.arc(q.x,q.y,13,0,Math.PI*2);ctx.stroke();ctx.font='bold 11px monospace';ctx.fillText(`EN COURS · ${this.squadTarget.step}`,q.x+18,q.y+5);
    }
    if(this.selectionBox) {
      const b=this.selectionBox;ctx.fillStyle='#bddd7c25';ctx.strokeStyle='#d6f098';ctx.lineWidth=1;
      ctx.fillRect(b.x,b.y,b.endX-b.x,b.endY-b.y);ctx.strokeRect(b.x,b.y,b.endX-b.x,b.endY-b.y);
    }
    const origin = this.project(0, 0),
      r = this.snapshot.zoneRadius * this.scale;
    const bounds = this.previewBounds || this.snapshot.halfBounds;
    const rx =
        (bounds?.x ?? this.snapshot.zoneRadius) * this.scale,
      rz =
        (bounds?.z ?? this.snapshot.zoneRadius) * this.scale;
    ctx.strokeStyle = "#b8ca843b";
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 6]);
    ctx.strokeRect(origin.x - rx, origin.y - rz, rx * 2, rz * 2);
    ctx.setLineDash([]);
    ctx.strokeStyle = "#b6c99018";
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#99ae7699";
    ctx.font = '8px "IBM Plex Mono",monospace';
    ctx.fillText("ZONE D’EXPLORATION", origin.x - rx + 7, origin.y - rz - 8);
    if (this.canResizeBounds && (this.editingBounds || this.hoverBounds || this.resizingBounds) && bounds) {
      ctx.strokeStyle = "#d6f098";
      ctx.lineWidth = 2;
      ctx.strokeRect(origin.x - rx, origin.y - rz, rx * 2, rz * 2);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        ctx.fillStyle = "#d6f098";
        ctx.fillRect(origin.x + sx * rx - 7, origin.y + sz * rz - 7, 14, 14);
      }
      for (const [x,y] of [[origin.x-rx,origin.y],[origin.x+rx,origin.y],[origin.x,origin.y-rz],[origin.x,origin.y+rz]]) ctx.fillRect(x-6,y-6,12,12);
      ctx.fillStyle = "#e5f6be";
      ctx.font = '12px "IBM Plex Mono",monospace';
      ctx.fillText(`${bounds.x * 2} × ${bounds.z * 2} m`, origin.x - rx + 8, origin.y - rz + 20);
    }
    // Helipad origin.
    ctx.fillStyle = "#b9bf9230";
    ctx.strokeStyle = "#cad5a65c";
    const pad = Math.max(9, 3 * this.scale);
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, pad, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#d3dcaf9c";
    ctx.font = '10px "IBM Plex Mono",monospace';
    ctx.textAlign = "center";
    ctx.fillText("H", origin.x, origin.y + 3);
    ctx.textAlign = "left";
    if (this.layers.links) {
      ctx.lineWidth = 0.8;
      for (let i = 0; i < this.snapshot.drones.length; i++) {
        const a = this.snapshot.drones[i];
        if (!a.position) continue;
        for (let j = i + 1; j < this.snapshot.drones.length; j++) {
          const b = this.snapshot.drones[j];
          if (!b.position) continue;
          const dist = Math.hypot(
            a.position.x - b.position.x,
            a.position.z - b.position.z,
          );
          if (dist > 30) continue;
          const p = this.project(a.position.x, a.position.z),
            q = this.project(b.position.x, b.position.z);
          ctx.strokeStyle = "#adcc7f33";
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.stroke();
        }
      }
    }
    if (this.layers.trails) {
      for (const [id, trail] of this.trails) {
        if (trail.length < 2) continue;
        ctx.strokeStyle = id === this.selected ? "#eea16ca0" : "#adc98442";
        ctx.lineWidth = id === this.selected ? 1.5 : 1;
        ctx.beginPath();
        trail.forEach((p, i) => {
          const q = this.project(p.x, p.z);
          i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y);
        });
        ctx.stroke();
      }
    }
    if (this.planPoints?.length) {
      ctx.strokeStyle = "#f1aa78";
      ctx.fillStyle = "#ffd2ad";
      ctx.font = '12px "IBM Plex Mono",monospace';
      this.planPoints.forEach((point, i) => {
        const p = this.project(point.x, point.z);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillText(String(i + 1), p.x + 10, p.y - 8);
      });
    }
    const points = this.snapshot.drones
      .filter((d) => d.position)
      .map((d) => ({
        ...this.project(d.position.x, d.position.z),
        id: d.id,
        drone: d,
      }));
    this.groups = groupMarkers(points, this.selected, this.zoom >= 6 ? 0 : 28);
    const groupedIds = new Set(
      this.groups
        .filter((g) => g.points.length > 1)
        .flatMap((g) => g.points.map((p) => p.id)),
    );
    const drones = [...this.snapshot.drones].sort(
      (a, b) => Number(a.id === this.selected) - Number(b.id === this.selected),
    );
    for (const d of drones) {
      if (!d.position || groupedIds.has(d.id)) continue;
      const p = this.project(d.position.x, d.position.z),
        sel = d.id === this.selected || this.selectedIds?.has(d.id);
      if (sel) {
        ctx.strokeStyle = "#eea16c5c";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 23, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = "#eea16c28";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 30, 0, Math.PI * 2);
        ctx.stroke();
        if (
          d.waypoint &&
          Number.isFinite(d.waypoint.x) &&
          Number.isFinite(d.waypoint.z)
        ) {
          const wp = this.project(d.waypoint.x, d.waypoint.z);
          ctx.setLineDash([3, 5]);
          ctx.strokeStyle = "#eea16c77";
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(wp.x, wp.y);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.strokeRect(wp.x - 4, wp.y - 4, 8, 8);
        }
      }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.PI - d.heading);
      ctx.fillStyle = sel ? "#f1aa78" : "#c0d79a";
      ctx.strokeStyle = "#172117";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.lineTo(5, 5);
      ctx.lineTo(0, 2);
      ctx.lineTo(-5, 5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    const occupied = [];
    for (const group of this.groups.filter((g) => g.points.length > 1)) {
      ctx.fillStyle = "#31432b";
      ctx.strokeStyle = "#acc887";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(group.x, group.y, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.font = '11px "IBM Plex Mono",monospace';
      ctx.fillStyle = "#e0edce";
      ctx.textAlign = "center";
      ctx.fillText(String(group.points.length), group.x, group.y + 4);
      ctx.textAlign = "left";
      occupied.push({ x: group.x - 18, y: group.y - 18, w: 36, h: 36 });
    }
    // Selected label gets first choice; remaining labels never overlap it.
    if (this.showLabels)
      for (const d of [...drones].sort(
        (a, b) =>
          Number(b.id === this.selected) - Number(a.id === this.selected),
      )) {
        if (!d.position || groupedIds.has(d.id)) continue;
        const p = this.project(d.position.x, d.position.z),
          sel = d.id === this.selected || this.selectedIds?.has(d.id);
        ctx.font = '10px "IBM Plex Mono",monospace';
        const box = placeLabel(
          p,
          ctx.measureText(d.name).width + 12,
          20,
          occupied,
          { width: w, height: h },
        );
        if (!box) continue;
        occupied.push(box);
        ctx.fillStyle = sel ? "#3c3024f5" : "#142014ed";
        ctx.fillRect(box.x, box.y, box.w, box.h);
        ctx.strokeStyle = sel ? "#d69a6690" : "#8aab6766";
        ctx.strokeRect(box.x, box.y, box.w, box.h);
        ctx.fillStyle = sel ? "#ffd2ad" : "#d7e6c3";
        ctx.fillText(d.name, box.x + 6, box.y + 14);
      }
    const framing = document.getElementById("framing-status");
    if (framing)
      framing.textContent =
        this.framing === "fleet"
          ? "CADRAGE AUTO"
          : this.framing === "agent"
            ? "AGENT SUIVI"
            : "VUE LIBRE";
    for (const [id, mode] of [
      ["fit-fleet", "fleet"],
      ["focus-agent", "agent"],
    ])
      document
        .getElementById(id)
        ?.setAttribute("aria-pressed", String(this.framing === mode));
    const scale = document.getElementById("map-scale");
    if (scale) scale.textContent = `${Math.round(75 / this.scale)} m`;
    this.onDraw?.();
  }
  dispose() {
    this.resizeObserver.disconnect();
  }
}
