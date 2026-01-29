/**
 * Full System Overview Sales Deck PDF Generator
 * 
 * 16-slide comprehensive deck showcasing the entire Bluecore ecosystem:
 * - Value Proposition
 * - Platform Capabilities (FDP, MDP, CDP, Control Tower, Data Warehouse)
 * - Competitive Advantages
 * - Complete Use Cases
 * - Why Bluecore?
 * 
 * Vietnamese content with proper diacritics (tiếng Việt có dấu đầy đủ)
 */

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';

// Get base URL dynamically for font loading
const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
};

// Register Noto Sans font (supports Vietnamese characters)
Font.register({
  family: 'NotoSans',
  fonts: [
    { src: `${getBaseUrl()}/fonts/NotoSans-Regular.ttf`, fontWeight: 400 },
    { src: `${getBaseUrl()}/fonts/NotoSans-Bold.ttf`, fontWeight: 700 },
  ],
});

// Brand colors
const colors = {
  primary: '#3b82f6',
  primaryDark: '#1e40af',
  accent: '#10b981',
  accentDark: '#059669',
  warning: '#f59e0b',
  danger: '#ef4444',
  purple: '#8b5cf6',
  cyan: '#06b6d4',
  text: '#1f2937',
  textLight: '#6b7280',
  background: '#f8fafc',
  backgroundAlt: '#f1f5f9',
  white: '#ffffff',
  black: '#000000',
  gradientStart: '#0f172a',
  gradientMid: '#1e3a5f',
};

// Styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'NotoSans',
    backgroundColor: colors.white,
  },
  pageAlt: {
    padding: 40,
    fontFamily: 'NotoSans',
    backgroundColor: colors.backgroundAlt,
  },
  pageDark: {
    padding: 40,
    fontFamily: 'NotoSans',
    backgroundColor: colors.gradientStart,
  },
  pageAccent: {
    padding: 40,
    fontFamily: 'NotoSans',
    backgroundColor: colors.primaryDark,
  },
  
  // Cover
  coverPage: {
    padding: 60,
    fontFamily: 'NotoSans',
    backgroundColor: colors.gradientStart,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  coverTitle: {
    fontSize: 52,
    fontWeight: 700,
    color: colors.white,
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 2,
  },
  coverSubtitle: {
    fontSize: 20,
    fontWeight: 400,
    color: colors.white,
    opacity: 0.9,
    textAlign: 'center',
    maxWidth: 500,
    lineHeight: 1.6,
    marginBottom: 32,
  },
  coverBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 28,
    marginBottom: 20,
  },
  coverBadgeText: {
    fontSize: 14,
    fontWeight: 700,
    color: colors.white,
    letterSpacing: 2,
  },
  coverTagline: {
    fontSize: 16,
    fontWeight: 700,
    color: colors.accent,
    textAlign: 'center',
  },
  coverOrnament: {
    position: 'absolute',
    borderRadius: 9999,
    opacity: 0.08,
    backgroundColor: colors.white,
  },
  
  // Headers
  eyebrowLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: colors.primary,
    letterSpacing: 2,
    marginBottom: 8,
  },
  eyebrowLabelWhite: {
    fontSize: 10,
    fontWeight: 700,
    color: colors.accent,
    letterSpacing: 2,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: colors.primaryDark,
    marginBottom: 12,
  },
  sectionTitleWhite: {
    fontSize: 28,
    fontWeight: 700,
    color: colors.white,
    marginBottom: 12,
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: 400,
    color: colors.textLight,
    marginBottom: 24,
    maxWidth: 500,
    lineHeight: 1.6,
  },
  
  // Cards & Containers
  cardRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  card: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardDark: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  cardHighlight: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 20,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: colors.primaryDark,
    marginBottom: 8,
  },
  cardTitleWhite: {
    fontSize: 14,
    fontWeight: 700,
    color: colors.white,
    marginBottom: 8,
  },
  cardText: {
    fontSize: 10,
    color: colors.textLight,
    lineHeight: 1.5,
  },
  cardTextWhite: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 1.5,
  },
  
  // Modules grid
  moduleCard: {
    width: '48%',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  moduleIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  moduleTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: colors.text,
    marginBottom: 4,
  },
  moduleTagline: {
    fontSize: 9,
    fontWeight: 700,
    color: colors.primary,
    marginBottom: 6,
  },
  moduleDesc: {
    fontSize: 9,
    color: colors.textLight,
    lineHeight: 1.4,
  },
  
  // Stats
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 36,
    fontWeight: 700,
    color: colors.primary,
  },
  statNumberWhite: {
    fontSize: 36,
    fontWeight: 700,
    color: colors.white,
  },
  statLabel: {
    fontSize: 10,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: 4,
  },
  statLabelWhite: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: 4,
  },
  
  // Comparison table
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tableHeader: {
    flex: 1,
    padding: 10,
    backgroundColor: colors.primaryDark,
  },
  tableHeaderText: {
    fontSize: 9,
    fontWeight: 700,
    color: colors.white,
    textAlign: 'center',
  },
  tableCell: {
    flex: 1,
    padding: 10,
    backgroundColor: colors.white,
  },
  tableCellHighlight: {
    flex: 1,
    padding: 10,
    backgroundColor: '#ecfdf5',
  },
  tableCellText: {
    fontSize: 9,
    color: colors.text,
    textAlign: 'center',
  },
  tableCellTextBold: {
    fontSize: 9,
    fontWeight: 700,
    color: colors.accentDark,
    textAlign: 'center',
  },
  
  // Use case
  useCaseContainer: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  useCaseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  useCaseBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 12,
  },
  useCaseBadgeText: {
    fontSize: 9,
    fontWeight: 700,
    color: colors.white,
  },
  useCaseTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: colors.text,
  },
  useCaseStory: {
    fontSize: 10,
    color: colors.textLight,
    lineHeight: 1.6,
    marginBottom: 12,
  },
  useCaseResult: {
    flexDirection: 'row',
    gap: 16,
  },
  useCaseResultItem: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  
  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 8,
    color: colors.textLight,
  },
  footerTextWhite: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.6)',
  },
  pageNumber: {
    fontSize: 9,
    color: colors.textLight,
  },
  pageNumberWhite: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.6)',
  },
  
  // Manifesto
  manifestoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    paddingLeft: 4,
  },
  manifestoNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  manifestoNumberText: {
    fontSize: 10,
    fontWeight: 700,
    color: colors.white,
  },
  manifestoText: {
    flex: 1,
    fontSize: 10,
    color: colors.text,
    lineHeight: 1.5,
  },
  manifestoTextBold: {
    fontWeight: 700,
    color: colors.primaryDark,
  },
  
  // Pillars
  pillarCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  pillarTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: colors.white,
    marginTop: 8,
    textAlign: 'center',
  },
  pillarDesc: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 1.4,
  },
});

// ============= DATA CONSTANTS =============

const threePillars = [
  {
    title: 'REAL CASH',
    desc: 'Tiền thật đã về tài khoản, không phải doanh thu trên giấy',
    icon: 'VND',
  },
  {
    title: 'TRUTH FIRST',
    desc: 'Sự thật tài chính, không làm đẹp số để báo cáo',
    icon: 'TRUE',
  },
  {
    title: 'ACTION NOW',
    desc: 'Quyết định hôm nay, không đợi báo cáo cuối tháng',
    icon: 'NOW',
  },
];

const platformModules = [
  {
    id: 'fdp',
    name: 'FDP',
    fullName: 'Financial Data Platform',
    tagline: 'Truth > Flexibility',
    color: colors.primary,
    description: 'Nền tảng tài chính - Single Source of Truth cho Net Revenue, Contribution Margin, và Real Cash Position.',
    features: ['CFO Dashboard', 'Unit Economics', 'Cash Flow Direct', 'Working Capital', 'AR/AP Operations'],
  },
  {
    id: 'mdp',
    name: 'MDP',
    fullName: 'Marketing Data Platform',
    tagline: 'Profit before Performance',
    color: colors.purple,
    description: 'Đo lường giá trị tài chính thật của Marketing - Profit ROAS thay vì Click ROAS.',
    features: ['Profit Attribution', 'Cash Impact', 'CAC Payback', 'Channel P&L', 'Scale/Kill Decisions'],
  },
  {
    id: 'cdp',
    name: 'CDP',
    fullName: 'Customer Data Platform',
    tagline: 'Population > Individual',
    color: colors.accent,
    description: 'Theo dõi sức khỏe tài chính của tập khách hàng - LTV Decay, Cohort Shift, Revenue at Risk.',
    features: ['Customer Equity', 'LTV Forecast', 'Cohort Analysis', 'Churn Prediction', 'At-Risk Revenue'],
  },
  {
    id: 'ct',
    name: 'Control Tower',
    fullName: 'Trung Tâm Điều Hành',
    tagline: 'Awareness before Analytics',
    color: colors.warning,
    description: 'Báo động và hành động - Chỉ quan tâm "điều gì sai" với Impact, Deadline, và Owner.',
    features: ['Max 7 Alerts', 'Impact Calculation', 'Auto-Escalation', 'Resolution Tracking', 'Cross-module Sync'],
  },
  {
    id: 'dw',
    name: 'Financial Spine',
    fullName: 'Xương Sống Tài Chính',
    tagline: 'Không có Spine = Mỗi phòng 1 con số',
    color: colors.cyan,
    description: 'Nền tảng dữ liệu tập trung với 35+ connectors cho thị trường Việt Nam. Không có Financial Spine, Control Tower vô nghĩa.',
    features: ['35+ Connectors', 'Single Source of Truth', 'Real-time Sync', '1-2 Weeks Deploy', 'Zero Reconcile'],
  },
];

// Hidden cost data - kích hoạt nỗi sợ
const hiddenCosts = [
  {
    title: 'Sai lệch 2-3% Net Revenue',
    pain: 'Lệch quyết định tồn kho, mua thừa 500 triệu hàng không bán được',
    cost: '500 triệu VND',
  },
  {
    title: 'ROAS dương nhưng Profit âm',
    pain: 'Marketing báo "đang thắng" trong khi thực tế đốt 200 triệu/tháng trong im lặng',
    cost: '2.4 tỷ VND/năm',
  },
  {
    title: 'Không thấy Cash Gap sớm',
    pain: 'Phát hiện thiếu tiền khi đã muộn, vay nóng lãi suất 18-24%/năm',
    cost: 'Lãi vay + Mất uy tín',
  },
  {
    title: 'AR quá hạn không ai biết',
    pain: '800 triệu nợ xấu âm thầm tích lũy, chỉ phát hiện khi kiểm toán cuối năm',
    cost: '800 triệu VND bad debt',
  },
];

const connectorStats = {
  total: '35+',
  ecommerce: 'Shopee, Lazada, TikTok Shop, Tiki',
  erp: 'Haravan, Sapo, KiotViet, MISA, Suno',
  marketing: 'Google Ads, Meta Ads, TikTok Ads',
  banking: 'Techcombank, VietinBank, MB Bank',
};

const competitiveComparison = [
  {
    criteria: 'Thời gian triển khai',
    excel: '0 (nhưng chaos)',
    powerbi: '3-6 tháng',
    custom: '6-12 tháng',
    bluecore: '1-2 tuần',
  },
  {
    criteria: 'Tích hợp sàn VN',
    excel: 'Thủ công 100%',
    powerbi: 'Tự code API',
    custom: 'Tự xây dựng',
    bluecore: '35+ native',
  },
  {
    criteria: 'Unit Economics',
    excel: 'Không có',
    powerbi: 'Tự tính',
    custom: 'Tùy thuộc dev',
    bluecore: 'Có sẵn',
  },
  {
    criteria: 'Real Cash Tracking',
    excel: 'Không',
    powerbi: 'Không',
    custom: 'Có thể',
    bluecore: 'Có sẵn',
  },
  {
    criteria: 'Alert System',
    excel: 'Không',
    powerbi: 'Basic',
    custom: 'Tùy thuộc',
    bluecore: 'Financial-first',
  },
  {
    criteria: 'Chi phí duy trì',
    excel: 'Thấp',
    powerbi: 'Trung bình',
    custom: 'Rất cao',
    bluecore: 'Cố định',
  },
];

const useCases = [
  {
    id: '1',
    title: 'Kiểm tra sức khỏe tài chính mỗi sáng',
    persona: 'CEO Retail',
    story: 'Mỗi sáng, Anh Minh - CEO chuỗi thời trang - mở Bluecore thay vì gọi kế toán. Trong 30 giây, anh thấy: Cash khả dụng 1.2 tỷ, 3 đơn hàng lớn chưa thanh toán 400 triệu, và 1 SKU đang lỗ 15% margin.',
    modules: ['FDP', 'Control Tower'],
    results: [
      { label: 'Thời gian kiểm tra', before: '2 tiếng', after: '30 giây' },
      { label: 'Ra quyết định', before: 'Cuối tháng', after: 'Real-time' },
    ],
  },
  {
    id: '2',
    title: 'Marketing budget allocation',
    persona: 'CMO E-commerce',
    story: 'Chị Lan điều hành marketing cho brand mỹ phẩm. Trước đây, chị chạy theo ROAS 3.5x nhưng không hiểu sao profit không tăng. MDP cho thấy: Shopee Ads có Profit ROAS chỉ 0.8x sau khi trừ phí sàn, shipping, và return.',
    modules: ['MDP', 'FDP'],
    results: [
      { label: 'Profit ROAS visibility', before: '0%', after: '100%' },
      { label: 'Budget hiệu quả', before: '50%', after: '85%' },
    ],
  },
  {
    id: '3',
    title: 'Cảnh báo khủng hoảng cash flow',
    persona: 'CFO FMCG',
    story: 'Anh Hùng quản lý tài chính công ty thực phẩm. Control Tower phát hiện: Settlement từ Shopee chậm 5 ngày + 3 đơn B2B 800 triệu quá hạn = Cash gap 1.1 tỷ trong 7 ngày tới. Anh có thời gian xử lý trước khi khủng hoảng.',
    modules: ['Control Tower', 'FDP'],
    results: [
      { label: 'Phát hiện risk', before: 'Khi xảy ra', after: '7 ngày trước' },
      { label: 'Cash gap avoided', before: '-', after: '1.1 tỷ VND' },
    ],
  },
  {
    id: '4',
    title: 'Theo dõi sức khỏe khách hàng',
    persona: 'Founder D2C',
    story: 'Tuấn sáng lập startup D2C. CDP cho thấy: Cohort Q1/2024 có LTV decay 40% sau 6 tháng - nhanh hơn 2x so với cohort cũ. At-risk revenue: 2 tỷ. Anh điều chỉnh retention campaign trước khi mất khách.',
    modules: ['CDP', 'MDP'],
    results: [
      { label: 'Churn visibility', before: 'Quarterly', after: 'Weekly' },
      { label: 'Revenue bảo vệ', before: '-', after: '1.2 tỷ VND' },
    ],
  },
];

const manifesto = [
  { title: 'SINGLE SOURCE OF TRUTH', desc: '1 Net Revenue, 1 Contribution Margin, 1 Cash Position. Không có phiên bản khác.' },
  { title: 'REAL CASH', desc: 'Phân biệt: Tiền đã về / sẽ về / có nguy cơ không về / đang bị khóa.' },
  { title: 'REVENUE ↔ COST', desc: 'Mọi doanh thu đều đi kèm chi phí. Không có doanh thu "đứng một mình".' },
  { title: 'UNIT ECONOMICS → ACTION', desc: 'SKU lỗ + khóa cash + tăng risk → phải nói STOP.' },
  { title: 'TODAY\'S DECISION', desc: 'Phục vụ quyết định hôm nay, không phải báo cáo cuối tháng.' },
  { title: 'SURFACE PROBLEMS', desc: 'Không làm đẹp số, không che anomaly, chỉ ra vấn đề sớm.' },
  { title: 'AWARENESS BEFORE ANALYTICS', desc: 'Biết điều gì sai trước khi phân tích chi tiết.' },
  { title: 'PROFIT BEFORE PERFORMANCE', desc: 'Lợi nhuận thật trước hiệu suất marketing trên giấy.' },
  { title: 'POPULATION > INDIVIDUAL', desc: 'Sức khỏe tập khách hàng quan trọng hơn CRM từng người.' },
  { title: 'FINAL TEST', desc: 'Nếu không khiến quyết định rõ ràng hơn → Bluecore đã thất bại.' },
];

// ============= PAGE COMPONENTS =============

const CoverPage = () => (
  <Page size="A4" style={styles.coverPage}>
    <View style={[styles.coverOrnament, { width: 600, height: 600, top: -200, right: -250 }]} />
    <View style={[styles.coverOrnament, { width: 700, height: 700, bottom: -300, left: -350, opacity: 0.05 }]} />
    <View style={[styles.coverOrnament, { width: 200, height: 200, bottom: 150, right: 100, opacity: 0.06 }]} />
    
    <View style={styles.coverBadge}>
      <Text style={styles.coverBadgeText}>EXECUTIVE DECISION OS</Text>
    </View>
    
    <Text style={styles.coverTitle}>BLUECORE</Text>
    <Text style={styles.coverSubtitle}>
      Nền tảng Ra Quyết định Tài chính cho CEO/CFO Retail & E-commerce Việt Nam
    </Text>
    <Text style={styles.coverTagline}>Truth &gt; Flexibility</Text>
    
    <View style={styles.footer}>
      <Text style={styles.footerTextWhite}>bluecore.vn</Text>
      <Text style={styles.pageNumberWhite}>Full System Overview 2025</Text>
    </View>
  </Page>
);

const PillarsPage = () => (
  <Page size="A4" style={styles.pageDark}>
    <Text style={styles.eyebrowLabelWhite}>GIÁ TRỊ CỐT LÕI</Text>
    <Text style={styles.sectionTitleWhite}>3 Trụ Cột Của Bluecore</Text>
    
    <View style={{ flexDirection: 'row', gap: 16, marginTop: 40 }}>
      {threePillars.map((pillar, index) => (
        <View key={index} style={styles.pillarCard}>
          <View style={{ 
            width: 48, 
            height: 48, 
            borderRadius: 24, 
            backgroundColor: colors.accent,
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <Text style={{ fontSize: 12, fontWeight: 700, color: colors.white }}>{pillar.icon}</Text>
          </View>
          <Text style={styles.pillarTitle}>{pillar.title}</Text>
          <Text style={styles.pillarDesc}>{pillar.desc}</Text>
        </View>
      ))}
    </View>
    
    <View style={{ 
      marginTop: 40, 
      padding: 24, 
      backgroundColor: 'rgba(16, 185, 129, 0.15)',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(16, 185, 129, 0.3)',
    }}>
      <Text style={{ fontSize: 16, fontWeight: 700, color: colors.white, textAlign: 'center', marginBottom: 12 }}>
        "Bluecore không phải BI — không phải ERP"
      </Text>
      <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 1.6 }}>
        BI cho bạn biểu đồ. ERP cho bạn quy trình. Bluecore cho bạn QUYẾT ĐỊNH — với dữ liệu tài chính thật, ngay lập tức.
      </Text>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerTextWhite}>bluecore.vn</Text>
      <Text style={styles.pageNumberWhite}>2 / 17</Text>
    </View>
  </Page>
);

// NEW SLIDE: The Hidden Cost of Not Knowing - kích hoạt nỗi sợ
const HiddenCostPage = () => (
  <Page size="A4" style={styles.page}>
    <Text style={[styles.eyebrowLabel, { color: colors.danger }]}>CẢNH BÁO</Text>
    <Text style={styles.sectionTitle}>Cái Giá Của "Không Biết"</Text>
    <Text style={styles.sectionSubtitle}>
      Những thiệt hại âm thầm xảy ra mỗi ngày khi doanh nghiệp không có nguồn sự thật tài chính đáng tin cậy.
    </Text>
    
    <View style={{ gap: 12 }}>
      {hiddenCosts.map((item, index) => (
        <View key={index} style={{ 
          backgroundColor: index === 0 ? '#fef2f2' : colors.white, 
          borderRadius: 12, 
          padding: 16,
          borderWidth: 1,
          borderColor: index === 0 ? '#fecaca' : '#e2e8f0',
          flexDirection: 'row',
          alignItems: 'flex-start',
        }}>
          <View style={{ 
            width: 32, 
            height: 32, 
            borderRadius: 16, 
            backgroundColor: colors.danger,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 14,
          }}>
            <Text style={{ fontSize: 14, fontWeight: 700, color: colors.white }}>!</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, fontWeight: 700, color: colors.danger, marginBottom: 4 }}>
              {item.title}
            </Text>
            <Text style={{ fontSize: 10, color: colors.text, lineHeight: 1.5, marginBottom: 6 }}>
              {item.pain}
            </Text>
            <Text style={{ fontSize: 11, fontWeight: 700, color: colors.primaryDark }}>
              Thiệt hại: {item.cost}
            </Text>
          </View>
        </View>
      ))}
    </View>
    
    <View style={{ 
      marginTop: 20, 
      backgroundColor: colors.danger,
      borderRadius: 12,
      padding: 16,
    }}>
      <Text style={{ fontSize: 12, fontWeight: 700, color: colors.white, textAlign: 'center' }}>
        Doanh nghiệp không chết vì thiếu tiền. Doanh nghiệp chết vì KHÔNG BIẾT mình sắp hết tiền.
      </Text>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerText}>bluecore.vn</Text>
      <Text style={styles.pageNumber}>3 / 17</Text>
    </View>
  </Page>
);

const EcosystemOverviewPage = () => (
  <Page size="A4" style={styles.page}>
    <Text style={styles.eyebrowLabel}>HỆ SINH THÁI</Text>
    <Text style={styles.sectionTitle}>5 Modules — 1 Sự Thật Tài Chính</Text>
    <Text style={styles.sectionSubtitle}>
      Mỗi module giải quyết một góc nhìn khác nhau, nhưng tất cả đều chia sẻ cùng một nguồn sự thật tài chính.
    </Text>
    
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
      {platformModules.map((module) => (
        <View key={module.id} style={styles.moduleCard}>
          <View style={[styles.moduleIcon, { backgroundColor: `${module.color}20` }]}>
            <Text style={{ fontSize: 12, fontWeight: 700, color: module.color }}>{module.name}</Text>
          </View>
          <Text style={styles.moduleTitle}>{module.fullName}</Text>
          <Text style={styles.moduleTagline}>{module.tagline}</Text>
          <Text style={styles.moduleDesc}>{module.description}</Text>
        </View>
      ))}
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerText}>bluecore.vn</Text>
      <Text style={styles.pageNumber}>4 / 17</Text>
    </View>
  </Page>
);

const FDPDetailPage = () => (
  <Page size="A4" style={styles.pageAlt}>
    <Text style={styles.eyebrowLabel}>MODULE 1: FDP</Text>
    <Text style={styles.sectionTitle}>Financial Data Platform</Text>
    <Text style={styles.sectionSubtitle}>
      Nền tảng tài chính cho CEO/CFO — Single Source of Truth cho mọi quyết định kinh doanh.
    </Text>
    
    <View style={styles.cardRow}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>CFO Dashboard</Text>
        <Text style={styles.cardText}>Net Revenue, Contribution Margin, Cash Position — tất cả trong 1 màn hình. Không cần đợi kế toán.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Real Cash Breakdown</Text>
        <Text style={styles.cardText}>Tiền đã về vs. sẽ về vs. có nguy cơ không về vs. đang bị khóa. Biết chính xác khả năng thanh toán.</Text>
      </View>
    </View>
    
    <View style={styles.cardRow}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Unit Economics</Text>
        <Text style={styles.cardText}>Contribution Margin per SKU/Channel. Biết ngay sản phẩm nào đang lỗ, kênh nào đang "đốt tiền".</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Working Capital</Text>
        <Text style={styles.cardText}>DSO, DIO, DPO, Cash Conversion Cycle. Hiểu rõ tiền đang kẹt ở đâu trong chuỗi vận hành.</Text>
      </View>
    </View>
    
    <View style={{ 
      backgroundColor: colors.primaryDark, 
      borderRadius: 12, 
      padding: 20,
      marginTop: 16,
    }}>
      <Text style={{ fontSize: 12, fontWeight: 700, color: colors.white, marginBottom: 8 }}>
        Công thức cốt lõi:
      </Text>
      <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.9)', lineHeight: 1.6 }}>
        Net Revenue = Gross Revenue - Returns - Discounts - Platform Fees{'\n'}
        Contribution Margin = Net Revenue - COGS - Variable Costs{'\n'}
        Real Cash = Bank Balance - Pending Payables - Locked Inventory + Confirmed AR
      </Text>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerText}>bluecore.vn</Text>
      <Text style={styles.pageNumber}>5 / 17</Text>
    </View>
  </Page>
);

const MDPDetailPage = () => (
  <Page size="A4" style={styles.page}>
    <Text style={styles.eyebrowLabel}>MODULE 2: MDP</Text>
    <Text style={styles.sectionTitle}>Marketing Data Platform</Text>
    <Text style={styles.sectionSubtitle}>
      Đo lường giá trị tài chính thật của Marketing — Profit ROAS, không phải Click ROAS.
    </Text>
    
    <View style={styles.cardRow}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Profit Attribution</Text>
        <Text style={styles.cardText}>Quy về lợi nhuận thật cho từng campaign. ROAS sau khi trừ COGS, phí sàn, shipping, và return.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Cash Impact</Text>
        <Text style={styles.cardText}>Marketing tốn tiền trước, thu tiền sau. MDP theo dõi Days to Cash và Cash Conversion của từng kênh.</Text>
      </View>
    </View>
    
    <View style={styles.cardRow}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Decision Panel</Text>
        <Text style={styles.cardText}>3 quyết định đơn giản: SCALE (tăng ngân sách), HOLD (giữ nguyên), hoặc KILL (dừng ngay).</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Risk Alerts</Text>
        <Text style={styles.cardText}>Cảnh báo khi CAC Payback &gt; 6 tháng, khi Burn Rate vượt ngưỡng, khi campaign "đốt tiền" mà không có profit.</Text>
      </View>
    </View>
    
    <View style={{ 
      backgroundColor: '#fef3c7', 
      borderRadius: 12, 
      padding: 16,
      borderWidth: 1,
      borderColor: '#fcd34d',
      marginTop: 16,
    }}>
      <Text style={{ fontSize: 11, fontWeight: 700, color: '#92400e', marginBottom: 6 }}>
        Vấn đề MDP giải quyết:
      </Text>
      <Text style={{ fontSize: 10, color: '#92400e', lineHeight: 1.5 }}>
        "Marketing báo ROAS 4.0x nhưng không hiểu sao lợi nhuận không tăng?" — Vì ROAS chưa tính phí sàn 15%, shipping 8%, return 12%. Profit ROAS thực tế chỉ còn 0.9x.
      </Text>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerText}>bluecore.vn</Text>
      <Text style={styles.pageNumber}>6 / 17</Text>
    </View>
  </Page>
);

const CDPControlTowerPage = () => (
  <Page size="A4" style={styles.pageAlt}>
    <View style={{ flexDirection: 'row', gap: 16 }}>
      {/* CDP Column */}
      <View style={{ flex: 1 }}>
        <Text style={styles.eyebrowLabel}>MODULE 3: CDP</Text>
        <Text style={{ fontSize: 16, fontWeight: 700, color: colors.primaryDark, marginBottom: 8 }}>Customer Data Platform</Text>
        <Text style={{ fontSize: 9, color: colors.textLight, marginBottom: 16, lineHeight: 1.5 }}>
          Khách hàng là tài sản tài chính. CDP theo dõi sức khỏe tập khách hàng, không phải CRM từng người.
        </Text>
        
        <View style={{ backgroundColor: colors.white, borderRadius: 10, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' }}>
          <Text style={{ fontSize: 11, fontWeight: 700, color: colors.text, marginBottom: 4 }}>Customer Equity</Text>
          <Text style={{ fontSize: 9, color: colors.textLight, lineHeight: 1.4 }}>Giá trị tài sản khách hàng: LTV 12M, 24M Forecast, At-Risk Value.</Text>
        </View>
        
        <View style={{ backgroundColor: colors.white, borderRadius: 10, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' }}>
          <Text style={{ fontSize: 11, fontWeight: 700, color: colors.text, marginBottom: 4 }}>LTV Decay Analysis</Text>
          <Text style={{ fontSize: 9, color: colors.textLight, lineHeight: 1.4 }}>Phát hiện cohort nào đang "chết" nhanh hơn bình thường.</Text>
        </View>
        
        <View style={{ backgroundColor: colors.white, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' }}>
          <Text style={{ fontSize: 11, fontWeight: 700, color: colors.text, marginBottom: 4 }}>At-Risk Revenue</Text>
          <Text style={{ fontSize: 9, color: colors.textLight, lineHeight: 1.4 }}>Bao nhiêu doanh thu đang có nguy cơ mất nếu không hành động?</Text>
        </View>
      </View>
      
      {/* Control Tower Column */}
      <View style={{ flex: 1 }}>
        <Text style={[styles.eyebrowLabel, { color: colors.warning }]}>MODULE 4: CONTROL TOWER</Text>
        <Text style={{ fontSize: 16, fontWeight: 700, color: colors.primaryDark, marginBottom: 8 }}>Trung Tâm Điều Hành</Text>
        <Text style={{ fontSize: 9, color: colors.textLight, marginBottom: 16, lineHeight: 1.5 }}>
          Control Tower không phải Dashboard. Chỉ quan tâm "điều gì sai" và yêu cầu hành động ngay.
        </Text>
        
        <View style={{ backgroundColor: colors.white, borderRadius: 10, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' }}>
          <Text style={{ fontSize: 11, fontWeight: 700, color: colors.text, marginBottom: 4 }}>Max 7 Alerts</Text>
          <Text style={{ fontSize: 9, color: colors.textLight, lineHeight: 1.4 }}>Ít nhưng chí mạng. Mỗi alert phải có Impact (VND) + Deadline + Owner.</Text>
        </View>
        
        <View style={{ backgroundColor: colors.white, borderRadius: 10, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' }}>
          <Text style={{ fontSize: 11, fontWeight: 700, color: colors.text, marginBottom: 4 }}>Auto-Escalation</Text>
          <Text style={{ fontSize: 9, color: colors.textLight, lineHeight: 1.4 }}>Nếu chưa xử lý trong thời gian quy định → tự động leo thang lên cấp trên.</Text>
        </View>
        
        <View style={{ backgroundColor: colors.white, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' }}>
          <Text style={{ fontSize: 11, fontWeight: 700, color: colors.text, marginBottom: 4 }}>Cross-Module Sync</Text>
          <Text style={{ fontSize: 9, color: colors.textLight, lineHeight: 1.4 }}>Phát hiện cascade: CDP churn → MDP CAC tăng → FDP cash giảm.</Text>
        </View>
      </View>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerText}>bluecore.vn</Text>
      <Text style={styles.pageNumber}>7 / 17</Text>
    </View>
  </Page>
);

const DataWarehousePage = () => (
  <Page size="A4" style={styles.page}>
    <Text style={[styles.eyebrowLabel, { color: colors.cyan }]}>FINANCIAL SPINE</Text>
    <Text style={styles.sectionTitle}>Xương Sống Tài Chính</Text>
    <Text style={styles.sectionSubtitle}>
      Không có Financial Spine, mỗi phòng một con số. Không có Financial Spine, Control Tower vô nghĩa.
    </Text>
    
    <View style={styles.cardRow}>
      <View style={styles.statBox}>
        <Text style={styles.statNumber}>35+</Text>
        <Text style={styles.statLabel}>Connectors có sẵn</Text>
      </View>
      <View style={styles.statBox}>
        <Text style={styles.statNumber}>1-2</Text>
        <Text style={styles.statLabel}>Tuần triển khai</Text>
      </View>
      <View style={styles.statBox}>
        <Text style={styles.statNumber}>0</Text>
        <Text style={styles.statLabel}>Lần reconcile</Text>
      </View>
    </View>
    
    <View style={{ marginTop: 20 }}>
      <View style={{ 
        backgroundColor: colors.backgroundAlt, 
        borderRadius: 12, 
        padding: 16, 
        marginBottom: 12,
      }}>
        <Text style={{ fontSize: 11, fontWeight: 700, color: colors.text, marginBottom: 8 }}>Sàn TMĐT</Text>
        <Text style={{ fontSize: 10, color: colors.textLight }}>{connectorStats.ecommerce}</Text>
      </View>
      
      <View style={{ 
        backgroundColor: colors.backgroundAlt, 
        borderRadius: 12, 
        padding: 16, 
        marginBottom: 12,
      }}>
        <Text style={{ fontSize: 11, fontWeight: 700, color: colors.text, marginBottom: 8 }}>ERP & POS</Text>
        <Text style={{ fontSize: 10, color: colors.textLight }}>{connectorStats.erp}</Text>
      </View>
      
      <View style={{ 
        backgroundColor: colors.backgroundAlt, 
        borderRadius: 12, 
        padding: 16, 
        marginBottom: 12,
      }}>
        <Text style={{ fontSize: 11, fontWeight: 700, color: colors.text, marginBottom: 8 }}>Marketing Platforms</Text>
        <Text style={{ fontSize: 10, color: colors.textLight }}>{connectorStats.marketing}</Text>
      </View>
      
      <View style={{ 
        backgroundColor: colors.backgroundAlt, 
        borderRadius: 12, 
        padding: 16,
      }}>
        <Text style={{ fontSize: 11, fontWeight: 700, color: colors.text, marginBottom: 8 }}>Ngân hàng</Text>
        <Text style={{ fontSize: 10, color: colors.textLight }}>{connectorStats.banking}</Text>
      </View>
    </View>
    
    <View style={{ 
      marginTop: 16, 
      backgroundColor: '#fef3c7',
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: '#fcd34d',
    }}>
      <Text style={{ fontSize: 10, fontWeight: 700, color: '#92400e', textAlign: 'center' }}>
        Tại sao gọi là "Financial Spine"? Vì nếu thiếu nó, toàn bộ hệ thống Bluecore không đứng vững — như cơ thể không có xương sống.
      </Text>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerText}>bluecore.vn</Text>
      <Text style={styles.pageNumber}>8 / 17</Text>
    </View>
  </Page>
);

const CompetitiveAdvantagesPage = () => (
  <Page size="A4" style={styles.pageAlt}>
    <Text style={styles.eyebrowLabel}>LỢI THẾ CẠNH TRANH</Text>
    <Text style={styles.sectionTitle}>Bluecore vs. Các Giải Pháp Khác</Text>
    
    <View style={{ borderRadius: 12, overflow: 'hidden', marginTop: 16 }}>
      {/* Header */}
      <View style={styles.tableRow}>
        <View style={[styles.tableHeader, { flex: 1.5 }]}>
          <Text style={styles.tableHeaderText}>Tiêu chí</Text>
        </View>
        <View style={styles.tableHeader}>
          <Text style={styles.tableHeaderText}>Excel/Sheets</Text>
        </View>
        <View style={styles.tableHeader}>
          <Text style={styles.tableHeaderText}>Power BI</Text>
        </View>
        <View style={styles.tableHeader}>
          <Text style={styles.tableHeaderText}>Tự xây</Text>
        </View>
        <View style={[styles.tableHeader, { backgroundColor: colors.accentDark }]}>
          <Text style={styles.tableHeaderText}>Bluecore</Text>
        </View>
      </View>
      
      {/* Rows */}
      {competitiveComparison.map((row, index) => (
        <View key={index} style={styles.tableRow}>
          <View style={[styles.tableCell, { flex: 1.5 }]}>
            <Text style={styles.tableCellText}>{row.criteria}</Text>
          </View>
          <View style={styles.tableCell}>
            <Text style={styles.tableCellText}>{row.excel}</Text>
          </View>
          <View style={styles.tableCell}>
            <Text style={styles.tableCellText}>{row.powerbi}</Text>
          </View>
          <View style={styles.tableCell}>
            <Text style={styles.tableCellText}>{row.custom}</Text>
          </View>
          <View style={styles.tableCellHighlight}>
            <Text style={styles.tableCellTextBold}>{row.bluecore}</Text>
          </View>
        </View>
      ))}
    </View>
    
    <View style={{ 
      marginTop: 20, 
      backgroundColor: colors.primaryDark,
      borderRadius: 12,
      padding: 16,
    }}>
      <Text style={{ fontSize: 11, fontWeight: 700, color: colors.white, textAlign: 'center' }}>
        Bluecore được thiết kế đặc biệt cho Retail & E-commerce Việt Nam — không cần tuỳ biến, sẵn sàng sử dụng ngay.
      </Text>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerText}>bluecore.vn</Text>
      <Text style={styles.pageNumber}>9 / 17</Text>
    </View>
  </Page>
);

const UseCasePage1 = () => (
  <Page size="A4" style={styles.page}>
    <Text style={styles.eyebrowLabel}>USE CASE 1</Text>
    <Text style={styles.sectionTitle}>{useCases[0].title}</Text>
    
    <View style={{ 
      backgroundColor: colors.backgroundAlt, 
      borderRadius: 12, 
      padding: 16, 
      marginBottom: 16,
      flexDirection: 'row',
      alignItems: 'center',
    }}>
      <View style={{ 
        backgroundColor: colors.primary, 
        paddingHorizontal: 12, 
        paddingVertical: 6, 
        borderRadius: 16, 
        marginRight: 12,
      }}>
        <Text style={{ fontSize: 9, fontWeight: 700, color: colors.white }}>{useCases[0].persona}</Text>
      </View>
      <Text style={{ fontSize: 9, color: colors.textLight }}>
        Modules: {useCases[0].modules.join(' + ')}
      </Text>
    </View>
    
    <View style={styles.useCaseContainer}>
      <Text style={{ fontSize: 11, fontWeight: 700, color: colors.primaryDark, marginBottom: 10 }}>Câu chuyện</Text>
      <Text style={styles.useCaseStory}>{useCases[0].story}</Text>
      
      <Text style={{ fontSize: 11, fontWeight: 700, color: colors.primaryDark, marginBottom: 10 }}>Kết quả</Text>
      <View style={styles.useCaseResult}>
        {useCases[0].results.map((result, index) => (
          <View key={index} style={styles.useCaseResultItem}>
            <Text style={{ fontSize: 9, color: colors.textLight, marginBottom: 4 }}>{result.label}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 10, color: colors.danger }}>{result.before}</Text>
              <Text style={{ fontSize: 10, color: colors.textLight }}>→</Text>
              <Text style={{ fontSize: 12, fontWeight: 700, color: colors.accent }}>{result.after}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerText}>bluecore.vn</Text>
      <Text style={styles.pageNumber}>10 / 17</Text>
    </View>
  </Page>
);

const UseCasePage2 = () => (
  <Page size="A4" style={styles.pageAlt}>
    <Text style={styles.eyebrowLabel}>USE CASE 2</Text>
    <Text style={styles.sectionTitle}>{useCases[1].title}</Text>
    
    <View style={{ 
      backgroundColor: colors.white, 
      borderRadius: 12, 
      padding: 16, 
      marginBottom: 16,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#e2e8f0',
    }}>
      <View style={{ 
        backgroundColor: colors.purple, 
        paddingHorizontal: 12, 
        paddingVertical: 6, 
        borderRadius: 16, 
        marginRight: 12,
      }}>
        <Text style={{ fontSize: 9, fontWeight: 700, color: colors.white }}>{useCases[1].persona}</Text>
      </View>
      <Text style={{ fontSize: 9, color: colors.textLight }}>
        Modules: {useCases[1].modules.join(' + ')}
      </Text>
    </View>
    
    <View style={[styles.useCaseContainer, { backgroundColor: colors.white }]}>
      <Text style={{ fontSize: 11, fontWeight: 700, color: colors.primaryDark, marginBottom: 10 }}>Câu chuyện</Text>
      <Text style={styles.useCaseStory}>{useCases[1].story}</Text>
      
      <Text style={{ fontSize: 11, fontWeight: 700, color: colors.primaryDark, marginBottom: 10 }}>Kết quả</Text>
      <View style={styles.useCaseResult}>
        {useCases[1].results.map((result, index) => (
          <View key={index} style={styles.useCaseResultItem}>
            <Text style={{ fontSize: 9, color: colors.textLight, marginBottom: 4 }}>{result.label}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 10, color: colors.danger }}>{result.before}</Text>
              <Text style={{ fontSize: 10, color: colors.textLight }}>→</Text>
              <Text style={{ fontSize: 12, fontWeight: 700, color: colors.accent }}>{result.after}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerText}>bluecore.vn</Text>
      <Text style={styles.pageNumber}>11 / 17</Text>
    </View>
  </Page>
);

const UseCasePage3 = () => (
  <Page size="A4" style={styles.page}>
    <Text style={styles.eyebrowLabel}>USE CASE 3</Text>
    <Text style={styles.sectionTitle}>{useCases[2].title}</Text>
    
    <View style={{ 
      backgroundColor: colors.backgroundAlt, 
      borderRadius: 12, 
      padding: 16, 
      marginBottom: 16,
      flexDirection: 'row',
      alignItems: 'center',
    }}>
      <View style={{ 
        backgroundColor: colors.warning, 
        paddingHorizontal: 12, 
        paddingVertical: 6, 
        borderRadius: 16, 
        marginRight: 12,
      }}>
        <Text style={{ fontSize: 9, fontWeight: 700, color: colors.white }}>{useCases[2].persona}</Text>
      </View>
      <Text style={{ fontSize: 9, color: colors.textLight }}>
        Modules: {useCases[2].modules.join(' + ')}
      </Text>
    </View>
    
    <View style={styles.useCaseContainer}>
      <Text style={{ fontSize: 11, fontWeight: 700, color: colors.primaryDark, marginBottom: 10 }}>Câu chuyện</Text>
      <Text style={styles.useCaseStory}>{useCases[2].story}</Text>
      
      <Text style={{ fontSize: 11, fontWeight: 700, color: colors.primaryDark, marginBottom: 10 }}>Kết quả</Text>
      <View style={styles.useCaseResult}>
        {useCases[2].results.map((result, index) => (
          <View key={index} style={styles.useCaseResultItem}>
            <Text style={{ fontSize: 9, color: colors.textLight, marginBottom: 4 }}>{result.label}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 10, color: colors.danger }}>{result.before}</Text>
              <Text style={{ fontSize: 10, color: colors.textLight }}>→</Text>
              <Text style={{ fontSize: 12, fontWeight: 700, color: colors.accent }}>{result.after}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerText}>bluecore.vn</Text>
      <Text style={styles.pageNumber}>12 / 17</Text>
    </View>
  </Page>
);

const UseCasePage4 = () => (
  <Page size="A4" style={styles.pageAlt}>
    <Text style={styles.eyebrowLabel}>USE CASE 4</Text>
    <Text style={styles.sectionTitle}>{useCases[3].title}</Text>
    
    <View style={{ 
      backgroundColor: colors.white, 
      borderRadius: 12, 
      padding: 16, 
      marginBottom: 16,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#e2e8f0',
    }}>
      <View style={{ 
        backgroundColor: colors.accent, 
        paddingHorizontal: 12, 
        paddingVertical: 6, 
        borderRadius: 16, 
        marginRight: 12,
      }}>
        <Text style={{ fontSize: 9, fontWeight: 700, color: colors.white }}>{useCases[3].persona}</Text>
      </View>
      <Text style={{ fontSize: 9, color: colors.textLight }}>
        Modules: {useCases[3].modules.join(' + ')}
      </Text>
    </View>
    
    <View style={[styles.useCaseContainer, { backgroundColor: colors.white }]}>
      <Text style={{ fontSize: 11, fontWeight: 700, color: colors.primaryDark, marginBottom: 10 }}>Câu chuyện</Text>
      <Text style={styles.useCaseStory}>{useCases[3].story}</Text>
      
      <Text style={{ fontSize: 11, fontWeight: 700, color: colors.primaryDark, marginBottom: 10 }}>Kết quả</Text>
      <View style={styles.useCaseResult}>
        {useCases[3].results.map((result, index) => (
          <View key={index} style={styles.useCaseResultItem}>
            <Text style={{ fontSize: 9, color: colors.textLight, marginBottom: 4 }}>{result.label}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 10, color: colors.danger }}>{result.before}</Text>
              <Text style={{ fontSize: 10, color: colors.textLight }}>→</Text>
              <Text style={{ fontSize: 12, fontWeight: 700, color: colors.accent }}>{result.after}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerText}>bluecore.vn</Text>
      <Text style={styles.pageNumber}>13 / 17</Text>
    </View>
  </Page>
);

const WhyBluecorePage = () => (
  <Page size="A4" style={styles.pageDark}>
    <Text style={styles.eyebrowLabelWhite}>TẠI SAO BLUECORE?</Text>
    <Text style={styles.sectionTitleWhite}>6 Lý Do Chọn Bluecore</Text>
    
    <View style={{ marginTop: 16, gap: 10 }}>
      <View style={styles.cardDark}>
        <Text style={styles.cardTitleWhite}>1. Thiết kế cho CEO/CFO, không phải Analyst</Text>
        <Text style={styles.cardTextWhite}>Không cần biết SQL. Không cần đợi report. Mở Bluecore = thấy ngay quyết định cần làm hôm nay.</Text>
      </View>
      
      <View style={styles.cardDark}>
        <Text style={styles.cardTitleWhite}>2. Native cho thị trường Việt Nam</Text>
        <Text style={styles.cardTextWhite}>35+ connectors có sẵn: Shopee, Lazada, TikTok, Haravan, Sapo, KiotViet. Không cần code, không cần IT.</Text>
      </View>
      
      <View style={styles.cardDark}>
        <Text style={styles.cardTitleWhite}>3. Financial Truth, không phải Performance Metrics</Text>
        <Text style={styles.cardTextWhite}>Profit ROAS thay vì Click ROAS. Real Cash thay vì Revenue on paper. Contribution Margin thay vì Gross Sales.</Text>
      </View>
      
      <View style={styles.cardDark}>
        <Text style={styles.cardTitleWhite}>4. Triển khai trong 1-2 tuần, không phải 6 tháng</Text>
        <Text style={styles.cardTextWhite}>Không cần project team riêng. Không cần thuê consultant. Bluecore team lo toàn bộ integration.</Text>
      </View>
      
      <View style={styles.cardDark}>
        <Text style={styles.cardTitleWhite}>5. Chi phí cố định, không "bất ngờ"</Text>
        <Text style={styles.cardTextWhite}>Không phí ẩn. Không charge theo user/data volume. Một giá — tất cả tính năng.</Text>
      </View>
      
      <View style={[styles.cardDark, { backgroundColor: 'rgba(239, 68, 68, 0.2)', borderColor: 'rgba(239, 68, 68, 0.4)' }]}>
        <Text style={[styles.cardTitleWhite, { color: '#fca5a5' }]}>6. Không dùng Bluecore = Quyết định trong bóng tối</Text>
        <Text style={styles.cardTextWhite}>Không biết tiền thật còn bao nhiêu. Không biết marketing đang lãi hay lỗ. Không biết khách hàng đang rời đi. Chờ cuối tháng mới biết — đã quá muộn.</Text>
      </View>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerTextWhite}>bluecore.vn</Text>
      <Text style={styles.pageNumberWhite}>14 / 17</Text>
    </View>
  </Page>
);

const ManifestoPage = () => (
  <Page size="A4" style={styles.page}>
    <Text style={styles.eyebrowLabel}>BLUECORE MANIFESTO</Text>
    <Text style={styles.sectionTitle}>10 Nguyên Tắc Bất Biến</Text>
    
    <View style={{ marginTop: 16 }}>
      {manifesto.map((item, index) => (
        <View key={index} style={styles.manifestoItem}>
          <View style={styles.manifestoNumber}>
            <Text style={styles.manifestoNumberText}>{index + 1}</Text>
          </View>
          <Text style={styles.manifestoText}>
            <Text style={styles.manifestoTextBold}>{item.title}:</Text> {item.desc}
          </Text>
        </View>
      ))}
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerText}>bluecore.vn</Text>
      <Text style={styles.pageNumber}>15 / 17</Text>
    </View>
  </Page>
);

const ArchitecturePage = () => (
  <Page size="A4" style={styles.pageAlt}>
    <Text style={styles.eyebrowLabel}>KIẾN TRÚC HỆ THỐNG</Text>
    <Text style={styles.sectionTitle}>Data Flow Architecture</Text>
    
    {/* Architecture Diagram */}
    <View style={{ 
      backgroundColor: colors.white, 
      borderRadius: 12, 
      padding: 24, 
      marginTop: 16,
      borderWidth: 1,
      borderColor: '#e2e8f0',
    }}>
      {/* Data Sources Row */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
        {['Shopee', 'Lazada', 'TikTok', 'ERP', 'Bank'].map((source, index) => (
          <View key={index} style={{ 
            backgroundColor: colors.backgroundAlt, 
            paddingHorizontal: 12, 
            paddingVertical: 8, 
            borderRadius: 8,
          }}>
            <Text style={{ fontSize: 9, color: colors.text }}>{source}</Text>
          </View>
        ))}
      </View>
      
      {/* Arrow */}
      <View style={{ alignItems: 'center', marginBottom: 16 }}>
        <Text style={{ fontSize: 20, color: colors.textLight }}>↓</Text>
        <Text style={{ fontSize: 9, color: colors.textLight }}>ETL Pipeline</Text>
      </View>
      
      {/* Data Warehouse */}
      <View style={{ 
        backgroundColor: colors.cyan, 
        borderRadius: 8, 
        padding: 16, 
        marginBottom: 16,
        alignItems: 'center',
      }}>
        <Text style={{ fontSize: 12, fontWeight: 700, color: colors.white }}>DATA WAREHOUSE</Text>
        <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>Single Source of Truth</Text>
      </View>
      
      {/* Arrow */}
      <View style={{ alignItems: 'center', marginBottom: 16 }}>
        <Text style={{ fontSize: 20, color: colors.textLight }}>↓</Text>
      </View>
      
      {/* Modules Row */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
        {[
          { name: 'FDP', color: colors.primary },
          { name: 'MDP', color: colors.purple },
          { name: 'CDP', color: colors.accent },
          { name: 'Control Tower', color: colors.warning },
        ].map((module, index) => (
          <View key={index} style={{ 
            flex: 1,
            backgroundColor: module.color, 
            borderRadius: 8, 
            padding: 12,
            alignItems: 'center',
          }}>
            <Text style={{ fontSize: 10, fontWeight: 700, color: colors.white }}>{module.name}</Text>
          </View>
        ))}
      </View>
    </View>
    
    <View style={{ 
      marginTop: 16, 
      backgroundColor: '#ecfdf5',
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: '#a7f3d0',
    }}>
      <Text style={{ fontSize: 11, fontWeight: 700, color: colors.accentDark, marginBottom: 8 }}>
        Tại sao kiến trúc này quan trọng?
      </Text>
      <Text style={{ fontSize: 10, color: colors.text, lineHeight: 1.5 }}>
        Tất cả các module (FDP, MDP, CDP, Control Tower) đều đọc từ cùng một Data Warehouse. Không có "phiên bản khác" của dữ liệu. CFO và CMO nhìn cùng một con số — không tranh cãi, không reconcile.
      </Text>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerText}>bluecore.vn</Text>
      <Text style={styles.pageNumber}>16 / 17</Text>
    </View>
  </Page>
);

const CTAPage = () => (
  <Page size="A4" style={styles.pageAccent}>
    <View style={[styles.coverOrnament, { width: 400, height: 400, top: -100, right: -150, opacity: 0.1 }]} />
    <View style={[styles.coverOrnament, { width: 500, height: 500, bottom: -200, left: -200, opacity: 0.05 }]} />
    
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 14, fontWeight: 700, color: colors.accent, letterSpacing: 2, marginBottom: 16 }}>
        TIẾP THEO
      </Text>
      
      <Text style={{ fontSize: 32, fontWeight: 700, color: colors.white, textAlign: 'center', marginBottom: 24 }}>
        Sẵn sàng để{'\n'}Ra Quyết định Tốt hơn?
      </Text>
      
      <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'center', maxWidth: 400, lineHeight: 1.6, marginBottom: 40 }}>
        Đặt lịch demo 30 phút để xem Bluecore hoạt động với dữ liệu thực của doanh nghiệp bạn.
      </Text>
      
      <View style={{ 
        backgroundColor: colors.accent,
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 8,
        marginBottom: 32,
      }}>
        <Text style={{ fontSize: 14, fontWeight: 700, color: colors.white }}>
          hello@bluecore.vn | bluecore.vn
        </Text>
      </View>
      
      <View style={{ flexDirection: 'row', gap: 40 }}>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 24, fontWeight: 700, color: colors.white }}>5</Text>
          <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>Modules</Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 24, fontWeight: 700, color: colors.white }}>35+</Text>
          <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>Connectors</Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 24, fontWeight: 700, color: colors.white }}>1-2</Text>
          <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>Tuần triển khai</Text>
        </View>
      </View>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerTextWhite}>© 2025 Bluecore</Text>
      <Text style={styles.pageNumberWhite}>17 / 17</Text>
    </View>
  </Page>
);

// ============= MAIN DOCUMENT =============

const FullSystemSalesDeckPDF: React.FC = () => {
  return (
    <Document
      title="Bluecore Full System Overview"
      author="Bluecore Vietnam"
      subject="Executive Decision Operating System for Retail & E-commerce"
      keywords="Bluecore, FDP, MDP, CDP, Control Tower, Data Warehouse, Retail, E-commerce, Vietnam"
    >
      <CoverPage />
      <PillarsPage />
      <HiddenCostPage />
      <EcosystemOverviewPage />
      <FDPDetailPage />
      <MDPDetailPage />
      <CDPControlTowerPage />
      <DataWarehousePage />
      <CompetitiveAdvantagesPage />
      <UseCasePage1 />
      <UseCasePage2 />
      <UseCasePage3 />
      <UseCasePage4 />
      <WhyBluecorePage />
      <ManifestoPage />
      <ArchitecturePage />
      <CTAPage />
    </Document>
  );
};

export default FullSystemSalesDeckPDF;
