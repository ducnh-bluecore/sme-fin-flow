import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { CrossModuleDataCard, CrossModuleMetric } from "@/components/shared/CrossModuleDataCard";

describe("CrossModuleDataCard", () => {
  describe("Display", () => {
    it("should render title and value", () => {
      const { container } = render(
        <CrossModuleDataCard
          title="COGS %"
          value="48.5"
          confidenceLevel="LOCKED"
        />
      );

      expect(container.textContent).toContain("COGS %");
      expect(container.textContent).toContain("48.5");
    });

    it("should render unit when provided", () => {
      const { container } = render(
        <CrossModuleDataCard
          title="CAC"
          value="150,000"
          unit="VND"
          confidenceLevel="OBSERVED"
        />
      );

      expect(container.textContent).toContain("VND");
    });

    it("should render numeric value correctly", () => {
      const { container } = render(
        <CrossModuleDataCard
          title="Revenue"
          value={1000000}
          confidenceLevel="LOCKED"
        />
      );

      expect(container.textContent).toContain("1000000");
    });
  });

  describe("CrossModuleBadge Integration", () => {
    it("should show LOCKED badge", () => {
      const { container } = render(
        <CrossModuleDataCard
          title="Test"
          value="100"
          confidenceLevel="LOCKED"
        />
      );

      expect(container.textContent).toContain("Đã xác thực");
    });

    it("should show ESTIMATED badge", () => {
      const { container } = render(
        <CrossModuleDataCard
          title="Test"
          value="100"
          confidenceLevel="ESTIMATED"
        />
      );

      expect(container.textContent).toContain("Ước tính");
    });
  });

  describe("Upgrade Prompt", () => {
    it("should show upgrade prompt when ESTIMATED", () => {
      const { container } = render(
        <CrossModuleDataCard
          title="COGS"
          value="55"
          unit="%"
          confidenceLevel="ESTIMATED"
          upgradePrompt="Nhập chi phí thực tế trong FDP để có số liệu chính xác hơn"
        />
      );

      expect(container.textContent).toContain(
        "Nhập chi phí thực tế trong FDP để có số liệu chính xác hơn"
      );
    });

    it("should hide upgrade prompt when LOCKED", () => {
      const { container } = render(
        <CrossModuleDataCard
          title="COGS"
          value="48.5"
          unit="%"
          confidenceLevel="LOCKED"
          upgradePrompt="This should not appear"
        />
      );

      expect(container.textContent).not.toContain("This should not appear");
    });

    it("should hide upgrade prompt when OBSERVED", () => {
      const { container } = render(
        <CrossModuleDataCard
          title="COGS"
          value="50"
          unit="%"
          confidenceLevel="OBSERVED"
          upgradePrompt="This should not appear"
        />
      );

      expect(container.textContent).not.toContain("This should not appear");
    });

    it("should render upgrade button when onUpgrade provided", () => {
      const onUpgrade = vi.fn();
      const { container } = render(
        <CrossModuleDataCard
          title="Test"
          value="100"
          confidenceLevel="ESTIMATED"
          upgradePrompt="Click to upgrade"
          onUpgrade={onUpgrade}
        />
      );

      expect(container.textContent).toContain("Nâng cấp ngay");
    });
  });

  describe("Children", () => {
    it("should render children content", () => {
      const { container } = render(
        <CrossModuleDataCard
          title="Test"
          value="100"
          confidenceLevel="LOCKED"
        >
          <div data-testid="child-content">Child content here</div>
        </CrossModuleDataCard>
      );

      const childElement = container.querySelector('[data-testid="child-content"]');
      expect(childElement).toBeTruthy();
      expect(container.textContent).toContain("Child content here");
    });
  });

  describe("Custom className", () => {
    it("should apply custom className", () => {
      const { container } = render(
        <CrossModuleDataCard
          title="Test"
          value="100"
          confidenceLevel="LOCKED"
          className="custom-card-class"
        />
      );

      expect(container.firstChild).toHaveClass("custom-card-class");
    });
  });
});

describe("CrossModuleMetric", () => {
  describe("Display", () => {
    it("should render label and value", () => {
      const { container } = render(
        <CrossModuleMetric
          label="COGS %"
          value="48.5"
          confidenceLevel="LOCKED"
        />
      );

      expect(container.textContent).toContain("COGS %");
      expect(container.textContent).toContain("48.5");
    });

    it("should render unit when provided", () => {
      const { container } = render(
        <CrossModuleMetric
          label="Revenue"
          value="1,000,000"
          unit="VND"
          confidenceLevel="OBSERVED"
        />
      );

      expect(container.textContent).toContain("VND");
    });
  });

  describe("Badge Display", () => {
    it("should show confidence badge", () => {
      const { container } = render(
        <CrossModuleMetric
          label="Test"
          value="100"
          confidenceLevel="LOCKED"
        />
      );

      expect(container.textContent).toContain("Đã xác thực");
    });

    it("should show module source in badge when provided", () => {
      const { container } = render(
        <CrossModuleMetric
          label="Test"
          value="100"
          confidenceLevel="LOCKED"
          fromModule="FDP"
        />
      );

      // Should show "Từ FDP ✓" for LOCKED with fromModule
      expect(container.textContent).toContain("Từ FDP");
    });
  });

  describe("Custom className", () => {
    it("should apply custom className", () => {
      const { container } = render(
        <CrossModuleMetric
          label="Test"
          value="100"
          confidenceLevel="LOCKED"
          className="custom-metric-class"
        />
      );

      expect(container.firstChild).toHaveClass("custom-metric-class");
    });
  });
});
