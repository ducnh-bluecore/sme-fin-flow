/**
 * ESLint Guardrails for Finance Hook SSOT
 * 
 * This file defines rules to prevent importing deprecated hooks
 * in executive-grade routes.
 * 
 * ENFORCEMENT: These hooks are DEPRECATED and must NOT compute metrics.
 * All business calculations happen in DB precomputed tables.
 */

module.exports = {
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        {
          group: ['**/useCentralFinancialMetrics*'],
          message: '⛔ DEPRECATED: Thin wrapper only. Use useFinanceTruthSnapshot instead'
        },
        {
          group: ['**/useDashboardKPIs*'],
          message: '⛔ DEPRECATED: Use useFinanceTruthSnapshot instead'
        },
        {
          group: ['**/usePLData*'],
          message: '⛔ DEPRECATED: Use useFinanceTruthSnapshot + useFinanceMonthlySummary instead'
        },
        {
          group: ['**/useAnalyticsData*'],
          message: '⛔ DEPRECATED: Use useFinanceTruthSnapshot + useFinanceMonthlySummary instead'
        },
        {
          group: ['**/useKPIData*'],
          message: '⛔ DEPRECATED: Use useFinanceTruthSnapshot instead'
        },
        {
          group: ['**/usePerformanceData*'],
          message: '⛔ DEPRECATED: Use useFinanceTruthFacts instead'
        },
        {
          group: ['**/useControlTowerAnalytics*'],
          message: '⛔ DEPRECATED: Use useFinanceTruthSnapshot instead'
        }
      ]
    }]
  },
  overrides: [
    {
      // Stricter rules for executive routes - FORBIDDEN
      files: [
        'src/pages/CFODashboard.tsx',
        'src/pages/control-tower/**/*.tsx',
        'src/pages/mdp/MDPV2CEOPage.tsx',
        'src/pages/mdp/MDPCEOViewPage.tsx',
      ],
      rules: {
        'no-restricted-imports': ['error', {
          patterns: [
            {
              group: [
                '**/useCentralFinancialMetrics*', 
                '**/useDashboardKPIs*', 
                '**/usePLData*', 
                '**/useAnalyticsData*', 
                '**/useKPIData*', 
                '**/usePerformanceData*', 
                '**/useControlTowerAnalytics*'
              ],
              message: '🚫 FORBIDDEN in executive routes. Use canonical hooks only: useFinanceTruthSnapshot, useFinanceTruthFacts, useDecisionCards, useMDPData'
            }
          ]
        }]
      }
    }
  ]
};
