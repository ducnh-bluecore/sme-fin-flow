import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { CrossModuleBadge } from "@/components/shared/CrossModuleBadge";

describe("CrossModuleBadge", () => {
  describe("Rendering", () => {
    it("should render LOCKED badge with correct text", () => {
      const { container } = render(<CrossModuleBadge confidenceLevel="LOCKED" />);
      expect(container.textContent).toContain("Đã xác thực");
    });

    it("should render OBSERVED badge with correct text", () => {
      const { container } = render(<CrossModuleBadge confidenceLevel="OBSERVED" />);
      expect(container.textContent).toContain("Dữ liệu thực");
    });

    it("should render ESTIMATED badge with correct text", () => {
      const { container } = render(<CrossModuleBadge confidenceLevel="ESTIMATED" />);
      expect(container.textContent).toContain("Ước tính");
    });

    it("should apply correct styling for LOCKED", () => {
      const { container } = render(<CrossModuleBadge confidenceLevel="LOCKED" />);
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain("bg-emerald");
    });

    it("should apply correct styling for OBSERVED", () => {
      const { container } = render(<CrossModuleBadge confidenceLevel="OBSERVED" />);
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain("bg-blue");
    });

    it("should apply correct styling for ESTIMATED", () => {
      const { container } = render(<CrossModuleBadge confidenceLevel="ESTIMATED" />);
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain("bg-amber");
    });
  });

  describe("Source Module Display", () => {
    it("should display source module when provided", () => {
      const { container } = render(
        <CrossModuleBadge
          confidenceLevel="LOCKED"
          fromModule="FDP"
          showTooltip={false}
        />
      );
      // Should show "Từ FDP ✓" for LOCKED with fromModule
      expect(container.textContent).toContain("Từ FDP");
    });

    it("should display default label when no module provided", () => {
      const { container } = render(
        <CrossModuleBadge
          confidenceLevel="LOCKED"
          dataSource="fdp_locked_costs"
          showTooltip={false}
        />
      );
      expect(container.textContent).toContain("Đã xác thực");
    });
  });

  describe("Size Variants", () => {
    it("should render sm size correctly", () => {
      const { container } = render(
        <CrossModuleBadge confidenceLevel="LOCKED" size="sm" />
      );
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain("text-xs");
    });

    it("should render md size correctly", () => {
      const { container } = render(
        <CrossModuleBadge confidenceLevel="LOCKED" size="md" />
      );
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain("text-sm");
    });
  });

  describe("Custom className", () => {
    it("should apply custom className", () => {
      const { container } = render(
        <CrossModuleBadge confidenceLevel="LOCKED" className="custom-class" />
      );
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain("custom-class");
    });
  });
});
