import { describe, it, expect, vi } from "vitest";
import {
  getSnapshot,
  normalizeDrone,
  filterDrones,
  executeCommand,
} from "../command-center/simulation-adapter.js";
const drone = {
  id: "crazyflie_01",
  profileLabel: "Crazyflie 2.1",
  position: { x: 1, y: 0.2, z: 2 },
};
function readyWindow(state = { phase: "IDLE" }) {
  return {
    diamantsSystem: {
      renderer: {},
      scene: {
        getObjectByName: () => ({
          children: [{ position: { x: 25, z: -40 } }],
        }),
      },
      integratedController: {
        drones: [drone],
        autonomousFlightEngine: {
          drones: new Map([[drone.id, state]]),
          visitedCells: new Set(["1,2"]),
          cellSize: 3,
          explorationBounds: 80,
          _getHalfBoundsXZ: () => ({ x: 60, z: 40 }),
        },
        metrics: { coveragePercentage: 12.5 },
      },
    },
    launchMission: vi.fn(() => true),
  };
}
describe("Command center / real simulator boundary", () => {
  it("does not advertise a ready fleet or invent telemetry before initialization", () => {
    const snapshot = getSnapshot(null);
    expect(snapshot.ready).toBe(false);
    expect(snapshot.drones).toEqual([]);
    expect(snapshot.coverage).toBeNull();
  });
  it("preserves missing battery and rejects non-finite telemetry", () => {
    const d = normalizeDrone(
      drone,
      {
        position: { x: NaN, y: 3, z: 4 },
        velocity: { x: Infinity, y: 0, z: 0 },
      },
      0,
    );
    expect(d.battery).toBeNull();
    expect(d.position).toBeNull();
    expect(d.speed).toBeNull();
  });
  it("shows engine positions and RTH intent rather than visual interpolation or EXPLORE phase", () => {
    const d = normalizeDrone(
      drone,
      {
        position: { x: 5, y: 7, z: 8 },
        phase: "EXPLORE",
        _returningToBase: true,
        velocity: { x: 3, y: 0, z: 4 },
      },
      0,
    );
    expect(d.phase).toBe("RETURN_HOME");
    expect(d.position.y).toBe(7);
    expect(d.speed).toBe(5);
  });
  it("uses engine bounds and actual scene forest rather than unused tree templates", () => {
    const snapshot = getSnapshot(readyWindow());
    expect(snapshot.ready).toBe(true);
    expect(snapshot.halfBounds).toEqual({ x: 60, z: 40 });
    expect(snapshot.trees).toEqual([{ x: 25, z: -40 }]);
    expect(snapshot.coverage).toBe(12.5);
  });
  it("searches by ID/model while respecting flight-state filter", () => {
    const drones = [
      normalizeDrone(drone, { phase: "IDLE" }, 0),
      normalizeDrone(
        { ...drone, id: "x500_02", profileLabel: "X500" },
        { phase: "EXPLORE", position: { x: 5, y: 10, z: 5 } },
        1,
      ),
    ];
    expect(filterDrones(drones, "X500", "airborne")).toHaveLength(1);
    expect(filterDrones(drones, "x500", "ground")).toHaveLength(0);
    expect(filterDrones(drones, "not found", "all")).toEqual([]);
  });
  it("blocks early commands and surfaces a rejected simulator command", () => {
    expect(() => executeCommand(null, "launch")).toThrow("pas encore prêt");
    const win = readyWindow();
    executeCommand(win, "launch");
    expect(win.launchMission).toHaveBeenCalledOnce();
    win.launchMission.mockReturnValue(false);
    expect(() => executeCommand(win, "launch")).toThrow("refusé");
    expect(() => executeCommand(win, "nonexistent")).toThrow("pas disponible");
  });
});
