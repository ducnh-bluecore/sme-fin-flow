/**
 * Full System Overview Sales Deck PDF Generator
 * 
 * STORYTELLING VERSION - 20 slides with narrative arc:
 * 1. Hook (The CEO's Morning Problem)
 * 2. Pain Amplification (Hidden Costs)
 * 3. Solution Introduction (Bluecore Ecosystem)
 * 4. Deep Dive (5 Modules with real screenshots)
 * 5. Proof (Use Cases as stories)
 * 6. Differentiation (vs. Competitors)
 * 7. Call to Action (ROI Guarantee)
 * 
 * Vietnamese content with proper diacritics
 */

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
} from '@react-pdf/renderer';

// Get base URL dynamically for font and image loading
const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
};

// Screenshot URLs (using public folder for PDF compatibility)
const screenshotUrls = {
  fdpDashboard: `${getBaseUrl()}/screenshots/cfo-dashboard.png`,
  fdpDecisionCard: `${getBaseUrl()}/screenshots/control-tower.png`,
  fdpScenario: `${getBaseUrl()}/screenshots/control-tower.png`,
  dwConnectors: `${getBaseUrl()}/screenshots/control-tower.png`,
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
    fontSize: 18,
    fontWeight: 400,
    color: colors.white,
    opacity: 0.9,
    textAlign: 'center',
    maxWidth: 480,
    lineHeight: 1.7,
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
    fontSize: 26,
    fontWeight: 700,
    color: colors.primaryDark,
    marginBottom: 12,
  },
  sectionTitleWhite: {
    fontSize: 26,
    fontWeight: 700,
    color: colors.white,
    marginBottom: 12,
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: 400,
    color: colors.textLight,
    marginBottom: 20,
    maxWidth: 500,
    lineHeight: 1.6,
  },
  
  // Cards & Containers
  cardRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  card: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardDark: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    flexDirection: 'column',
  },
  cardHighlight: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 10,
    padding: 16,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: colors.primaryDark,
    marginBottom: 6,
  },
  cardTitleWhite: {
    fontSize: 11,
    fontWeight: 700,
    color: colors.white,
    marginBottom: 4,
  },
  cardText: {
    fontSize: 10,
    color: colors.textLight,
    lineHeight: 1.5,
  },
  cardTextWhite: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 1.4,
  },
  
  // Narrative Story block
  storyBlock: {
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  storyText: {
    fontSize: 11,
    color: colors.text,
    lineHeight: 1.7,
  },
  storyQuote: {
    fontSize: 13,
    fontWeight: 700,
    color: colors.primaryDark,
    textAlign: 'center',
    marginBottom: 12,
  },
  
  // Modules grid
  moduleCard: {
    width: '48%',
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  moduleIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  moduleTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: colors.text,
    marginBottom: 3,
  },
  moduleTagline: {
    fontSize: 8,
    fontWeight: 700,
    color: colors.primary,
    marginBottom: 5,
  },
  moduleDesc: {
    fontSize: 8,
    color: colors.textLight,
    lineHeight: 1.4,
  },
  
  // Stats
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 700,
    color: colors.primary,
  },
  statNumberWhite: {
    fontSize: 32,
    fontWeight: 700,
    color: colors.white,
  },
  statLabel: {
    fontSize: 9,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: 4,
  },
  statLabelWhite: {
    fontSize: 9,
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
    padding: 8,
    backgroundColor: colors.primaryDark,
  },
  tableHeaderText: {
    fontSize: 8,
    fontWeight: 700,
    color: colors.white,
    textAlign: 'center',
  },
  tableCell: {
    flex: 1,
    padding: 8,
    backgroundColor: colors.white,
  },
  tableCellHighlight: {
    flex: 1,
    padding: 8,
    backgroundColor: '#ecfdf5',
  },
  tableCellText: {
    fontSize: 8,
    color: colors.text,
    textAlign: 'left',
    lineHeight: 1.3,
  },
  tableCellTextBold: {
    fontSize: 8,
    fontWeight: 700,
    color: colors.accentDark,
    textAlign: 'left',
    lineHeight: 1.3,
  },
  
  // Use case
  useCaseContainer: {
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  useCaseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  useCaseBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginRight: 10,
  },
  useCaseBadgeText: {
    fontSize: 8,
    fontWeight: 700,
    color: colors.white,
  },
  useCaseTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: colors.text,
  },
  useCaseStory: {
    fontSize: 10,
    color: colors.textLight,
    lineHeight: 1.6,
    marginBottom: 10,
  },
  useCaseResult: {
    flexDirection: 'row',
    gap: 12,
  },
  useCaseResultItem: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 6,
    padding: 10,
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
    marginBottom: 8,
    paddingLeft: 4,
  },
  manifestoNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  manifestoNumberText: {
    fontSize: 9,
    fontWeight: 700,
    color: colors.white,
  },
  manifestoText: {
    flex: 1,
    fontSize: 9,
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
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  pillarTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: colors.white,
    marginTop: 6,
    textAlign: 'center',
  },
  pillarDesc: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 1.4,
  },
  
  // Screenshot styles
  screenshotContainer: {
    marginVertical: 10,
    alignItems: 'center',
  },
  screenshot: {
    width: '100%',
    maxHeight: 180,
    objectFit: 'contain',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  screenshotHalf: {
    width: '100%',
    maxHeight: 130,
    objectFit: 'contain',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  screenshotCaption: {
    fontSize: 8,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 1.4,
  },
});

// ============= DATA CONSTANTS =============

const threePillars = [
  {
    title: 'REAL CASH',
    desc: 'Tiền thật đã về tài khoản, không phải doanh thu trên giấy',
    icon: '₫',
  },
  {
    title: 'TRUTH FIRST',
    desc: 'Sự thật tài chính, không làm đẹp số để báo cáo',
    icon: '✓',
  },
  {
    title: 'ACTION NOW',
    desc: 'Quyết định hôm nay, không đợi báo cáo cuối tháng',
    icon: '→',
  },
];

const platformModules = [
  {
    id: 'fdp',
    name: 'FDP',
    fullName: 'Financial Data Platform',
    tagline: 'Truth > Flexibility',
    color: colors.primary,
    description: 'Single Source of Truth cho Net Revenue, Contribution Margin, Real Cash.',
    features: ['CFO Dashboard', 'Unit Economics', 'Cash Flow', 'Working Capital'],
  },
  {
    id: 'mdp',
    name: 'MDP',
    fullName: 'Marketing Data Platform',
    tagline: 'Profit before Performance',
    color: colors.purple,
    description: 'Profit ROAS thay vì Click ROAS. Đo lường giá trị tài chính thật của Marketing.',
    features: ['Profit Attribution', 'Cash Impact', 'CAC Payback', 'Scale/Kill'],
  },
  {
    id: 'cdp',
    name: 'CDP',
    fullName: 'Customer Data Platform',
    tagline: 'Population > Individual',
    color: colors.accent,
    description: 'Sức khỏe tài chính của tập khách hàng - LTV Decay, Revenue at Risk.',
    features: ['Customer Equity', 'LTV Forecast', 'Cohort Analysis', 'At-Risk'],
  },
  {
    id: 'ct',
    name: 'Control Tower',
    fullName: 'Trung Tâm Điều Hành',
    tagline: 'Awareness before Analytics',
    color: colors.warning,
    description: 'Chỉ quan tâm "điều gì sai" với Impact VND, Deadline, Owner.',
    features: ['Max 7 Alerts', 'Impact VND', 'Auto-Escalation', 'Resolution'],
  },
  {
    id: 'dw',
    name: 'Financial Spine',
    fullName: 'Xương Sống Tài Chính',
    tagline: 'Không có Spine = Mỗi phòng 1 số',
    color: colors.cyan,
    description: '35+ connectors Việt Nam. Tất cả module đọc từ 1 nguồn duy nhất.',
    features: ['35+ Connectors', 'Real-time Sync', '1-2 Weeks Deploy'],
  },
];

// ROAS Illusion breakdown
const roasBreakdown = [
  { label: 'Gross Revenue', value: '100%', isPositive: true },
  { label: 'Platform fee (12%)', value: '-12%', isPositive: false },
  { label: 'COGS (45%)', value: '-45%', isPositive: false },
  { label: 'Shipping (8%)', value: '-8%', isPositive: false },
  { label: 'Returns (12%)', value: '-12%', isPositive: false },
  { label: 'Payment fee (3%)', value: '-3%', isPositive: false },
  { label: 'Profit', value: '20%', isPositive: true, isTotal: true },
];

// Competitor comparison
const competitiveComparisonNew = [
  {
    layer: 'Data Ingestion',
    bluecore: '35 native VN connectors, tự tạo Data Warehouse',
    elton: 'Cần Data Warehouse riêng + data engineer',
    pango: 'Cần tracking setup (pixel/API)',
  },
  {
    layer: 'Data Model',
    bluecore: 'Financial Truth đóng gói sẵn',
    elton: 'Raw data sạch, tự build logic (SQL)',
    pango: 'Customer Truth: 360° profile',
  },
  {
    layer: 'Output',
    bluecore: 'Alert có Owner/Deadline/Impact VND',
    elton: 'Dataset sạch → tự build BI',
    pango: 'Segments + automation',
  },
  {
    layer: 'Deployment',
    bluecore: '1-2 tuần live',
    elton: '3-6 tháng',
    pango: '2-3 tháng',
  },
  {
    layer: 'Chi phí',
    bluecore: '1.5-4 triệu/tháng',
    elton: '40tr/tháng + BigQuery',
    pango: 'Vài ngàn USD/tháng',
  },
];

// Pricing Plans
const pricingPlans = [
  { name: 'Marketing Plan', price: '1.5 triệu', period: '/tháng', desc: 'MDP focus', color: colors.purple },
  { name: 'Ecommerce Plan', price: '3 triệu', period: '/tháng', desc: 'FDP + MDP', color: colors.primary },
  { name: 'Combo CEO', price: '4 triệu', period: '/tháng', desc: 'Full 5 modules', color: colors.accent, featured: true },
];

// FDP Core Formulas
const fdpFormulas = [
  { name: 'Net Revenue', formula: 'Gross - Returns - Discounts - Platform Fees' },
  { name: 'Contribution Margin', formula: 'Net Revenue - COGS - Variable Costs' },
  { name: 'Real Cash', formula: 'Bank Balance - Payables - Locked + AR' },
];

const manifesto = [
  { title: 'SINGLE SOURCE OF TRUTH', desc: '1 Net Revenue, 1 Cash Position. Không có phiên bản khác.' },
  { title: 'REAL CASH', desc: 'Phân biệt: Tiền đã về / sẽ về / có nguy cơ không về.' },
  { title: 'REVENUE ↔ COST', desc: 'Mọi doanh thu đều đi kèm chi phí.' },
  { title: 'UNIT ECONOMICS → ACTION', desc: 'SKU lỗ + khóa cash → phải nói STOP.' },
  { title: 'TODAY\'S DECISION', desc: 'Phục vụ quyết định hôm nay.' },
  { title: 'SURFACE PROBLEMS', desc: 'Không làm đẹp số, chỉ ra vấn đề sớm.' },
  { title: 'AWARENESS BEFORE ANALYTICS', desc: 'Biết điều gì sai trước.' },
  { title: 'PROFIT BEFORE PERFORMANCE', desc: 'Lợi nhuận thật > metrics trên giấy.' },
  { title: 'POPULATION > INDIVIDUAL', desc: 'Sức khỏe tập khách hàng > CRM từng người.' },
  { title: 'FINAL TEST', desc: 'Không rõ ràng hơn = Bluecore thất bại.' },
];

// ============= PAGE COMPONENTS =============

// SLIDE 1: COVER - Hook with CEO story
const CoverPage = () => (
  <Page size="A4" style={styles.coverPage}>
    <View style={[styles.coverOrnament, { width: 600, height: 600, top: -200, right: -250 }]} />
    <View style={[styles.coverOrnament, { width: 700, height: 700, bottom: -300, left: -350, opacity: 0.05 }]} />
    
    <View style={styles.coverBadge}>
      <Text style={styles.coverBadgeText}>EXECUTIVE DECISION OS</Text>
    </View>
    
    <Text style={styles.coverTitle}>BLUECORE</Text>
    <Text style={styles.coverSubtitle}>
      Mỗi sáng, CEO phải hỏi: "Tiền thật còn bao nhiêu? Marketing đang lãi hay lỗ? 
      Khách hàng có đang rời đi?" — Bluecore trả lời trong 30 giây.
    </Text>
    <Text style={styles.coverTagline}>Truth &gt; Flexibility</Text>
    
    <View style={styles.footer}>
      <Text style={styles.footerTextWhite}>bluecore.vn</Text>
      <Text style={styles.pageNumberWhite}>1 / 20</Text>
    </View>
  </Page>
);

// SLIDE 2: THE CEO'S MORNING - Narrative story
const CEOMorningPage = () => (
  <Page size="A4" style={styles.page}>
    <Text style={[styles.eyebrowLabel, { color: colors.danger }]}>VẤN ĐỀ</Text>
    <Text style={styles.sectionTitle}>7:30 Sáng — Một Ngày Của CEO</Text>
    
    <View style={styles.storyBlock}>
      <Text style={styles.storyQuote}>"Tôi biết công ty tôi kiếm tiền, nhưng tôi không biết tiền ở đâu."</Text>
      <Text style={styles.storyText}>
        Anh Minh - CEO chuỗi thời trang 50 tỷ/năm - thức dậy và mở điện thoại. 
        CMO báo cáo ROAS 3.5x "thắng lớn". CFO nói margin đang giảm. 
        Kế toán chưa có số mới nhất. Anh có cuộc họp chiều nay để quyết định: 
        scale budget lên 2x hay dừng lại?
      </Text>
    </View>
    
    <Text style={{ fontSize: 11, fontWeight: 700, color: colors.primaryDark, marginBottom: 10 }}>
      Những câu hỏi không ai trả lời được:
    </Text>
    
    <View style={{ gap: 8 }}>
      {[
        'Tiền THẬT còn bao nhiêu? (không phải revenue, mà cash đã về)',
        'Marketing đang tạo PROFIT hay đốt tiền trong im lặng?',
        'Có bao nhiêu khách hàng đang rời đi mà chưa ai biết?',
        'SKU nào đang lỗ nhưng vẫn đang chạy quảng cáo?',
      ].map((q, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <Text style={{ fontSize: 12, color: colors.danger, marginRight: 8 }}>?</Text>
          <Text style={{ fontSize: 10, color: colors.text, flex: 1, lineHeight: 1.5 }}>{q}</Text>
        </View>
      ))}
    </View>
    
    <View style={{ 
      marginTop: 16, 
      backgroundColor: colors.danger,
      borderRadius: 10,
      padding: 14,
    }}>
      <Text style={{ fontSize: 11, fontWeight: 700, color: colors.white, textAlign: 'center' }}>
        Doanh nghiệp không chết vì thiếu tiền. 
        Doanh nghiệp chết vì KHÔNG BIẾT mình sắp hết tiền.
      </Text>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerText}>bluecore.vn</Text>
      <Text style={styles.pageNumber}>2 / 20</Text>
    </View>
  </Page>
);

// SLIDE 3: HIDDEN COSTS - Pain amplification with numbers
const HiddenCostPage = () => (
  <Page size="A4" style={styles.pageAlt}>
    <Text style={[styles.eyebrowLabel, { color: colors.danger }]}>CÁI GIÁ CỦA "KHÔNG BIẾT"</Text>
    <Text style={styles.sectionTitle}>Những Thiệt Hại Im Lặng</Text>
    
    <View style={{ gap: 10 }}>
      <View style={{ backgroundColor: '#fef2f2', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#fecaca' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
          <Text style={{ fontSize: 20, fontWeight: 700, color: colors.danger, marginRight: 10 }}>2.4 tỷ</Text>
          <Text style={{ fontSize: 10, color: colors.danger, fontWeight: 700 }}>VND/năm</Text>
        </View>
        <Text style={{ fontSize: 10, color: colors.text, lineHeight: 1.5 }}>
          Marketing báo "đang thắng" với ROAS 4.0x. Nhưng sau khi trừ phí sàn, COGS, shipping, returns — 
          Profit ROAS chỉ còn 0.9x. Mỗi đồng quảng cáo thực ra đang LỖ 10%.
        </Text>
      </View>
      
      <View style={{ backgroundColor: colors.white, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
          <Text style={{ fontSize: 20, fontWeight: 700, color: colors.warning, marginRight: 10 }}>800 triệu</Text>
          <Text style={{ fontSize: 10, color: colors.text, fontWeight: 700 }}>bad debt</Text>
        </View>
        <Text style={{ fontSize: 10, color: colors.text, lineHeight: 1.5 }}>
          AR quá hạn âm thầm tích lũy. Không ai theo dõi. Chỉ phát hiện khi kiểm toán cuối năm — 
          khách hàng đã phá sản, không thu hồi được.
        </Text>
      </View>
      
      <View style={{ backgroundColor: colors.white, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
          <Text style={{ fontSize: 20, fontWeight: 700, color: colors.primaryDark, marginRight: 10 }}>500 triệu</Text>
          <Text style={{ fontSize: 10, color: colors.text, fontWeight: 700 }}>hàng tồn</Text>
        </View>
        <Text style={{ fontSize: 10, color: colors.text, lineHeight: 1.5 }}>
          Sai lệch 2-3% Net Revenue → lệch quyết định tồn kho → mua thừa hàng không bán được. 
          Tiền bị "khóa" trong kho 6-12 tháng.
        </Text>
      </View>
      
      <View style={{ backgroundColor: colors.white, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
          <Text style={{ fontSize: 20, fontWeight: 700, color: colors.purple, marginRight: 10 }}>18-24%</Text>
          <Text style={{ fontSize: 10, color: colors.text, fontWeight: 700 }}>lãi vay nóng</Text>
        </View>
        <Text style={{ fontSize: 10, color: colors.text, lineHeight: 1.5 }}>
          Không thấy Cash Gap sớm → phát hiện thiếu tiền khi đã muộn → vay nóng với lãi suất cao. 
          Mất uy tín với nhà cung cấp.
        </Text>
      </View>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerText}>bluecore.vn</Text>
      <Text style={styles.pageNumber}>3 / 20</Text>
    </View>
  </Page>
);

// SLIDE 4: THE SOLUTION - Bluecore introduction
const SolutionIntroPage = () => (
  <Page size="A4" style={styles.pageDark}>
    <Text style={styles.eyebrowLabelWhite}>GIẢI PHÁP</Text>
    <Text style={styles.sectionTitleWhite}>Bluecore — Executive Decision OS</Text>
    
    <View style={{ flexDirection: 'row', gap: 14, marginTop: 24 }}>
      {threePillars.map((pillar, index) => (
        <View key={index} style={styles.pillarCard}>
          <View style={{ 
            width: 44, 
            height: 44, 
            borderRadius: 22, 
            backgroundColor: colors.accent,
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <Text style={{ fontSize: 16, fontWeight: 700, color: colors.white }}>{pillar.icon}</Text>
          </View>
          <Text style={styles.pillarTitle}>{pillar.title}</Text>
          <Text style={styles.pillarDesc}>{pillar.desc}</Text>
        </View>
      ))}
    </View>
    
    <View style={{ 
      marginTop: 24, 
      padding: 20, 
      backgroundColor: 'rgba(16, 185, 129, 0.15)',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: 'rgba(16, 185, 129, 0.3)',
    }}>
      <Text style={{ fontSize: 14, fontWeight: 700, color: colors.white, textAlign: 'center', marginBottom: 10 }}>
        "Bluecore không phải BI — không phải ERP"
      </Text>
      <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 1.6 }}>
        BI cho bạn biểu đồ. ERP cho bạn quy trình. 
        Bluecore cho bạn QUYẾT ĐỊNH — với dữ liệu tài chính thật, ngay lập tức.
      </Text>
    </View>
    
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 40, marginTop: 24 }}>
      <View style={{ alignItems: 'center' }}>
        <Text style={styles.statNumberWhite}>5</Text>
        <Text style={styles.statLabelWhite}>Modules</Text>
      </View>
      <View style={{ alignItems: 'center' }}>
        <Text style={styles.statNumberWhite}>35+</Text>
        <Text style={styles.statLabelWhite}>Connectors VN</Text>
      </View>
      <View style={{ alignItems: 'center' }}>
        <Text style={styles.statNumberWhite}>1-2</Text>
        <Text style={styles.statLabelWhite}>Tuần triển khai</Text>
      </View>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerTextWhite}>bluecore.vn</Text>
      <Text style={styles.pageNumberWhite}>4 / 20</Text>
    </View>
  </Page>
);

// SLIDE 5: ECOSYSTEM OVERVIEW
const EcosystemOverviewPage = () => (
  <Page size="A4" style={styles.page}>
    <Text style={styles.eyebrowLabel}>HỆ SINH THÁI</Text>
    <Text style={styles.sectionTitle}>5 Modules — 1 Sự Thật Tài Chính</Text>
    <Text style={styles.sectionSubtitle}>
      Mỗi module giải quyết một câu hỏi khác nhau, nhưng tất cả đều đọc từ cùng một nguồn sự thật.
    </Text>
    
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
      {platformModules.map((module) => (
        <View key={module.id} style={styles.moduleCard}>
          <View style={[styles.moduleIcon, { backgroundColor: `${module.color}20` }]}>
            <Text style={{ fontSize: 10, fontWeight: 700, color: module.color }}>{module.name}</Text>
          </View>
          <Text style={styles.moduleTitle}>{module.fullName}</Text>
          <Text style={styles.moduleTagline}>{module.tagline}</Text>
          <Text style={styles.moduleDesc}>{module.description}</Text>
        </View>
      ))}
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerText}>bluecore.vn</Text>
      <Text style={styles.pageNumber}>5 / 20</Text>
    </View>
  </Page>
);

// SLIDE 6: FDP DETAIL with screenshot
const FDPDetailPage = () => (
  <Page size="A4" style={styles.pageAlt}>
    <Text style={styles.eyebrowLabel}>MODULE 1: FDP</Text>
    <Text style={styles.sectionTitle}>Financial Data Platform</Text>
    
    {/* Screenshot */}
    <View style={styles.screenshotContainer}>
      <Image src={screenshotUrls.fdpDashboard} style={styles.screenshot} />
      <Text style={styles.screenshotCaption}>CFO Dashboard - Thanh khoản & Vị thế tiền mặt thời gian thực</Text>
    </View>
    
    {/* Core Formulas */}
    <View style={{ backgroundColor: '#f0f9ff', borderRadius: 8, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#bae6fd' }}>
      <Text style={{ fontSize: 10, fontWeight: 700, color: colors.primaryDark, marginBottom: 6 }}>3 Công thức Cốt lõi</Text>
      {fdpFormulas.map((item, index) => (
        <View key={index} style={{ flexDirection: 'row', marginBottom: 3 }}>
          <Text style={{ fontSize: 8, fontWeight: 700, color: colors.primary, width: 90 }}>{item.name}:</Text>
          <Text style={{ fontSize: 8, color: colors.text, flex: 1 }}>{item.formula}</Text>
        </View>
      ))}
    </View>
    
    <View style={styles.cardRow}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Real Cash Breakdown</Text>
        <Text style={styles.cardText}>Tiền đã về vs. sẽ về vs. có nguy cơ không về vs. đang bị khóa.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Unit Economics</Text>
        <Text style={styles.cardText}>Contribution Margin per SKU/Channel. Biết ngay sản phẩm nào đang lỗ.</Text>
      </View>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerText}>bluecore.vn</Text>
      <Text style={styles.pageNumber}>6 / 20</Text>
    </View>
  </Page>
);

// SLIDE 7: FDP DECISION CARDS
const FDPDecisionPage = () => (
  <Page size="A4" style={styles.page}>
    <Text style={styles.eyebrowLabel}>FDP TRONG HÀNH ĐỘNG</Text>
    <Text style={styles.sectionTitle}>Decision Cards & Scenario Planning</Text>
    
    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Image src={screenshotUrls.fdpDecisionCard} style={styles.screenshotHalf} />
        <Text style={styles.screenshotCaption}>Decision Card - Quyết định có Impact VND rõ ràng</Text>
      </View>
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Image src={screenshotUrls.fdpScenario} style={styles.screenshotHalf} />
        <Text style={styles.screenshotCaption}>Scenario Planning - Mô phỏng các kịch bản</Text>
      </View>
    </View>
    
    <View style={styles.storyBlock}>
      <Text style={styles.storyQuote}>"Thay vì đọc 10 trang báo cáo, tôi chỉ cần 1 Decision Card"</Text>
      <Text style={styles.storyText}>
        Decision Card cho bạn biết: Vấn đề gì? Mất bao nhiêu tiền? Ai chịu trách nhiệm? 
        Deadline xử lý? Không có thông tin thừa — chỉ có thông tin để hành động.
      </Text>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerText}>bluecore.vn</Text>
      <Text style={styles.pageNumber}>7 / 20</Text>
    </View>
  </Page>
);

// SLIDE 8: MDP & ROAS ILLUSION
const MDPROASPage = () => (
  <Page size="A4" style={styles.page}>
    <Text style={[styles.eyebrowLabel, { color: colors.purple }]}>MODULE 2: MDP</Text>
    <Text style={styles.sectionTitle}>The ROAS Illusion</Text>
    <Text style={styles.sectionSubtitle}>
      Marketing báo cáo ROAS 4.0x — nhưng thực tế đang LỖ TIỀN. Đây là lý do.
    </Text>
    
    {/* ROAS Comparison */}
    <View style={{ flexDirection: 'row', gap: 16, marginBottom: 16, alignItems: 'center' }}>
      <View style={{ flex: 1, backgroundColor: '#ecfdf5', borderRadius: 10, padding: 16, alignItems: 'center' }}>
        <Text style={{ fontSize: 9, color: colors.textLight, marginBottom: 4 }}>Reported ROAS</Text>
        <Text style={{ fontSize: 32, fontWeight: 700, color: colors.accent }}>4.0x</Text>
        <Text style={{ fontSize: 8, color: colors.textLight }}>Marketing "thắng lớn"</Text>
      </View>
      <View style={{ justifyContent: 'center' }}>
        <Text style={{ fontSize: 20, color: colors.textLight }}>→</Text>
      </View>
      <View style={{ flex: 1, backgroundColor: '#fef2f2', borderRadius: 10, padding: 16, alignItems: 'center' }}>
        <Text style={{ fontSize: 9, color: colors.textLight, marginBottom: 4 }}>Profit ROAS</Text>
        <Text style={{ fontSize: 32, fontWeight: 700, color: colors.danger }}>0.9x</Text>
        <Text style={{ fontSize: 8, color: colors.danger, fontWeight: 700 }}>LỖ TIỀN!</Text>
      </View>
    </View>
    
    {/* Breakdown */}
    <View style={{ backgroundColor: colors.white, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' }}>
      <Text style={{ fontSize: 10, fontWeight: 700, color: colors.primaryDark, marginBottom: 10 }}>Chi tiết (mỗi 100đ doanh thu)</Text>
      {roasBreakdown.map((item, index) => (
        <View key={index} style={[
          { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
          !item.isTotal ? { borderBottomWidth: 1, borderBottomColor: '#f1f5f9' } : {},
          item.isTotal ? { borderTopWidth: 2, borderTopColor: colors.primaryDark, marginTop: 4 } : {},
        ]}>
          <Text style={{ fontSize: 9, color: item.isTotal ? colors.primaryDark : colors.text, fontWeight: item.isTotal ? 700 : 400 }}>
            {item.label}
          </Text>
          <Text style={{ 
            fontSize: 9, fontWeight: 700, 
            color: item.isPositive ? (item.isTotal ? colors.accent : colors.text) : colors.danger,
          }}>
            {item.value}
          </Text>
        </View>
      ))}
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerText}>bluecore.vn</Text>
      <Text style={styles.pageNumber}>8 / 20</Text>
    </View>
  </Page>
);

// SLIDE 9: CDP & CONTROL TOWER
const CDPControlTowerPage = () => (
  <Page size="A4" style={styles.pageAlt}>
    <View style={{ flexDirection: 'row', gap: 16 }}>
      {/* CDP Column */}
      <View style={{ flex: 1 }}>
        <Text style={[styles.eyebrowLabel, { color: colors.accent }]}>MODULE 3: CDP</Text>
        <Text style={{ fontSize: 12, fontWeight: 700, color: colors.primaryDark, marginBottom: 8 }}>Customer Data Platform</Text>
        
        <View style={{ backgroundColor: colors.white, borderRadius: 8, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' }}>
          <Text style={{ fontSize: 10, fontWeight: 700, color: colors.text, marginBottom: 3 }}>Customer Equity</Text>
          <Text style={{ fontSize: 8, color: colors.textLight, lineHeight: 1.4 }}>
            LTV 12M, 24M Forecast. Tổng giá trị tài chính của tập khách hàng.
          </Text>
        </View>
        
        <View style={{ backgroundColor: colors.white, borderRadius: 8, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' }}>
          <Text style={{ fontSize: 10, fontWeight: 700, color: colors.text, marginBottom: 3 }}>LTV Decay Analysis</Text>
          <Text style={{ fontSize: 8, color: colors.textLight, lineHeight: 1.4 }}>
            Phát hiện cohort "chết" nhanh hơn bình thường. Báo động At-Risk Revenue.
          </Text>
        </View>
        
        <View style={{ backgroundColor: colors.white, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#e2e8f0' }}>
          <Text style={{ fontSize: 10, fontWeight: 700, color: colors.text, marginBottom: 3 }}>Revenue at Risk</Text>
          <Text style={{ fontSize: 8, color: colors.textLight, lineHeight: 1.4 }}>
            Bao nhiêu doanh thu có nguy cơ mất? Ai đang rời đi? Hành động gì?
          </Text>
        </View>
      </View>
      
      {/* Control Tower Column */}
      <View style={{ flex: 1 }}>
        <Text style={[styles.eyebrowLabel, { color: colors.warning }]}>MODULE 4: CONTROL TOWER</Text>
        <Text style={{ fontSize: 12, fontWeight: 700, color: colors.primaryDark, marginBottom: 8 }}>Trung Tâm Điều Hành</Text>
        
        <View style={{ backgroundColor: colors.white, borderRadius: 8, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' }}>
          <Text style={{ fontSize: 10, fontWeight: 700, color: colors.text, marginBottom: 3 }}>Max 7 Alerts</Text>
          <Text style={{ fontSize: 8, color: colors.textLight, lineHeight: 1.4 }}>
            Tại mọi thời điểm, chỉ hiển thị 7 vấn đề nguy hiểm nhất. Không spam.
          </Text>
        </View>
        
        <View style={{ backgroundColor: colors.white, borderRadius: 8, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' }}>
          <Text style={{ fontSize: 10, fontWeight: 700, color: colors.text, marginBottom: 3 }}>Impact + Deadline + Owner</Text>
          <Text style={{ fontSize: 8, color: colors.textLight, lineHeight: 1.4 }}>
            Mỗi alert phải trả lời: Mất bao nhiêu tiền? Ai xử lý? Còn bao lâu?
          </Text>
        </View>
        
        <View style={{ backgroundColor: colors.white, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#e2e8f0' }}>
          <Text style={{ fontSize: 10, fontWeight: 700, color: colors.text, marginBottom: 3 }}>Auto-Escalation</Text>
          <Text style={{ fontSize: 8, color: colors.textLight, lineHeight: 1.4 }}>
            Không xử lý kịp? Tự động leo thang lên cấp trên. Không ai "quên" alert.
          </Text>
        </View>
      </View>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerText}>bluecore.vn</Text>
      <Text style={styles.pageNumber}>9 / 20</Text>
    </View>
  </Page>
);

// SLIDE 10: FINANCIAL SPINE with screenshot
const FinancialSpinePage = () => (
  <Page size="A4" style={styles.page}>
    <Text style={[styles.eyebrowLabel, { color: colors.cyan }]}>MODULE 5: FINANCIAL SPINE</Text>
    <Text style={styles.sectionTitle}>Xương Sống Tài Chính</Text>
    
    <View style={styles.screenshotContainer}>
      <Image src={screenshotUrls.dwConnectors} style={styles.screenshot} />
      <Text style={styles.screenshotCaption}>35+ Native Connectors cho thị trường Việt Nam</Text>
    </View>
    
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
    
    <View style={{ marginTop: 12, backgroundColor: '#fef3c7', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#fcd34d' }}>
      <Text style={{ fontSize: 10, fontWeight: 700, color: '#92400e', textAlign: 'center' }}>
        Không có Financial Spine, mỗi phòng một con số. CFO và CMO tranh cãi vì nhìn số khác nhau.
      </Text>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerText}>bluecore.vn</Text>
      <Text style={styles.pageNumber}>10 / 20</Text>
    </View>
  </Page>
);

// SLIDE 11: USE CASE 1 - CEO Morning
const UseCase1Page = () => (
  <Page size="A4" style={styles.page}>
    <Text style={styles.eyebrowLabel}>CÂU CHUYỆN 1</Text>
    <Text style={styles.sectionTitle}>30 Giây Thay Vì 2 Tiếng</Text>
    
    <View style={{ backgroundColor: colors.backgroundAlt, borderRadius: 10, padding: 14, marginBottom: 14, flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, marginRight: 10 }}>
        <Text style={{ fontSize: 8, fontWeight: 700, color: colors.white }}>CEO Retail</Text>
      </View>
      <Text style={{ fontSize: 9, color: colors.textLight }}>Anh Minh - Chuỗi thời trang 50 tỷ/năm</Text>
    </View>
    
    <View style={styles.storyBlock}>
      <Text style={styles.storyText}>
        Mỗi sáng, Anh Minh mở Bluecore thay vì gọi kế toán. Trong 30 giây, anh thấy:
      </Text>
      <View style={{ marginTop: 10 }}>
        <Text style={{ fontSize: 10, color: colors.text, marginBottom: 4 }}>• Cash khả dụng: 1.2 tỷ VND</Text>
        <Text style={{ fontSize: 10, color: colors.text, marginBottom: 4 }}>• 3 đơn hàng lớn chưa thanh toán: 400 triệu</Text>
        <Text style={{ fontSize: 10, color: colors.danger, fontWeight: 700 }}>• 1 SKU đang lỗ 15% margin — cần dừng ngay</Text>
      </View>
    </View>
    
    <View style={styles.useCaseResult}>
      <View style={styles.useCaseResultItem}>
        <Text style={{ fontSize: 8, color: colors.textLight, marginBottom: 4 }}>Thời gian kiểm tra</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 10, color: colors.danger }}>2 tiếng</Text>
          <Text style={{ fontSize: 10, color: colors.textLight }}>→</Text>
          <Text style={{ fontSize: 12, fontWeight: 700, color: colors.accent }}>30 giây</Text>
        </View>
      </View>
      <View style={styles.useCaseResultItem}>
        <Text style={{ fontSize: 8, color: colors.textLight, marginBottom: 4 }}>Ra quyết định</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 10, color: colors.danger }}>Cuối tháng</Text>
          <Text style={{ fontSize: 10, color: colors.textLight }}>→</Text>
          <Text style={{ fontSize: 12, fontWeight: 700, color: colors.accent }}>Real-time</Text>
        </View>
      </View>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerText}>bluecore.vn</Text>
      <Text style={styles.pageNumber}>11 / 20</Text>
    </View>
  </Page>
);

// SLIDE 12: USE CASE 2 - CMO Budget
const UseCase2Page = () => (
  <Page size="A4" style={styles.pageAlt}>
    <Text style={styles.eyebrowLabel}>CÂU CHUYỆN 2</Text>
    <Text style={styles.sectionTitle}>Ngừng Đốt Tiền Trong Im Lặng</Text>
    
    <View style={{ backgroundColor: colors.white, borderRadius: 10, padding: 14, marginBottom: 14, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' }}>
      <View style={{ backgroundColor: colors.purple, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, marginRight: 10 }}>
        <Text style={{ fontSize: 8, fontWeight: 700, color: colors.white }}>CMO E-commerce</Text>
      </View>
      <Text style={{ fontSize: 9, color: colors.textLight }}>Chị Lan - Brand mỹ phẩm</Text>
    </View>
    
    <View style={styles.storyBlock}>
      <Text style={styles.storyText}>
        Chị Lan điều hành marketing với budget 500 triệu/tháng. Trước đây, chị chạy theo ROAS 3.5x 
        và nghĩ "đang thắng". MDP tiết lộ sự thật:
      </Text>
      <View style={{ marginTop: 10 }}>
        <Text style={{ fontSize: 10, color: colors.danger, fontWeight: 700, marginBottom: 4 }}>
          • Shopee Ads: Profit ROAS chỉ 0.8x (LỖ sau khi trừ phí sàn, shipping, return)
        </Text>
        <Text style={{ fontSize: 10, color: colors.accent, fontWeight: 700, marginBottom: 4 }}>
          • Meta Ads: Profit ROAS 2.1x (LÃI thật)
        </Text>
        <Text style={{ fontSize: 10, color: colors.accent, fontWeight: 700 }}>
          • Google Ads: Profit ROAS 1.8x (LÃI vừa)
        </Text>
      </View>
    </View>
    
    <View style={styles.useCaseResult}>
      <View style={styles.useCaseResultItem}>
        <Text style={{ fontSize: 8, color: colors.textLight, marginBottom: 4 }}>Profit ROAS visibility</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 10, color: colors.danger }}>0%</Text>
          <Text style={{ fontSize: 10, color: colors.textLight }}>→</Text>
          <Text style={{ fontSize: 12, fontWeight: 700, color: colors.accent }}>100%</Text>
        </View>
      </View>
      <View style={styles.useCaseResultItem}>
        <Text style={{ fontSize: 8, color: colors.textLight, marginBottom: 4 }}>Budget hiệu quả</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 10, color: colors.danger }}>50%</Text>
          <Text style={{ fontSize: 10, color: colors.textLight }}>→</Text>
          <Text style={{ fontSize: 12, fontWeight: 700, color: colors.accent }}>85%</Text>
        </View>
      </View>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerText}>bluecore.vn</Text>
      <Text style={styles.pageNumber}>12 / 20</Text>
    </View>
  </Page>
);

// SLIDE 13: USE CASE 3 - CFO Cash Gap
const UseCase3Page = () => (
  <Page size="A4" style={styles.page}>
    <Text style={styles.eyebrowLabel}>CÂU CHUYỆN 3</Text>
    <Text style={styles.sectionTitle}>Cảnh Báo 7 Ngày Trước Khủng Hoảng</Text>
    
    <View style={{ backgroundColor: colors.backgroundAlt, borderRadius: 10, padding: 14, marginBottom: 14, flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ backgroundColor: colors.warning, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, marginRight: 10 }}>
        <Text style={{ fontSize: 8, fontWeight: 700, color: colors.white }}>CFO FMCG</Text>
      </View>
      <Text style={{ fontSize: 9, color: colors.textLight }}>Anh Hùng - Công ty thực phẩm</Text>
    </View>
    
    <View style={styles.storyBlock}>
      <Text style={styles.storyText}>
        Control Tower phát hiện 3 tín hiệu cùng lúc:
      </Text>
      <View style={{ marginTop: 10 }}>
        <Text style={{ fontSize: 10, color: colors.danger, fontWeight: 700, marginBottom: 4 }}>
          • Settlement từ Shopee chậm 5 ngày so với bình thường
        </Text>
        <Text style={{ fontSize: 10, color: colors.danger, fontWeight: 700, marginBottom: 4 }}>
          • 3 đơn B2B tổng 800 triệu quá hạn thanh toán
        </Text>
        <Text style={{ fontSize: 10, color: colors.danger, fontWeight: 700 }}>
          • Dự báo Cash Gap: 1.1 tỷ VND trong 7 ngày tới
        </Text>
      </View>
      <Text style={{ fontSize: 10, color: colors.text, marginTop: 10, lineHeight: 1.5 }}>
        Anh Hùng có 7 ngày để xử lý: gọi nhắc nợ, đàm phán với nhà cung cấp, hoặc chuẩn bị vay bridge.
        Thay vì phát hiện khi đã muộn.
      </Text>
    </View>
    
    <View style={styles.useCaseResult}>
      <View style={styles.useCaseResultItem}>
        <Text style={{ fontSize: 8, color: colors.textLight, marginBottom: 4 }}>Phát hiện risk</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 10, color: colors.danger }}>Khi xảy ra</Text>
          <Text style={{ fontSize: 10, color: colors.textLight }}>→</Text>
          <Text style={{ fontSize: 12, fontWeight: 700, color: colors.accent }}>7 ngày trước</Text>
        </View>
      </View>
      <View style={styles.useCaseResultItem}>
        <Text style={{ fontSize: 8, color: colors.textLight, marginBottom: 4 }}>Cash gap avoided</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 12, fontWeight: 700, color: colors.accent }}>1.1 tỷ VND</Text>
        </View>
      </View>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerText}>bluecore.vn</Text>
      <Text style={styles.pageNumber}>13 / 20</Text>
    </View>
  </Page>
);

// SLIDE 14: USE CASE 4 - Customer Health
const UseCase4Page = () => (
  <Page size="A4" style={styles.pageAlt}>
    <Text style={styles.eyebrowLabel}>CÂU CHUYỆN 4</Text>
    <Text style={styles.sectionTitle}>Bảo Vệ 2 Tỷ Revenue At Risk</Text>
    
    <View style={{ backgroundColor: colors.white, borderRadius: 10, padding: 14, marginBottom: 14, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' }}>
      <View style={{ backgroundColor: colors.accent, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, marginRight: 10 }}>
        <Text style={{ fontSize: 8, fontWeight: 700, color: colors.white }}>Founder D2C</Text>
      </View>
      <Text style={{ fontSize: 9, color: colors.textLight }}>Tuấn - Startup D2C beauty</Text>
    </View>
    
    <View style={styles.storyBlock}>
      <Text style={styles.storyText}>
        CDP phát hiện vấn đề nghiêm trọng:
      </Text>
      <View style={{ marginTop: 10 }}>
        <Text style={{ fontSize: 10, color: colors.danger, fontWeight: 700, marginBottom: 4 }}>
          • Cohort Q1/2024 có LTV decay 40% sau 6 tháng — nhanh 2x so với cohort cũ
        </Text>
        <Text style={{ fontSize: 10, color: colors.danger, fontWeight: 700, marginBottom: 4 }}>
          • At-Risk Revenue: 2 tỷ VND
        </Text>
        <Text style={{ fontSize: 10, color: colors.accent, fontWeight: 700 }}>
          • Root cause: Sản phẩm mới không match với kỳ vọng từ quảng cáo
        </Text>
      </View>
      <Text style={{ fontSize: 10, color: colors.text, marginTop: 10, lineHeight: 1.5 }}>
        Tuấn điều chỉnh message quảng cáo và retention campaign. Kết quả: giữ lại 1.2 tỷ revenue.
      </Text>
    </View>
    
    <View style={styles.useCaseResult}>
      <View style={styles.useCaseResultItem}>
        <Text style={{ fontSize: 8, color: colors.textLight, marginBottom: 4 }}>Churn visibility</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 10, color: colors.danger }}>Quarterly</Text>
          <Text style={{ fontSize: 10, color: colors.textLight }}>→</Text>
          <Text style={{ fontSize: 12, fontWeight: 700, color: colors.accent }}>Weekly</Text>
        </View>
      </View>
      <View style={styles.useCaseResultItem}>
        <Text style={{ fontSize: 8, color: colors.textLight, marginBottom: 4 }}>Revenue bảo vệ</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 12, fontWeight: 700, color: colors.accent }}>1.2 tỷ VND</Text>
        </View>
      </View>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerText}>bluecore.vn</Text>
      <Text style={styles.pageNumber}>14 / 20</Text>
    </View>
  </Page>
);

// SLIDE 15: COMPETITIVE COMPARISON
const CompetitivePage = () => (
  <Page size="A4" style={styles.page}>
    <Text style={styles.eyebrowLabel}>SO SÁNH</Text>
    <Text style={styles.sectionTitle}>Bluecore vs. Elton Data vs. PangoCDP</Text>
    
    <View style={{ borderRadius: 10, overflow: 'hidden', marginTop: 8 }}>
      {/* Header */}
      <View style={styles.tableRow}>
        <View style={[styles.tableHeader, { flex: 1 }]}>
          <Text style={styles.tableHeaderText}>Layer</Text>
        </View>
        <View style={[styles.tableHeader, { backgroundColor: colors.accentDark, flex: 1.5 }]}>
          <Text style={styles.tableHeaderText}>Bluecore</Text>
        </View>
        <View style={[styles.tableHeader, { flex: 1.3 }]}>
          <Text style={styles.tableHeaderText}>Elton Data</Text>
        </View>
        <View style={[styles.tableHeader, { flex: 1.3 }]}>
          <Text style={styles.tableHeaderText}>PangoCDP</Text>
        </View>
      </View>
      
      {/* Rows */}
      {competitiveComparisonNew.map((row, index) => (
        <View key={index} style={styles.tableRow}>
          <View style={[styles.tableCell, { flex: 1 }]}>
            <Text style={[styles.tableCellText, { fontWeight: 700 }]}>{row.layer}</Text>
          </View>
          <View style={[styles.tableCellHighlight, { flex: 1.5 }]}>
            <Text style={styles.tableCellTextBold}>{row.bluecore}</Text>
          </View>
          <View style={[styles.tableCell, { flex: 1.3 }]}>
            <Text style={styles.tableCellText}>{row.elton}</Text>
          </View>
          <View style={[styles.tableCell, { flex: 1.3 }]}>
            <Text style={styles.tableCellText}>{row.pango}</Text>
          </View>
        </View>
      ))}
    </View>
    
    <View style={{ marginTop: 14, backgroundColor: colors.primaryDark, borderRadius: 10, padding: 12 }}>
      <Text style={{ fontSize: 10, fontWeight: 700, color: colors.white, textAlign: 'center' }}>
        Bluecore: Financial Truth đóng gói sẵn — không cần data engineer, không cần 6 tháng build.
      </Text>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerText}>bluecore.vn</Text>
      <Text style={styles.pageNumber}>15 / 20</Text>
    </View>
  </Page>
);

// SLIDE 16: WHY BLUECORE
const WhyBluecorePage = () => (
  <Page size="A4" style={styles.pageDark}>
    <Text style={styles.eyebrowLabelWhite}>TẠI SAO CHỌN BLUECORE?</Text>
    <Text style={styles.sectionTitleWhite}>6 Lý Do</Text>
    
    <View style={{ gap: 8, marginTop: 16 }}>
      <View style={styles.cardDark}>
        <Text style={styles.cardTitleWhite}>1. Financial Truth, không phải Performance Metrics</Text>
        <Text style={styles.cardTextWhite}>Profit ROAS thay vì Click ROAS. Real Cash thay vì Revenue on paper.</Text>
      </View>
      
      <View style={styles.cardDark}>
        <Text style={styles.cardTitleWhite}>2. Decisions, không phải Dashboards</Text>
        <Text style={styles.cardTextWhite}>Mỗi alert đều có Impact VND, Owner, Deadline. Không có thông tin thừa.</Text>
      </View>
      
      <View style={styles.cardDark}>
        <Text style={styles.cardTitleWhite}>3. 1-2 tuần triển khai, không phải 6 tháng</Text>
        <Text style={styles.cardTextWhite}>35+ connectors có sẵn. Bluecore team lo toàn bộ integration.</Text>
      </View>
      
      <View style={styles.cardDark}>
        <Text style={styles.cardTitleWhite}>4. Chi phí cố định, không "bất ngờ"</Text>
        <Text style={styles.cardTextWhite}>Không phí ẩn. Không charge theo user/data volume.</Text>
      </View>
      
      <View style={styles.cardDark}>
        <Text style={styles.cardTitleWhite}>5. Made for Vietnam</Text>
        <Text style={styles.cardTextWhite}>Shopee, Lazada, TikTok Shop, MISA, Haravan — đều có connector sẵn.</Text>
      </View>
      
      <View style={[styles.cardDark, { backgroundColor: 'rgba(239, 68, 68, 0.2)', borderColor: 'rgba(239, 68, 68, 0.4)' }]}>
        <Text style={[styles.cardTitleWhite, { color: '#fca5a5' }]}>6. Không dùng = Quyết định trong bóng tối</Text>
        <Text style={styles.cardTextWhite}>Không biết tiền thật, marketing lãi/lỗ, khách hàng rời đi. Chờ cuối tháng — đã quá muộn.</Text>
      </View>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerTextWhite}>bluecore.vn</Text>
      <Text style={styles.pageNumberWhite}>16 / 20</Text>
    </View>
  </Page>
);

// SLIDE 17: PRICING & ROI
const PricingROIPage = () => (
  <Page size="A4" style={styles.page}>
    <Text style={styles.eyebrowLabel}>CHI PHÍ & ROI</Text>
    <Text style={styles.sectionTitle}>Giá Minh Bạch, ROI Bảo Đảm</Text>
    
    {/* Pricing Cards */}
    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
      {pricingPlans.map((plan, index) => (
        <View key={index} style={{ 
          flex: 1, 
          backgroundColor: plan.featured ? plan.color : colors.white, 
          borderRadius: 10, 
          padding: 14,
          borderWidth: plan.featured ? 0 : 1,
          borderColor: '#e2e8f0',
          alignItems: 'center',
        }}>
          <Text style={{ fontSize: 9, color: plan.featured ? 'rgba(255,255,255,0.8)' : colors.textLight, marginBottom: 4 }}>
            {plan.name}
          </Text>
          <Text style={{ fontSize: 18, fontWeight: 700, color: plan.featured ? colors.white : colors.primaryDark }}>
            {plan.price}
          </Text>
          <Text style={{ fontSize: 9, color: plan.featured ? 'rgba(255,255,255,0.8)' : colors.textLight }}>
            {plan.period}
          </Text>
          <Text style={{ fontSize: 8, color: plan.featured ? 'rgba(255,255,255,0.7)' : colors.textLight, marginTop: 6, textAlign: 'center' }}>
            {plan.desc}
          </Text>
        </View>
      ))}
    </View>
    
    {/* Setup Fee */}
    <View style={{ backgroundColor: colors.backgroundAlt, borderRadius: 8, padding: 10, marginBottom: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text style={{ fontSize: 9, color: colors.text }}>Setup BigQuery Data Warehouse (1 lần)</Text>
      <Text style={{ fontSize: 11, fontWeight: 700, color: colors.primaryDark }}>40 triệu VND</Text>
    </View>
    
    {/* ROI Guarantee */}
    <View style={{ backgroundColor: '#ecfdf5', borderRadius: 10, padding: 16, borderWidth: 2, borderColor: colors.accent, marginBottom: 12 }}>
      <Text style={{ fontSize: 12, fontWeight: 700, color: colors.accentDark, textAlign: 'center', marginBottom: 6 }}>
        ROI BẢO ĐẢM
      </Text>
      <Text style={{ fontSize: 20, fontWeight: 700, color: colors.accent, textAlign: 'center', marginBottom: 6 }}>
        Tối thiểu 3 TỶ VND giá trị
      </Text>
      <Text style={{ fontSize: 10, color: colors.text, textAlign: 'center', marginBottom: 10 }}>
        trong tháng đầu tiên sử dụng
      </Text>
      <View style={{ backgroundColor: colors.white, borderRadius: 6, padding: 10 }}>
        <Text style={{ fontSize: 10, fontWeight: 700, color: colors.danger, textAlign: 'center' }}>
          Không tìm thấy giá trị? → HOÀN TIỀN 100%
        </Text>
      </View>
    </View>
    
    {/* Trial Badge */}
    <View style={{ backgroundColor: colors.primary, borderRadius: 8, padding: 12, alignItems: 'center' }}>
      <Text style={{ fontSize: 11, fontWeight: 700, color: colors.white }}>
        ⚡ Trial 14 ngày miễn phí — Không cần thẻ tín dụng
      </Text>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerText}>bluecore.vn</Text>
      <Text style={styles.pageNumber}>17 / 20</Text>
    </View>
  </Page>
);

// SLIDE 18: MANIFESTO
const ManifestoPage = () => (
  <Page size="A4" style={styles.pageAlt}>
    <Text style={styles.eyebrowLabel}>BLUECORE MANIFESTO</Text>
    <Text style={styles.sectionTitle}>10 Nguyên Tắc Bất Biến</Text>
    
    <View style={{ marginTop: 12 }}>
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
      <Text style={styles.pageNumber}>18 / 20</Text>
    </View>
  </Page>
);

// SLIDE 19: ARCHITECTURE
const ArchitecturePage = () => (
  <Page size="A4" style={styles.page}>
    <Text style={styles.eyebrowLabel}>KIẾN TRÚC</Text>
    <Text style={styles.sectionTitle}>Data Flow Architecture</Text>
    
    <View style={{ backgroundColor: colors.white, borderRadius: 10, padding: 20, marginTop: 12, borderWidth: 1, borderColor: '#e2e8f0' }}>
      {/* Data Sources Row */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 14 }}>
        {['Shopee', 'Lazada', 'TikTok', 'ERP', 'Bank'].map((source, index) => (
          <View key={index} style={{ backgroundColor: colors.backgroundAlt, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 }}>
            <Text style={{ fontSize: 8, color: colors.text }}>{source}</Text>
          </View>
        ))}
      </View>
      
      {/* Arrow */}
      <View style={{ alignItems: 'center', marginBottom: 14 }}>
        <Text style={{ fontSize: 18, color: colors.textLight }}>↓</Text>
        <Text style={{ fontSize: 8, color: colors.textLight }}>ETL Pipeline (35+ Connectors)</Text>
      </View>
      
      {/* Data Warehouse */}
      <View style={{ backgroundColor: colors.cyan, borderRadius: 8, padding: 14, marginBottom: 14, alignItems: 'center' }}>
        <Text style={{ fontSize: 11, fontWeight: 700, color: colors.white }}>DATA WAREHOUSE</Text>
        <Text style={{ fontSize: 8, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>Single Source of Truth</Text>
      </View>
      
      {/* Arrow */}
      <View style={{ alignItems: 'center', marginBottom: 14 }}>
        <Text style={{ fontSize: 18, color: colors.textLight }}>↓</Text>
      </View>
      
      {/* Modules Row */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 6 }}>
        {[
          { name: 'FDP', color: colors.primary },
          { name: 'MDP', color: colors.purple },
          { name: 'CDP', color: colors.accent },
          { name: 'Control Tower', color: colors.warning },
        ].map((module, index) => (
          <View key={index} style={{ flex: 1, backgroundColor: module.color, borderRadius: 6, padding: 10, alignItems: 'center' }}>
            <Text style={{ fontSize: 9, fontWeight: 700, color: colors.white }}>{module.name}</Text>
          </View>
        ))}
      </View>
    </View>
    
    <View style={{ marginTop: 14, backgroundColor: '#ecfdf5', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#a7f3d0' }}>
      <Text style={{ fontSize: 10, fontWeight: 700, color: colors.accentDark, marginBottom: 4 }}>
        Tại sao kiến trúc này quan trọng?
      </Text>
      <Text style={{ fontSize: 9, color: colors.text, lineHeight: 1.5 }}>
        Tất cả các module đều đọc từ cùng một Data Warehouse. CFO và CMO nhìn cùng một con số — 
        không tranh cãi, không reconcile.
      </Text>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerText}>bluecore.vn</Text>
      <Text style={styles.pageNumber}>19 / 20</Text>
    </View>
  </Page>
);

// SLIDE 20: CTA
const CTAPage = () => (
  <Page size="A4" style={styles.pageAccent}>
    <View style={[styles.coverOrnament, { width: 400, height: 400, top: -100, right: -150, opacity: 0.1 }]} />
    <View style={[styles.coverOrnament, { width: 500, height: 500, bottom: -200, left: -200, opacity: 0.05 }]} />
    
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 12, fontWeight: 700, color: colors.accent, letterSpacing: 2, marginBottom: 14 }}>
        BẮT ĐẦU NGAY
      </Text>
      
      <Text style={{ fontSize: 28, fontWeight: 700, color: colors.white, textAlign: 'center', marginBottom: 20 }}>
        Sẵn sàng để{'\n'}Ra Quyết định Tốt hơn?
      </Text>
      
      <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', textAlign: 'center', maxWidth: 400, lineHeight: 1.6, marginBottom: 20 }}>
        Demo 30 phút với dữ liệu thực của doanh nghiệp bạn.
      </Text>
      
      {/* Trial Badge */}
      <View style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', borderWidth: 1, borderColor: colors.accent, borderRadius: 8, paddingHorizontal: 18, paddingVertical: 8, marginBottom: 20 }}>
        <Text style={{ fontSize: 11, fontWeight: 700, color: colors.accent }}>
          ⚡ Trial 14 ngày miễn phí
        </Text>
      </View>
      
      <View style={{ backgroundColor: colors.accent, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 8, marginBottom: 14 }}>
        <Text style={{ fontSize: 12, fontWeight: 700, color: colors.white }}>
          hellobluecore.vn
        </Text>
      </View>
      
      <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', marginBottom: 24 }}>
        hello@bluecore.vn | +84 xxx xxx xxx
      </Text>
      
      {/* ROI Guarantee Badge */}
      <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 20 }}>
        <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.9)', textAlign: 'center' }}>
          💰 ROI Guarantee: 3 tỷ VND giá trị hoặc hoàn tiền 100%
        </Text>
      </View>
      
      <View style={{ flexDirection: 'row', gap: 32 }}>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: 700, color: colors.white }}>5</Text>
          <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)' }}>Modules</Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: 700, color: colors.white }}>35+</Text>
          <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)' }}>Connectors</Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: 700, color: colors.white }}>1-2</Text>
          <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)' }}>Tuần deploy</Text>
        </View>
      </View>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerTextWhite}>© 2025 Bluecore</Text>
      <Text style={styles.pageNumberWhite}>20 / 20</Text>
    </View>
  </Page>
);

// ============= MAIN DOCUMENT =============

const FullSystemSalesDeckPDF: React.FC = () => {
  return (
    <Document
      title="Bluecore Full System Overview - Storytelling Edition"
      author="Bluecore Vietnam"
      subject="Executive Decision Operating System for Retail & E-commerce"
      keywords="Bluecore, FDP, MDP, CDP, Control Tower, Data Warehouse, Retail, E-commerce, Vietnam"
    >
      <CoverPage />
      <CEOMorningPage />
      <HiddenCostPage />
      <SolutionIntroPage />
      <EcosystemOverviewPage />
      <FDPDetailPage />
      <FDPDecisionPage />
      <MDPROASPage />
      <CDPControlTowerPage />
      <FinancialSpinePage />
      <UseCase1Page />
      <UseCase2Page />
      <UseCase3Page />
      <UseCase4Page />
      <CompetitivePage />
      <WhyBluecorePage />
      <PricingROIPage />
      <ManifestoPage />
      <ArchitecturePage />
      <CTAPage />
    </Document>
  );
};

export default FullSystemSalesDeckPDF;
