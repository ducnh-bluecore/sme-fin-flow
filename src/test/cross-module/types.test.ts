import { describe, it, expect } from "vitest";
import {
  createCrossModuleData,
  getConfidenceScore,
  getConfidenceLabel,
  ConfidenceLevel,
} from "@/types/cross-module";

describe("Cross-Module Types", () => {
  describe("createCrossModuleData", () => {
    it("should create data with LOCKED confidence level", () => {
      const result = createCrossModuleData(
        { value: 100 },
        "LOCKED",
        "fdp_locked_costs",
        true,
        "FDP"
      );

      expect(result.data).toEqual({ value: 100 });
      expect(result.meta.confidenceLevel).toBe("LOCKED");
      expect(result.meta.dataSource).toBe("fdp_locked_costs");
      expect(result.meta.isFromCrossModule).toBe(true);
      expect(result.meta.sourceModule).toBe("FDP");
    });

    it("should create data with OBSERVED confidence level", () => {
      const result = createCrossModuleData(
        { cogsPercent: 48.5 },
        "OBSERVED",
        "order_items",
        false
      );

      expect(result.meta.confidenceLevel).toBe("OBSERVED");
      expect(result.meta.isFromCrossModule).toBe(false);
      expect(result.meta.sourceModule).toBeUndefined();
    });

    it("should create data with ESTIMATED confidence level", () => {
      const result = createCrossModuleData(
        { cogsPercent: 55, feePercent: 12 },
        "ESTIMATED",
        "benchmark",
        false
      );

      expect(result.meta.confidenceLevel).toBe("ESTIMATED");
      expect(result.data.cogsPercent).toBe(55);
      expect(result.data.feePercent).toBe(12);
    });

    it("should include timestamp in metadata", () => {
      const before = new Date().toISOString();
      const result = createCrossModuleData({ test: 1 }, "LOCKED", "test", true);
      const after = new Date().toISOString();

      expect(result.meta.timestamp).toBeDefined();
      expect(result.meta.timestamp >= before).toBe(true);
      expect(result.meta.timestamp <= after).toBe(true);
    });

    it("should correctly set isFromCrossModule flag", () => {
      const crossModule = createCrossModuleData({}, "LOCKED", "fdp", true, "FDP");
      const internal = createCrossModuleData({}, "OBSERVED", "internal", false);

      expect(crossModule.meta.isFromCrossModule).toBe(true);
      expect(internal.meta.isFromCrossModule).toBe(false);
    });
  });

  describe("getConfidenceScore", () => {
    it("should return 100 for LOCKED", () => {
      expect(getConfidenceScore("LOCKED")).toBe(100);
    });

    it("should return 75 for OBSERVED", () => {
      expect(getConfidenceScore("OBSERVED")).toBe(75);
    });

    it("should return 40 for ESTIMATED", () => {
      expect(getConfidenceScore("ESTIMATED")).toBe(40);
    });

    it("should return 0 for unknown level", () => {
      expect(getConfidenceScore("UNKNOWN" as ConfidenceLevel)).toBe(0);
    });
  });

  describe("getConfidenceLabel", () => {
    it("should return Vietnamese label for LOCKED", () => {
      expect(getConfidenceLabel("LOCKED")).toBe("Đã xác thực");
    });

    it("should return Vietnamese label for OBSERVED", () => {
      expect(getConfidenceLabel("OBSERVED")).toBe("Từ dữ liệu thực");
    });

    it("should return Vietnamese label for ESTIMATED", () => {
      expect(getConfidenceLabel("ESTIMATED")).toBe("Ước tính");
    });

    it("should return fallback label for unknown level", () => {
      expect(getConfidenceLabel("UNKNOWN" as ConfidenceLevel)).toBe("Không xác định");
    });
  });

  describe("Type Guards and Shapes", () => {
    it("should handle FDPCostData shape correctly", () => {
      const data = createCrossModuleData(
        { cogsPercent: 55, feePercent: 12, cac: 150000 },
        "LOCKED",
        "fdp",
        true
      );

      expect(data.data.cogsPercent).toBe(55);
      expect(data.data.feePercent).toBe(12);
      expect(data.data.cac).toBe(150000);
    });

    it("should handle CohortCACData shape correctly", () => {
      const data = createCrossModuleData(
        {
          cohortMonth: "2026-01",
          acquisitionChannel: "facebook",
          totalSpend: 10000000,
          newCustomers: 50,
          cacPerCustomer: 200000,
        },
        "OBSERVED",
        "mdp_attribution",
        true
      );

      expect(data.data.cohortMonth).toBe("2026-01");
      expect(data.data.cacPerCustomer).toBe(200000);
    });
  });
});
