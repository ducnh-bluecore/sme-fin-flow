import { describe, it, expect } from "vitest";
import {
  createCrossModuleData,
  getConfidenceScore,
  ConfidenceLevel,
} from "@/types/cross-module";

/**
 * Fallback Chain Logic Tests
 * 
 * Tests the 3-Level Fallback Chain implementation:
 * Level 3 (LOCKED): Cross-module verified data
 * Level 2 (OBSERVED): Module-internal actual data
 * Level 1 (ESTIMATED): Industry benchmarks or default estimates
 */

describe("Fallback Chain - 3-Level Priority System", () => {
  describe("Level Priority Ordering", () => {
    it("LOCKED should have highest priority (100)", () => {
      expect(getConfidenceScore("LOCKED")).toBe(100);
    });

    it("OBSERVED should have medium priority (75)", () => {
      expect(getConfidenceScore("OBSERVED")).toBe(75);
    });

    it("ESTIMATED should have lowest priority (40)", () => {
      expect(getConfidenceScore("ESTIMATED")).toBe(40);
    });

    it("should correctly order confidence levels", () => {
      const locked = getConfidenceScore("LOCKED");
      const observed = getConfidenceScore("OBSERVED");
      const estimated = getConfidenceScore("ESTIMATED");

      expect(locked).toBeGreaterThan(observed);
      expect(observed).toBeGreaterThan(estimated);
    });
  });

  describe("Fallback Scenarios", () => {
    it("Scenario: No cross-module data, no internal data -> ESTIMATED", () => {
      // Simulate: FDP not connected, no order data
      const result = createCrossModuleData(
        { cogsPercent: 55, feePercent: 12 },
        "ESTIMATED",
        "industry_benchmark",
        false
      );

      expect(result.meta.confidenceLevel).toBe("ESTIMATED");
      expect(result.meta.isFromCrossModule).toBe(false);
      expect(result.data.cogsPercent).toBe(55); // Default benchmark
    });

    it("Scenario: Has internal order data, no cross-module -> OBSERVED", () => {
      // Simulate: Calculated from order_items
      const result = createCrossModuleData(
        { cogsPercent: 48.5, feePercent: 10.2 },
        "OBSERVED",
        "order_items_aggregation",
        false
      );

      expect(result.meta.confidenceLevel).toBe("OBSERVED");
      expect(result.meta.isFromCrossModule).toBe(false);
      expect(result.data.cogsPercent).toBe(48.5); // Actual calculated value
    });

    it("Scenario: Has cross-module locked data -> LOCKED", () => {
      // Simulate: FDP has locked monthly costs
      const result = createCrossModuleData(
        { cogsPercent: 45.0, feePercent: 9.5 },
        "LOCKED",
        "fdp_locked_costs",
        true,
        "FDP"
      );

      expect(result.meta.confidenceLevel).toBe("LOCKED");
      expect(result.meta.isFromCrossModule).toBe(true);
      expect(result.meta.sourceModule).toBe("FDP");
    });
  });

  describe("Fallback Selection Logic", () => {
    // Simulates the database function's fallback logic
    function selectBestAvailable(
      locked: { value: number } | null,
      observed: { value: number } | null,
      estimated: { value: number }
    ) {
      if (locked) {
        return createCrossModuleData(locked, "LOCKED", "fdp_locked", true, "FDP");
      }
      if (observed) {
        return createCrossModuleData(observed, "OBSERVED", "order_items", false);
      }
      return createCrossModuleData(estimated, "ESTIMATED", "benchmark", false);
    }

    it("should select LOCKED when all levels available", () => {
      const result = selectBestAvailable(
        { value: 45 },
        { value: 48 },
        { value: 55 }
      );
      expect(result.meta.confidenceLevel).toBe("LOCKED");
      expect(result.data.value).toBe(45);
    });

    it("should select OBSERVED when LOCKED unavailable", () => {
      const result = selectBestAvailable(
        null,
        { value: 48 },
        { value: 55 }
      );
      expect(result.meta.confidenceLevel).toBe("OBSERVED");
      expect(result.data.value).toBe(48);
    });

    it("should select ESTIMATED when LOCKED and OBSERVED unavailable", () => {
      const result = selectBestAvailable(
        null,
        null,
        { value: 55 }
      );
      expect(result.meta.confidenceLevel).toBe("ESTIMATED");
      expect(result.data.value).toBe(55);
    });
  });

  describe("Cross-Module Source Tracking", () => {
    it("should track FDP as source for cost data", () => {
      const result = createCrossModuleData(
        { cogsPercent: 45 },
        "LOCKED",
        "fdp_locked_costs",
        true,
        "FDP"
      );
      expect(result.meta.sourceModule).toBe("FDP");
    });

    it("should track MDP as source for attribution data", () => {
      const result = createCrossModuleData(
        { cacPerCustomer: 180000 },
        "LOCKED",
        "mdp_attribution",
        true,
        "MDP"
      );
      expect(result.meta.sourceModule).toBe("MDP");
    });

    it("should track CDP as source for customer data", () => {
      const result = createCrossModuleData(
        { segmentLTV: 5000000 },
        "LOCKED",
        "cdp_segment_ltv",
        true,
        "CDP"
      );
      expect(result.meta.sourceModule).toBe("CDP");
    });

    it("should not have source module for internal data", () => {
      const result = createCrossModuleData(
        { value: 100 },
        "OBSERVED",
        "internal_calculation",
        false
      );
      expect(result.meta.sourceModule).toBeUndefined();
    });
  });
});

describe("Data Quality Indicators", () => {
  describe("Confidence Score Comparisons", () => {
    it("should correctly compare confidence levels", () => {
      const levels: ConfidenceLevel[] = ["LOCKED", "OBSERVED", "ESTIMATED"];
      const scores = levels.map(getConfidenceScore);
      
      expect(scores).toEqual([100, 75, 40]);
    });

    it("should allow sorting by confidence", () => {
      const data = [
        { level: "ESTIMATED" as ConfidenceLevel, value: 55 },
        { level: "LOCKED" as ConfidenceLevel, value: 45 },
        { level: "OBSERVED" as ConfidenceLevel, value: 48 },
      ];

      const sorted = data.sort(
        (a, b) => getConfidenceScore(b.level) - getConfidenceScore(a.level)
      );

      expect(sorted[0].level).toBe("LOCKED");
      expect(sorted[1].level).toBe("OBSERVED");
      expect(sorted[2].level).toBe("ESTIMATED");
    });
  });

  describe("Threshold-based Confidence Classification", () => {
    function classifyConfidence(score: number): string {
      if (score >= 90) return "high";
      if (score >= 60) return "medium";
      return "low";
    }

    it("LOCKED should classify as high confidence", () => {
      expect(classifyConfidence(getConfidenceScore("LOCKED"))).toBe("high");
    });

    it("OBSERVED should classify as medium confidence", () => {
      expect(classifyConfidence(getConfidenceScore("OBSERVED"))).toBe("medium");
    });

    it("ESTIMATED should classify as low confidence", () => {
      expect(classifyConfidence(getConfidenceScore("ESTIMATED"))).toBe("low");
    });
  });
});

describe("Edge Cases", () => {
  it("should handle minimum valid values", () => {
    const result = createCrossModuleData(
      { cogsPercent: 0, feePercent: 0 },
      "OBSERVED",
      "zero_costs",
      false
    );

    expect(result.data.cogsPercent).toBe(0);
    expect(result.data.feePercent).toBe(0);
  });

  it("should handle maximum valid values", () => {
    const result = createCrossModuleData(
      { cogsPercent: 100, feePercent: 100 },
      "OBSERVED",
      "extreme_costs",
      false
    );

    expect(result.data.cogsPercent).toBe(100);
    expect(result.data.feePercent).toBe(100);
  });

  it("should handle decimal precision", () => {
    const result = createCrossModuleData(
      { cogsPercent: 48.5678, feePercent: 10.1234 },
      "OBSERVED",
      "precise_costs",
      false
    );

    expect(result.data.cogsPercent).toBeCloseTo(48.5678);
    expect(result.data.feePercent).toBeCloseTo(10.1234);
  });
});
