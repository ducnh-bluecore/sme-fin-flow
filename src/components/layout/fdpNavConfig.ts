import { useMemo } from 'react';
import {
  LayoutDashboard,
  BarChart3,
  Receipt,
  Database,
  Target,
  Users,
  Crown,
  BookOpen,
  PenSquare,
  FileText,
  Settings,
  HelpCircle,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsSuperAdmin } from '@/hooks/useIsSuperAdmin';
import type { AppShellNavSection, AppShellNavItem } from './AppShell';

/**
 * Generates the FDP navigation config for AppShell.
 * Replaces the old Sidebar component's hardcoded nav.
 */
export function useFDPNavConfig() {
  const { t } = useLanguage();
  const { isSuperAdmin } = useIsSuperAdmin();

  return useMemo(() => {
    const sections: AppShellNavSection[] = [
      {
        id: 'overview',
        label: 'TỔNG QUAN',
        items: [
          {
            id: 'cfo-overview',
            label: t('nav.cfoOverview'),
            icon: LayoutDashboard,
            children: [
              { id: 'dashboard', label: t('nav.dashboard'), href: '/dashboard' },
              { id: 'cash-position', label: t('nav.cashPosition'), href: '/cash-position' },
              { id: 'cash-forecast', label: t('nav.cashForecast'), href: '/cash-forecast' },
              { id: 'cash-flow-direct', label: t('nav.cashFlowDirect'), href: '/cash-flow-direct' },
              { id: 'working-capital', label: t('nav.workingCapitalHub'), href: '/working-capital-hub' },
            ],
          },
        ],
      },
      {
        id: 'analysis',
        label: 'PHÂN TÍCH',
        items: [
          {
            id: 'financial-reports',
            label: t('nav.financialReports'),
            icon: BarChart3,
            children: [
              { id: 'pl-report', label: t('nav.plReport'), href: '/pl-report' },
              { id: 'analysis', label: t('nav.analysis'), href: '/financial-reports' },
              { id: 'performance', label: t('nav.performanceAnalysis'), href: '/performance-analysis' },
              { id: 'channel', label: t('nav.channelAnalytics'), href: '/channel-analytics' },
              { id: 'unit-economics', label: t('nav.unitEconomics'), href: '/unit-economics' },
              { id: 'revenue', label: t('nav.revenue'), href: '/revenue' },
            ],
          },
        ],
      },
      {
        id: 'reconciliation',
        label: 'ĐỐI SOÁT',
        items: [
          {
            id: 'ar-ap',
            label: t('nav.arAp'),
            icon: Receipt,
            children: [
              { id: 'ar-ops', label: t('nav.arOperations'), href: '/ar-operations' },
              { id: 'ap-overview', label: t('nav.apOverview'), href: '/bills' },
              { id: 'reconciliation', label: t('nav.reconciliation'), href: '/reconciliation' },
              { id: 'exceptions', label: t('nav.exceptions'), href: '/exceptions' },
              { id: 'credit-debit', label: t('nav.creditDebitNotes'), href: '/credit-debit-notes' },
            ],
          },
        ],
      },
      {
        id: 'data-input',
        label: 'NHẬP LIỆU',
        items: [
          {
            id: 'data-hub',
            label: t('nav.dataHub'),
            icon: Database,
            children: [
              { id: 'expenses', label: t('nav.expenses'), href: '/expenses' },
              { id: 'supplier-payments', label: t('nav.supplierPayments'), href: '/supplier-payments' },
              { id: 'bank-connections', label: t('nav.bankConnections'), href: '/bank-connections' },
              { id: 'coa', label: t('nav.chartOfAccounts'), href: '/chart-of-accounts' },
              { id: 'data-center', label: t('nav.dataCenter'), href: '/data-hub' },
              { id: 'data-warehouse', label: t('nav.dataWarehouse'), href: '/data-warehouse' },
            ],
          },
        ],
      },
      {
        id: 'planning',
        label: 'KẾ HOẠCH',
        items: [
          {
            id: 'plan-sim',
            label: t('nav.planSimulation'),
            icon: Target,
            children: [
              { id: 'ai-agent', label: t('nav.aiAgent'), href: '/ai-agent' },
              { id: 'scenario', label: t('nav.scenario'), href: '/scenario' },
              { id: 'rolling', label: t('nav.rollingForecast'), href: '/rolling-forecast' },
              { id: 'exec-summary', label: t('nav.executiveSummary'), href: '/executive-summary' },
              { id: 'risk', label: t('nav.riskDashboard'), href: '/risk-dashboard' },
              { id: 'decision-support', label: t('nav.decisionSupport'), href: '/decision-support' },
              { id: 'decision-center', label: t('nav.decisionCenter'), href: '/decision-center' },
            ],
          },
        ],
      },
    ];

    // Admin section
    if (true) { // Always include, visibility controlled by role
      sections.push({
        id: 'admin',
        label: 'QUẢN TRỊ',
        items: [
          {
            id: 'admin-section',
            label: t('nav.admin'),
            icon: Users,
            children: [
              { id: 'company', label: t('nav.companyManagement'), href: '/tenant' },
              { id: 'members', label: t('nav.members'), href: '/tenant/members' },
              { id: 'rbac', label: t('nav.rbac'), href: '/rbac' },
              { id: 'audit', label: t('nav.auditLog'), href: '/audit-log' },
            ],
          },
        ],
      });
    }

    // Super Admin
    if (isSuperAdmin) {
      sections.push({
        id: 'super-admin',
        label: 'SUPER ADMIN',
        items: [
          {
            id: 'super-admin-section',
            label: t('nav.superAdmin'),
            icon: Crown,
            children: [
              { id: 'sa-dashboard', label: t('nav.dashboard'), href: '/admin' },
              { id: 'sa-tenants', label: t('nav.tenantManagement'), href: '/admin/tenants' },
              { id: 'sa-users', label: t('nav.userManagement'), href: '/admin/users' },
              { id: 'sa-settings', label: t('nav.platformSettings'), href: '/admin/settings' },
            ],
          },
        ],
      });
    }

    const bottomItems: AppShellNavItem[] = [
      { id: 'data-guide', label: t('nav.integrationGuide'), icon: BookOpen, href: '/data-guide' },
      { id: 'formulas', label: t('nav.formulas'), icon: PenSquare, href: '/formulas' },
      { id: 'documentation', label: t('nav.documentation'), icon: FileText, href: '/documentation' },
      { id: 'user-guide', label: t('nav.userGuide'), icon: BookOpen, href: '/user-guide' },
      { id: 'settings', label: t('common.settings'), icon: Settings, href: '/settings' },
      { id: 'help', label: t('common.help'), icon: HelpCircle, href: '/help' },
    ];

    return { sections, bottomItems };
  }, [t, isSuperAdmin]);
}
