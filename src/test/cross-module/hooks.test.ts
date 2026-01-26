import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCrossModuleData } from "@/types/cross-module";

/**
 * Hook Tests (Mocked)
 * 
 * These tests verify the logic of cross-module hooks without actual database calls.
 * For full integration tests, use the SQL test scripts in supabase/tests/
 */

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
    })),
  },
}));

describe("Cross-Module Hooks Logic", () => {
  describe("Fallback Chain Logic", () => {
    it("should return ESTIMATED when no tenant", () => {
      const result = createCrossModuleData(
        { cogsPercent: 55, feePercent: 12 },
        "ESTIMATED",
        "no_tenant",
        false
      );

      expect(result.meta.confidenceLevel).toBe("ESTIMATED");
      expect(result.data.cogsPercent).toBe(55);
      expect(result.data.feePercent).toBe(12);
    });

    it("should return ESTIMATED on RPC error", () => {
      const result = createCrossModuleData(
        { cogsPercent: 55, feePercent: 12 },
        "ESTIMATED",
        "error_fallback",
        false
      );

      expect(result.meta.confidenceLevel).toBe("ESTIMATED");
      expect(result.meta.dataSource).toBe("error_fallback");
    });

    it("should return ESTIMATED when no data", () => {
      const result = createCrossModuleData(
        { cogsPercent: 55, feePercent: 12 },
        "ESTIMATED",
        "no_data",
        false
      );

      expect(result.meta.confidenceLevel).toBe("ESTIMATED");
      expect(result.meta.dataSource).toBe("no_data");
    });

    it("should return OBSERVED with module data", () => {
      const result = createCrossModuleData(
        { cogsPercent: 48.5, feePercent: 10.2 },
        "OBSERVED",
        "order_items",
        false
      );

      expect(result.meta.confidenceLevel).toBe("OBSERVED");
      expect(result.meta.isFromCrossModule).toBe(false);
    });

    it("should return LOCKED with cross-module data", () => {
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

  describe("FDP Locked Costs Data Shape", () => {
    it("should return cogsPercent and feePercent", () => {
      const result = createCrossModuleData(
        { cogsPercent: 48.5, feePercent: 10.2 },
        "LOCKED",
        "fdp_locked_costs",
        true,
        "FDP"
      );

      expect(result.data).toHaveProperty("cogsPercent");
      expect(result.data).toHaveProperty("feePercent");
      expect(typeof result.data.cogsPercent).toBe("number");
      expect(typeof result.data.feePercent).toBe("number");
    });

    it("should include metadata with timestamp", () => {
      const result = createCrossModuleData(
        { cogsPercent: 55, feePercent: 12 },
        "ESTIMATED",
        "benchmark",
        false
      );

      expect(result.meta).toHaveProperty("timestamp");
      expect(result.meta).toHaveProperty("confidenceLevel");
      expect(result.meta).toHaveProperty("dataSource");
    });
  });

  describe("CDP Cohort CAC Data Shape", () => {
    it("should fallback to 150000 VND CAC when no data", () => {
      const fallbackCAC = 150000;
      const result = createCrossModuleData(
        { cacPerCustomer: fallbackCAC },
        "ESTIMATED",
        "no_data",
        false
      );

      expect(result.data.cacPerCustomer).toBe(150000);
      expect(result.meta.confidenceLevel).toBe("ESTIMATED");
    });

    it("should return real CAC when data exists", () => {
      const result = createCrossModuleData(
        { cacPerCustomer: 185000 },
        "LOCKED",
        "mdp_attribution",
        true,
        "MDP"
      );

      expect(result.data.cacPerCustomer).toBe(185000);
      expect(result.meta.confidenceLevel).toBe("LOCKED");
      expect(result.meta.sourceModule).toBe("MDP");
    });
  });

  describe("Segment LTV Data Shape", () => {
    it("should handle segment LTV data correctly", () => {
      const result = createCrossModuleData(
        {
          segmentName: "Platinum",
          avgLTV: 5000000,
          customerCount: 150,
        },
        "OBSERVED",
        "cdp_equity",
        false
      );

      expect(result.data.segmentName).toBe("Platinum");
      expect(result.data.avgLTV).toBe(5000000);
      expect(result.meta.confidenceLevel).toBe("OBSERVED");
    });
  });

  describe("Churn Signal Data Shape", () => {
    it("should handle churn signal data correctly", () => {
      const result = createCrossModuleData(
        {
          customerId: "cust-123",
          churnProbability: 0.75,
          riskLevel: "high",
          daysSinceLastOrder: 45,
        },
        "OBSERVED",
        "cdp_churn_signals",
        true,
        "CDP"
      );

      expect(result.data.churnProbability).toBe(0.75);
      expect(result.data.riskLevel).toBe("high");
      expect(result.meta.isFromCrossModule).toBe(true);
    });
  });

  describe("Cross-Domain Variance Alert Shape", () => {
    it("should handle variance alert data correctly", () => {
      const result = createCrossModuleData(
        {
          alertType: "REVENUE_VARIANCE",
          sourceModule: "CDP",
          targetModule: "FDP",
          variancePercent: 15.5,
          severity: "warning",
        },
        "OBSERVED",
        "variance_detection",
        false
      );

      expect(result.data.alertType).toBe("REVENUE_VARIANCE");
      expect(result.data.variancePercent).toBe(15.5);
      expect(result.data.severity).toBe("warning");
    });
  });
});

describe("Default Values & Edge Cases", () => {
  it("should handle zero values correctly", () => {
    const result = createCrossModuleData(
      { cogsPercent: 0, feePercent: 0 },
      "OBSERVED",
      "actual_data",
      false
    );

    expect(result.data.cogsPercent).toBe(0);
    expect(result.data.feePercent).toBe(0);
  });

  it("should handle null-ish source module", () => {
    const result = createCrossModuleData(
      { value: 100 },
      "OBSERVED",
      "internal",
      false,
      undefined
    );

    expect(result.meta.sourceModule).toBeUndefined();
  });

  it("should handle empty string data source", () => {
    const result = createCrossModuleData(
      { value: 100 },
      "ESTIMATED",
      "",
      false
    );

    expect(result.meta.dataSource).toBe("");
  });
});
