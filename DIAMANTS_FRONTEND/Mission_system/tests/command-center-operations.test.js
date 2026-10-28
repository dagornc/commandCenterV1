import { describe, it, expect } from "vitest";
import { getAttentionItems } from "../command-center/attention.js";
import { groupMarkers, placeLabel } from "../command-center/map-layout.js";
const drone = {
  id: "cf_01",
  name: "CF 01",
  phase: "EXPLORE",
  position: { x: 1, y: 3, z: 1 },
  battery: null,
  sensorCritical: 0,
  sensorWarnings: 0,
};
const snapshot = (drones = [drone]) => ({
  ready: true,
  drones,
  halfBounds: { x: 60, z: 40 },
});
describe("Operational attention", () => {
  it("does not invent missing battery alerts or treat initial loading as failure", () => {
    expect(getAttentionItems(snapshot())).toEqual([]);
    expect(
      getAttentionItems({ ready: false }, { disconnected: false }),
    ).toEqual([]);
  });
  it("prioritizes critical signals and retains agent identity for navigation", () => {
    const items = getAttentionItems(
      snapshot([
        {
          ...drone,
          battery: 8,
          sensorWarnings: 2,
          position: { x: 61, y: 3, z: 1 },
        },
      ]),
    );
    expect(items).toHaveLength(3);
    expect(items[0].severity).toBe("critical");
    expect(items.every((a) => a.agentId === "cf_01")).toBe(true);
    expect(items.map((a) => a.id)).toContain("cf_01:bounds");
  });
  it("resolves sensor alerts as conditions clear, without alarming on parked agents", () => {
    expect(
      getAttentionItems(snapshot([{ ...drone, sensorCritical: 1 }])),
    ).toHaveLength(1);
    expect(
      getAttentionItems(
        snapshot([{ ...drone, sensorCritical: 1, phase: "IDLE" }]),
      ),
    ).toEqual([]);
    expect(getAttentionItems(snapshot())).toEqual([]);
  });
  it("reports connection loss rather than stale agent alerts", () => {
    expect(
      getAttentionItems(
        { ...snapshot([{ ...drone, battery: 5 }]), ready: false },
        { disconnected: true },
      ).map((a) => a.id),
    ).toEqual(["engine"]);
  });
});
describe("Map layout", () => {
  it("groups nearby markers but keeps the selected agent individually accessible", () => {
    const groups = groupMarkers(
      [
        { id: "a", x: 0, y: 0 },
        { id: "b", x: 3, y: 4 },
        { id: "c", x: 8, y: 7 },
        { id: "d", x: 100, y: 100 },
      ],
      "a",
    );
    expect(groups.find((g) => g.selected).points.map((p) => p.id)).toEqual([
      "a",
    ]);
    expect(
      groups.find((g) => g.points.length === 2).points.map((p) => p.id),
    ).toEqual(["b", "c"]);
    expect(groups.flatMap((g) => g.points)).toHaveLength(4);
  });
  it("lets zoomed-in agents remain individually selectable", () => {
    expect(
      groupMarkers(
        [
          { id: "a", x: 0, y: 0 },
          { id: "b", x: 0, y: 0 },
        ],
        null,
        0,
      ),
    ).toHaveLength(2);
  });
  it("places labels in alternate free locations and omits them when all are occupied", () => {
    const point = { x: 100, y: 100 },
      viewport = { width: 300, height: 300 };
    const first = placeLabel(point, 60, 20, [], viewport);
    const next = placeLabel(point, 60, 20, [first], viewport);
    expect(next).not.toEqual(first);
    expect(
      placeLabel(point, 60, 20, [{ x: 0, y: 0, w: 300, h: 300 }], viewport),
    ).toBeNull();
  });
});
