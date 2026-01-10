import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'vi' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Vietnamese translations
const vi: Record<string, string> = {
  // Common
  'common.search': 'Tìm kiếm hóa đơn, khách hàng...',
  'common.loading': 'Đang tải...',
  'common.noData': 'Không có dữ liệu',
  'common.save': 'Lưu',
  'common.cancel': 'Hủy',
  'common.delete': 'Xóa',
  'common.edit': 'Sửa',
  'common.add': 'Thêm',
  'common.view': 'Xem',
  'common.close': 'Đóng',
  'common.confirm': 'Xác nhận',
  'common.back': 'Quay lại',
  'common.next': 'Tiếp theo',
  'common.submit': 'Gửi',
  'common.export': 'Xuất',
  'common.import': 'Nhập',
  'common.filter': 'Lọc',
  'common.reset': 'Đặt lại',
  'common.all': 'Tất cả',
  'common.status': 'Trạng thái',
  'common.actions': 'Hành động',
  'common.date': 'Ngày',
  'common.amount': 'Số tiền',
  'common.total': 'Tổng',
  'common.details': 'Chi tiết',
  'common.settings': 'Cài đặt',
  'common.help': 'Trợ giúp',
  'common.logout': 'Đăng xuất',

  // Header
  'header.alerts': 'Cảnh báo',
  'header.unreadAlerts': 'cảnh báo chưa xác nhận',
  'header.noAlerts': 'Không có cảnh báo',
  'header.viewAllAlerts': 'Xem tất cả cảnh báo',
  'header.high': 'Cao',
  'header.medium': 'Trung bình',
  'header.low': 'Thấp',

  // Sidebar - Main navigation
  'nav.cfoOverview': 'Tổng quan CFO',
  'nav.dashboard': 'Dashboard',
  'nav.cashForecast': 'Cash Flow Forecast',
  'nav.cashFlowDirect': 'Dòng tiền trực tiếp',
  'nav.workingCapital': 'Tối ưu vốn lưu động',
  'nav.cashConversion': 'Cash Conversion Cycle',
  'nav.retailOps': 'Vận hành bán lẻ',
  'nav.inventoryAging': 'Tuổi tồn kho',
  'nav.promotionROI': 'ROI Khuyến mãi',
  'nav.supplierPayments': 'Thanh toán NCC',

  'nav.strategyDecision': 'Chiến lược & Quyết định',
  'nav.executiveSummary': 'Executive Summary',
  'nav.capitalAllocation': 'Phân bổ vốn',
  'nav.riskDashboard': 'Risk Dashboard',
  'nav.decisionSupport': 'Hỗ trợ quyết định',

  'nav.financialReports': 'Báo cáo tài chính',
  'nav.plReport': 'Báo cáo P&L',
  'nav.analysis': 'Phân tích tổng hợp',
  'nav.budgetVsActual': 'Budget vs Actual',
  'nav.varianceAnalysis': 'Phân tích chênh lệch',
  'nav.boardReports': 'Báo cáo HĐQT',

  'nav.planSimulation': 'Kế hoạch & Mô phỏng',
  'nav.scenario': 'Kịch bản & What-If',
  'nav.rollingForecast': 'Rolling Forecast',
  'nav.strategicInitiatives': 'Sáng kiến chiến lược',

  'nav.arAp': 'AR/AP',
  'nav.invoiceManagement': 'Quản lý hóa đơn',
  'nav.arOperations': 'AR Operations',
  'nav.apOverview': 'AP Overview',
  'nav.creditDebitNotes': 'CN/DN Tracking',
  'nav.reconciliation': 'Đối soát',

  'nav.salesChannels': 'Kênh bán hàng',
  'nav.channelAnalytics': 'Phân tích kênh',
  'nav.unitEconomics': 'Unit Economics',

  'nav.dataHub': 'Data Hub',
  'nav.dataCenter': 'Trung tâm dữ liệu',
  'nav.etlRules': 'Quy tắc ETL',

  'nav.taxCompliance': 'Thuế & Tuân thủ',
  'nav.taxTracking': 'Tax Compliance',
  'nav.covenantTracking': 'Covenant Tracking',

  'nav.alerts': 'Cảnh báo',

  'nav.admin': 'Quản trị',
  'nav.companyManagement': 'Quản lý công ty',
  'nav.members': 'Thành viên',
  'nav.rbac': 'Phân quyền RBAC',
  'nav.auditLog': 'Nhật ký hoạt động',

  'nav.api': 'API',

  'nav.integrationGuide': 'Hướng dẫn tích hợp',
  'nav.formulas': 'Công thức tính',
  'nav.formulasOverview': 'Tổng hợp công thức',
  'nav.formulaSettings': 'Cài đặt tham số',
  'nav.superAdmin': 'Super Admin',
  'nav.tenantManagement': 'Quản lý Tenants',
  'nav.userManagement': 'Quản lý Users',
  'nav.platformSettings': 'Cài đặt Platform',

  // Auth
  'auth.signIn': 'Đăng nhập',
  'auth.signUp': 'Đăng ký',
  'auth.email': 'Email',
  'auth.password': 'Mật khẩu',
  'auth.confirmPassword': 'Xác nhận mật khẩu',
  'auth.fullName': 'Họ và tên',
  'auth.forgotPassword': 'Quên mật khẩu?',
  'auth.noAccount': 'Chưa có tài khoản?',
  'auth.hasAccount': 'Đã có tài khoản?',

  // Dashboard
  'dashboard.title': 'Bảng điều khiển CFO',
  'dashboard.totalRevenue': 'Tổng doanh thu',
  'dashboard.netProfit': 'Lợi nhuận ròng',
  'dashboard.cashBalance': 'Số dư tiền mặt',
  'dashboard.accountsReceivable': 'Phải thu',
  'dashboard.refreshData': 'Làm mới dữ liệu',

  // Executive Summary
  'exec.subtitle': 'Tổng quan tài chính dành cho CEO/Board - cập nhật real-time',
  'exec.healthScore': 'Financial Health Score',
  'exec.healthDescription': 'Đánh giá sức khỏe tài chính theo 6 chiều',
  'exec.points': 'điểm',
  'exec.statusGood': 'Tốt',
  'exec.statusWarning': 'Trung bình',
  'exec.statusCritical': 'Cần cải thiện',
  'exec.goodMetrics': 'Chỉ số tốt',
  'exec.needsMonitoring': 'Cần theo dõi',
  'exec.needsImprovement': 'Cần cải thiện',
  'exec.revenueMTD': 'Doanh thu tháng',
  'exec.cashPosition': 'Vị thế tiền mặt',
  'exec.runway': 'Runway',
  'exec.months': 'tháng',
  'exec.minThreshold': 'Ngưỡng tối thiểu',
  'exec.target': 'mục tiêu',
  'exec.quickWins': 'Cơ hội nhanh',
  'exec.quickWinsDesc': 'Cơ hội tiết kiệm/tăng revenue - tính từ dữ liệu thực',
  'exec.noQuickWins': 'Tuyệt vời! Không có quick win cần xử lý',
  'exec.totalPotential': 'Tổng tiềm năng thu hồi',
  'exec.riskAlerts': 'Cảnh báo rủi ro',
  'exec.riskAlertsDesc': 'Các rủi ro tài chính cần lưu ý',
  'exec.noRiskAlerts': 'Không có cảnh báo rủi ro nào',
  'exec.effortLow': 'Dễ thực hiện',
  'exec.effortMedium': 'Trung bình',
  'exec.effortHigh': 'Phức tạp',
  'exec.reduceRisk': 'Giảm rủi ro',
  // Health dimensions
  'exec.dimLiquidity': 'Thanh khoản',
  'exec.dimReceivables': 'Công nợ',
  'exec.dimProfitability': 'Lợi nhuận',
  'exec.dimEfficiency': 'Hiệu quả',
  'exec.dimGrowth': 'Tăng trưởng',
  'exec.dimStability': 'Ổn định',

  // Covenant Tracking
  'covenant.title': 'Theo dõi Covenant',
  'covenant.subtitle': 'Giám sát tuân thủ cam kết tài chính với ngân hàng',
  'covenant.addCovenant': 'Thêm Covenant',
  'covenant.compliant': 'Tuân thủ',
  'covenant.warning': 'Cảnh báo',
  'covenant.breached': 'Vi phạm',
  'covenant.lender': 'Ngân hàng',
  'covenant.type': 'Loại',
  'covenant.threshold': 'Ngưỡng',
  'covenant.current': 'Hiện tại',
  'covenant.margin': 'Margin',
  'covenant.measurementHistory': 'Lịch sử đo lường',
};

// English translations
const en: Record<string, string> = {
  // Common
  'common.search': 'Search invoices, customers...',
  'common.loading': 'Loading...',
  'common.noData': 'No data',
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.edit': 'Edit',
  'common.add': 'Add',
  'common.view': 'View',
  'common.close': 'Close',
  'common.confirm': 'Confirm',
  'common.back': 'Back',
  'common.next': 'Next',
  'common.submit': 'Submit',
  'common.export': 'Export',
  'common.import': 'Import',
  'common.filter': 'Filter',
  'common.reset': 'Reset',
  'common.all': 'All',
  'common.status': 'Status',
  'common.actions': 'Actions',
  'common.date': 'Date',
  'common.amount': 'Amount',
  'common.total': 'Total',
  'common.details': 'Details',
  'common.settings': 'Settings',
  'common.help': 'Help',
  'common.logout': 'Sign out',

  // Header
  'header.alerts': 'Alerts',
  'header.unreadAlerts': 'unread alerts',
  'header.noAlerts': 'No alerts',
  'header.viewAllAlerts': 'View all alerts',
  'header.high': 'High',
  'header.medium': 'Medium',
  'header.low': 'Low',

  // Sidebar - Main navigation
  'nav.cfoOverview': 'CFO Overview',
  'nav.dashboard': 'Dashboard',
  'nav.cashForecast': 'Cash Flow Forecast',
  'nav.workingCapital': 'Working Capital Optimization',
  'nav.cashConversion': 'Cash Conversion Cycle',

  'nav.strategyDecision': 'Strategy & Decision',
  'nav.executiveSummary': 'Executive Summary',
  'nav.capitalAllocation': 'Capital Allocation',
  'nav.riskDashboard': 'Risk Dashboard',
  'nav.decisionSupport': 'Decision Support',

  'nav.financialReports': 'Financial Reports',
  'nav.plReport': 'P&L Report',
  'nav.analysis': 'Comprehensive Analysis',
  'nav.budgetVsActual': 'Budget vs Actual',
  'nav.varianceAnalysis': 'Variance Analysis',
  'nav.boardReports': 'Board Reports',

  'nav.planSimulation': 'Planning & Simulation',
  'nav.scenario': 'Scenario & What-If',
  'nav.rollingForecast': 'Rolling Forecast',
  'nav.strategicInitiatives': 'Strategic Initiatives',

  'nav.arAp': 'AR/AP',
  'nav.invoiceManagement': 'Invoice Management',
  'nav.arOperations': 'AR Operations',
  'nav.apOverview': 'AP Overview',
  'nav.creditDebitNotes': 'CN/DN Tracking',
  'nav.reconciliation': 'Reconciliation',

  'nav.salesChannels': 'Sales Channels',
  'nav.channelAnalytics': 'Channel Analytics',
  'nav.unitEconomics': 'Unit Economics',

  'nav.dataHub': 'Data Hub',
  'nav.dataCenter': 'Data Center',
  'nav.etlRules': 'ETL Rules',

  'nav.taxCompliance': 'Tax & Compliance',
  'nav.taxTracking': 'Tax Compliance',
  'nav.covenantTracking': 'Covenant Tracking',

  'nav.alerts': 'Alerts',

  'nav.admin': 'Administration',
  'nav.companyManagement': 'Company Management',
  'nav.members': 'Members',
  'nav.rbac': 'RBAC Permissions',
  'nav.auditLog': 'Activity Log',

  'nav.api': 'API',

  'nav.integrationGuide': 'Integration Guide',
  'nav.formulas': 'Formulas',
  'nav.formulasOverview': 'Formula Overview',
  'nav.formulaSettings': 'Formula Settings',
  'nav.superAdmin': 'Super Admin',
  'nav.tenantManagement': 'Tenant Management',
  'nav.userManagement': 'User Management',
  'nav.platformSettings': 'Platform Settings',

  // Auth
  'auth.signIn': 'Sign In',
  'auth.signUp': 'Sign Up',
  'auth.email': 'Email',
  'auth.password': 'Password',
  'auth.confirmPassword': 'Confirm Password',
  'auth.fullName': 'Full Name',
  'auth.forgotPassword': 'Forgot password?',
  'auth.noAccount': "Don't have an account?",
  'auth.hasAccount': 'Already have an account?',

  // Dashboard
  'dashboard.title': 'CFO Dashboard',
  'dashboard.totalRevenue': 'Total Revenue',
  'dashboard.netProfit': 'Net Profit',
  'dashboard.cashBalance': 'Cash Balance',
  'dashboard.accountsReceivable': 'Accounts Receivable',
  'dashboard.refreshData': 'Refresh Data',

  // Executive Summary
  'exec.subtitle': 'Financial overview for CEO/Board - real-time updates',
  'exec.healthScore': 'Financial Health Score',
  'exec.healthDescription': 'Financial health assessment across 6 dimensions',
  'exec.points': 'points',
  'exec.statusGood': 'Good',
  'exec.statusWarning': 'Average',
  'exec.statusCritical': 'Needs Improvement',
  'exec.goodMetrics': 'Good Metrics',
  'exec.needsMonitoring': 'Needs Monitoring',
  'exec.needsImprovement': 'Needs Improvement',
  'exec.revenueMTD': 'Revenue MTD',
  'exec.cashPosition': 'Cash Position',
  'exec.runway': 'Runway',
  'exec.months': 'months',
  'exec.minThreshold': 'Min threshold',
  'exec.target': 'target',
  'exec.quickWins': 'Quick Wins',
  'exec.quickWinsDesc': 'Savings/revenue opportunities - calculated from real data',
  'exec.noQuickWins': 'Excellent! No quick wins to handle',
  'exec.totalPotential': 'Total potential recovery',
  'exec.riskAlerts': 'Risk Alerts',
  'exec.riskAlertsDesc': 'Financial risks to watch',
  'exec.noRiskAlerts': 'No risk alerts',
  'exec.effortLow': 'Easy',
  'exec.effortMedium': 'Medium',
  'exec.effortHigh': 'Complex',
  'exec.reduceRisk': 'Reduce risk',
  // Health dimensions
  'exec.dimLiquidity': 'Liquidity',
  'exec.dimReceivables': 'Receivables',
  'exec.dimProfitability': 'Profitability',
  'exec.dimEfficiency': 'Efficiency',
  'exec.dimGrowth': 'Growth',
  'exec.dimStability': 'Stability',

  // Covenant Tracking
  'covenant.title': 'Covenant Tracking',
  'covenant.subtitle': 'Monitor financial covenant compliance with banks',
  'covenant.addCovenant': 'Add Covenant',
  'covenant.compliant': 'Compliant',
  'covenant.warning': 'Warning',
  'covenant.breached': 'Breached',
  'covenant.lender': 'Lender',
  'covenant.type': 'Type',
  'covenant.threshold': 'Threshold',
  'covenant.current': 'Current',
  'covenant.margin': 'Margin',
  'covenant.measurementHistory': 'Measurement History',
};

const translations: Record<Language, Record<string, string>> = { vi, en };

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('app-language');
    return (saved as Language) || 'vi';
  });

  useEffect(() => {
    localStorage.setItem('app-language', language);
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
