import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      // ⛔ FINANCE HOOK GUARDRAILS - Prevent deprecated hooks in executive routes
      "no-restricted-imports": ["warn", {
        "patterns": [{
          "group": ["**/useCentralFinancialMetrics*"],
          "message": "⛔ DEPRECATED: Use useFinanceTruthSnapshot instead"
        }, {
          "group": ["**/useDashboardKPIs*"],
          "message": "⛔ DEPRECATED: Use useFinanceTruthSnapshot instead"
        }, {
          "group": ["**/useAnalyticsData*"],
          "message": "⛔ DEPRECATED: Use useFinanceTruthSnapshot + useFinanceMonthlySummary instead"
        }, {
          "group": ["**/usePLData*"],
          "message": "⛔ DEPRECATED: Use useFinanceTruthSnapshot + useFinanceMonthlySummary instead"
        }, {
          "group": ["**/useKPIData*"],
          "message": "⛔ DEPRECATED: Use useFinanceTruthSnapshot instead"
        }, {
          "group": ["**/usePerformanceData*"],
          "message": "⛔ DEPRECATED: Use useFinanceTruthFacts instead"
        }]
      }],
    },
  },
);
