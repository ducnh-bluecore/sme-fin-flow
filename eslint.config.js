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
          "message": "⚠️ THIN WRAPPER: usePLData is now SSOT-compliant (wraps useFinanceTruthSnapshot). Consider using canonical hooks directly."
        }, {
          "group": ["**/useKPIData*"],
          "message": "⛔ DEPRECATED: Use useFinanceTruthSnapshot instead"
        }, {
          "group": ["**/usePerformanceData*"],
          "message": "⛔ DEPRECATED: Use useFinanceTruthFacts instead"
        }]
      }],
      // ⛔ SSOT GUARDRAILS - Prevent direct queries to external_orders (staging table)
      "no-restricted-syntax": ["warn", {
        "selector": "CallExpression[callee.property.name='from'][arguments.0.value='external_orders']",
        "message": "⚠️ SSOT: Query cdp_orders instead of external_orders. external_orders is staging-only (auto-synced via trigger)."
      }],
    },
  },
);
