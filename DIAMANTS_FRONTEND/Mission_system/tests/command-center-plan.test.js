import { describe, it, expect } from "vitest";
import {
  validatePlan,
  surveyPoints,
  createPlanProvider,
  describeIntent,
} from "../command-center/mission-plan.js";
describe("mission preparation", () => {
  it("rejects invalid and outside coordinates", () => {
    for (const p of [
      { x: NaN, z: 0 },
      { x: 61, z: 0 },
      { x: 0, z: -41 },
    ])
      expect(() => validatePlan({ points: [p] }, { x: 60, z: 40 })).toThrow();
    expect(() => validatePlan({ points: [] }, { x: 60, z: 40 })).toThrow();
  });
  it("builds nine survey targets in either corner order", () => {
    expect(surveyPoints({ x: 20, z: 20 }, { x: 0, z: 0 })).toEqual(
      surveyPoints({ x: 0, z: 0 }, { x: 20, z: 20 }),
    );
    expect(surveyPoints({ x: 0, z: 0 }, { x: 20, z: 20 })).toHaveLength(9);
    expect(() => surveyPoints({ x: 0, z: 0 }, { x: 1, z: 20 })).toThrow();
  });
  it("distributes targets and only advances when reached", () => {
    const points = [
      { x: 20, z: 20 },
      { x: 30, z: 30 },
    ];
    const provider = createPlanProvider(points, ["a", "b"]);
    points[0].x = 999;
    expect(provider("a", { position: { x: 0, z: 0 } }).x).toBe(20);
    expect(provider("b", { position: { x: 0, z: 0 } }).x).toBe(30);
    expect(provider("a", { position: { x: 20, z: 20 } }).x).toBe(30);
  });
  it("does not display stale navigation during landing", () => {
    expect(
      describeIntent({
        phase: "LAND",
        waypoint: { x: 10, z: 20 },
        action: "Exploration",
      }),
    ).toBe("Descente vers le sol.");
    expect(
      describeIntent({ phase: "EXPLORE", waypoint: { x: NaN, z: 0 } }),
    ).toContain("attente");
  });
});
