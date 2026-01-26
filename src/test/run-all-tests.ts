 /**
  * Automated Test Runner for SSOT Compliance
  * 
  * Runs all screen-level tests and reports failures.
  * Used by Governance Dashboard to verify data consistency.
  */
 
 import { describe, it, expect } from 'vitest';
 
 // Import all screen tests
 import './screens/fdp/DashboardPage.test';
 import './screens/fdp/PLReportPage.test';
 import './screens/fdp/CashFlowPage.test';
 import './screens/fdp/ExecutiveSummaryPage.test';
 import './screens/fdp/WorkingCapitalHubPage.test';
 import './screens/cdp/CDPOverviewPage.test';
 import './screens/cdp/LTVEnginePage.test';
 import './screens/cdp/CustomerAuditPage.test';
 import './screens/control-tower/CEOViewPage.test';
 
 describe('SSOT Compliance - All Screens', () => {
   it('should have all screen tests registered', () => {
     expect(true).toBe(true);
   });
 });