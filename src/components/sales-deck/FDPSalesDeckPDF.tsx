/**
 * FDP Sales Deck PDF Generator
 * 
 * Generates a professional PDF sales deck for the Financial Data Platform
 * using @react-pdf/renderer
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

// Register Noto Sans font (supports Vietnamese characters) with absolute URLs
Font.register({
  family: 'NotoSans',
  fonts: [
    { src: `${getBaseUrl()}/fonts/NotoSans-Regular.ttf`, fontWeight: 400 },
    { src: `${getBaseUrl()}/fonts/NotoSans-Bold.ttf`, fontWeight: 700 },
  ],
});

// Brand colors
const colors = {
  primary: '#3b82f6',      // Blue
  primaryDark: '#1e40af',  // Dark blue
  accent: '#10b981',       // Green
  warning: '#f59e0b',      // Amber
  danger: '#ef4444',       // Red
  text: '#1f2937',         // Gray 800
  textLight: '#6b7280',    // Gray 500
  background: '#f8fafc',   // Slate 50
  backgroundAlt: '#e0f2fe', // Sky 100
  white: '#ffffff',
  black: '#000000',
};

// Styles - Using Noto Sans font (supports Vietnamese)
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'NotoSans',
    backgroundColor: colors.white,
  },
  pageAlt: {
    padding: 40,
    fontFamily: 'NotoSans',
    backgroundColor: colors.background,
  },
  coverPage: {
    padding: 60,
    fontFamily: 'NotoSans',
    backgroundColor: colors.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  coverTitle: {
    fontSize: 48,
    fontWeight: 700,
    color: colors.white,
    marginBottom: 16,
    textAlign: 'center',
  },
  coverSubtitle: {
    fontSize: 18,
    color: colors.white,
    opacity: 0.9,
    textAlign: 'center',
    maxWidth: 400,
    lineHeight: 1.5,
  },
  coverBadge: {
    marginTop: 40,
    backgroundColor: colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  coverBadgeText: {
    fontSize: 14,
    fontWeight: 700,
    color: colors.white,
  },

  // Cover ornaments (to avoid a flat single-color slide)
  coverOrnament: {
    position: 'absolute',
    borderRadius: 9999,
    opacity: 0.18,
    backgroundColor: colors.white,
  },
  coverCircle1: {
    width: 420,
    height: 420,
    top: -140,
    right: -180,
  },
  coverCircle2: {
    width: 520,
    height: 520,
    bottom: -220,
    left: -260,
    opacity: 0.12,
  },
  coverCircle3: {
    width: 200,
    height: 200,
    bottom: 100,
    right: 60,
    opacity: 0.08,
  },
  
  // Section styles
  sectionTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: colors.primaryDark,
    marginBottom: 20,
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: 30,
    maxWidth: 400,
    alignSelf: 'center',
  },
  
  // Manifesto styles
  manifestoContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  manifestoItem: {
    width: '48%',
    backgroundColor: colors.background,
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeft: `3px solid ${colors.primary}`,
  },
  manifestoNumber: {
    fontSize: 12,
    fontWeight: 700,
    color: colors.primary,
    marginBottom: 4,
  },
  manifestoTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: colors.text,
    marginBottom: 4,
  },
  manifestoDesc: {
    fontSize: 9,
    color: colors.textLight,
    lineHeight: 1.4,
  },
  
  // Capability styles
  capabilityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  capabilityCard: {
    width: '48%',
    backgroundColor: colors.background,
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  capabilityCardAlt: {
    width: '48%',
    backgroundColor: colors.backgroundAlt,
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  // Badge icon style (replaces emoji)
  capabilityIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  capabilityIconText: {
    fontSize: 16,
    fontWeight: 700,
    color: colors.white,
  },
  capabilityTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: colors.text,
    marginBottom: 8,
  },
  capabilityDesc: {
    fontSize: 10,
    color: colors.textLight,
    lineHeight: 1.5,
  },
  capabilityFeatures: {
    marginTop: 12,
  },
  capabilityFeature: {
    fontSize: 9,
    color: colors.text,
    marginBottom: 4,
    paddingLeft: 12,
  },
  
  // Feature list styles
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 16,
  },
  featureColumn: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
    borderRadius: 12,
  },
  featureColumnAlt: {
    flex: 1,
    backgroundColor: colors.backgroundAlt,
    padding: 20,
    borderRadius: 12,
  },
  featureColumnTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: colors.primaryDark,
    marginBottom: 12,
    borderBottom: `2px solid ${colors.primary}`,
    paddingBottom: 8,
  },
  featureItem: {
    fontSize: 10,
    color: colors.text,
    marginBottom: 8,
    paddingLeft: 8,
  },
  
  // Decision flow styles
  decisionFlow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  decisionStep: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
  },
  decisionStepCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  decisionStepNumber: {
    fontSize: 18,
    fontWeight: 700,
    color: colors.white,
  },
  decisionStepTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: colors.text,
    textAlign: 'center',
  },
  decisionStepDesc: {
    fontSize: 9,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: 4,
  },
  decisionArrow: {
    fontSize: 18,
    color: colors.primary,
    marginHorizontal: 8,
  },
  
  // Use case styles
  useCaseBox: {
    backgroundColor: colors.primaryDark,
    padding: 24,
    borderRadius: 12,
    marginBottom: 20,
  },
  useCaseTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: colors.white,
    marginBottom: 8,
  },
  useCaseValue: {
    fontSize: 32,
    fontWeight: 700,
    color: colors.accent,
    marginBottom: 8,
  },
  useCaseDesc: {
    fontSize: 11,
    color: colors.white,
    opacity: 0.9,
  },
  useCaseMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  useCaseMetric: {
    alignItems: 'center',
  },
  useCaseMetricValue: {
    fontSize: 18,
    fontWeight: 700,
    color: colors.white,
  },
  useCaseMetricLabel: {
    fontSize: 9,
    color: colors.white,
    opacity: 0.8,
    marginTop: 4,
  },
  
  // Why Bluecore page styles
  whyContainer: {
    flexDirection: 'column',
    gap: 12,
  },
  whyRow: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 10,
  },
  whyPainColumn: {
    flex: 1,
    backgroundColor: '#fee2e2', // Red 100
    padding: 14,
    borderRight: '2px solid #fecaca',
  },
  whySolutionColumn: {
    flex: 1,
    backgroundColor: '#dcfce7', // Green 100
    padding: 14,
  },
  whyPainTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: colors.danger,
    marginBottom: 4,
  },
  whyPainDesc: {
    fontSize: 9,
    color: colors.text,
  },
  whySolutionTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: colors.accent,
    marginBottom: 4,
  },
  whySolutionDesc: {
    fontSize: 9,
    color: colors.text,
  },
  
  // Comparison table styles
  compTable: {
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    border: '1px solid #e2e8f0',
  },
  compHeaderRow: {
    flexDirection: 'row',
    backgroundColor: colors.primaryDark,
  },
  compRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #e2e8f0',
  },
  compRowAlt: {
    flexDirection: 'row',
    borderBottom: '1px solid #e2e8f0',
    backgroundColor: colors.background,
  },
  compCell: {
    flex: 1,
    padding: 10,
    fontSize: 9,
    color: colors.text,
    textAlign: 'center',
  },
  compCellFirst: {
    flex: 1.2,
    padding: 10,
    fontSize: 9,
    fontWeight: 700,
    color: colors.text,
    textAlign: 'left',
    backgroundColor: '#f1f5f9',
  },
  compHeaderCell: {
    flex: 1,
    padding: 10,
    fontSize: 10,
    fontWeight: 700,
    color: colors.white,
    textAlign: 'center',
  },
  compHeaderCellFirst: {
    flex: 1.2,
    padding: 10,
    fontSize: 10,
    fontWeight: 700,
    color: colors.white,
    textAlign: 'left',
  },
  compCellHighlight: {
    flex: 1,
    padding: 10,
    fontSize: 9,
    fontWeight: 700,
    color: colors.accent,
    textAlign: 'center',
    backgroundColor: '#ecfdf5',
  },
  
  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 9,
    color: colors.textLight,
  },
  pageNumber: {
    fontSize: 10,
    color: colors.textLight,
  },
});

// FDP Manifesto content
const manifestoItems = [
  { number: '#1', title: 'KHONG PHAI PHAN MEM KE TOAN', desc: 'Phuc vu CEO/CFO dieu hanh doanh nghiep, khong phai nop bao cao thue.' },
  { number: '#2', title: 'SINGLE SOURCE OF TRUTH', desc: '1 Net Revenue, 1 Contribution Margin, 1 Cash Position. Khong co phien ban khac.' },
  { number: '#3', title: 'TRUTH > FLEXIBILITY', desc: 'Khong cho tu dinh nghia metric tuy tien, khong "chon so dep".' },
  { number: '#4', title: 'REAL CASH', desc: 'Phan biet ro: Cash da ve / se ve / co nguy co khong ve / dang bi khoa.' },
  { number: '#5', title: 'REVENUE va COST', desc: 'Moi doanh thu deu di kem chi phi. Khong co doanh thu "dung mot minh".' },
  { number: '#6', title: 'UNIT ECONOMICS va ACTION', desc: 'SKU lo + khoa cash + tang risk = phai noi STOP.' },
  { number: '#7', title: "TODAY'S DECISION", desc: 'Phuc vu quyet dinh hom nay, khong phai bao cao cuoi thang.' },
  { number: '#8', title: 'SURFACE PROBLEMS', desc: 'Khong lam dep so, khong che anomaly, chi ra van de som.' },
  { number: '#9', title: 'FEED CONTROL TOWER', desc: 'FDP la nguon su that, Control Tower hanh dong dua tren do.' },
  { number: '#10', title: 'FINAL TEST', desc: 'Neu khong khien quyet dinh ro rang hon thi FDP da that bai.' },
];

// Why Bluecore content
const whyBluecoreItems = [
  { 
    pain: 'Du lieu phan tan', 
    painDesc: 'Data nam rai rac tren nhieu he thong, khong ai biet so nao dung',
    solution: 'Single Source of Truth',
    solutionDesc: 'Mot nguon du lieu duy nhat, tat ca cung nhin mot con so'
  },
  { 
    pain: 'Bao cao cham', 
    painDesc: 'Mat 3-5 ngay de dong bao cao cuoi thang, khi co so thi da qua muon',
    solution: 'Realtime Dashboard',
    solutionDesc: 'Data cap nhat lien tuc, biet ngay khong can cho'
  },
  { 
    pain: 'Quyet dinh mu', 
    painDesc: 'Thieu data khi can quyet dinh gap, phai "doan" thay vi "biet"',
    solution: 'Decision-first Platform',
    solutionDesc: 'Data san sang cho moi quyet dinh, khong can gap rut tim kiem'
  },
  { 
    pain: 'Khong biet cash thuc', 
    painDesc: 'Chi biet doanh thu tren so sach, khong biet tien that da ve chua',
    solution: 'Real Cash Tracking',
    solutionDesc: 'Phan biet ro cash da ve, se ve, va dang bi khoa'
  },
  { 
    pain: 'SKU lo ma van ban', 
    painDesc: 'Khong biet unit economics, ban nhieu ma cang lo nhieu',
    solution: 'Unit Economics Engine',
    solutionDesc: 'Biet chinh xac SKU nao lai, SKU nao lo de hanh dong'
  },
];

// Comparison table data
const comparisonData = {
  headers: ['Tieu chi', 'Excel', 'ERP', 'BI Tools', 'Bluecore FDP'],
  rows: [
    ['Setup time', 'Ngay', 'Thang', 'Tuan', 'Gio'],
    ['Real cash tracking', 'Khong', 'Mot phan', 'Khong', 'Day du'],
    ['Unit economics', 'Thu cong', 'Khong', 'Mot phan', 'Tu dong'],
    ['Decision support', 'Khong', 'Khong', 'Charts only', 'Decision-first'],
    ['CEO/CFO focus', 'Khong', 'Ke toan', 'IT focus', 'CEO/CFO'],
  ],
};

// Core capabilities (emojis replaced with letter badges)
const coreCapabilities = [
  {
    badge: 'A',
    title: 'Single Source of Truth Dashboard',
    desc: 'Mot man hinh duy nhat cho tat ca KPIs quan trong',
    features: ['Net Revenue, Gross Margin, Contribution Margin', 'Cash Position realtime', 'Cash Runway calculation', 'Key alerts & anomalies'],
  },
  {
    badge: 'B',
    title: 'Real Cash Tracking',
    desc: 'Phan loai cash theo trang thai thuc te',
    features: ['Cash da ve tai khoan', 'Cash se ve (AR pending)', 'Cash co nguy co khong ve', 'Cash dang bi khoa (Inventory, Ads, Ops)'],
  },
  {
    badge: 'C',
    title: 'Unit Economics Engine',
    desc: 'P&L den tung SKU, tung order',
    features: ['Revenue per SKU/Order', 'COGS + Variable costs per unit', 'Contribution margin per unit', 'Identify loss-making SKUs'],
  },
  {
    badge: 'D',
    title: 'Cash Forecast & Runway',
    desc: 'Du bao dong tien va canh bao som',
    features: ['30/60/90 days forecast', 'Cash runway calculation', 'Burn rate analysis', 'What-if scenarios'],
  },
];

// Feature details (emojis replaced with text labels)
const featureDetails = {
  finance: {
    title: '[01] Bao cao Tai chinh',
    items: ['P&L Report theo thang/quy/nam', 'Gross Margin & Operating Margin', 'EBITDA breakdown', 'Revenue by Channel & Category', 'Cost structure analysis'],
  },
  working: {
    title: '[02] Von luu dong & CCC',
    items: ['DSO - Days Sales Outstanding', 'DIO - Days Inventory Outstanding', 'DPO - Days Payable Outstanding', 'Cash Conversion Cycle', 'Working Capital optimization'],
  },
  arap: {
    title: '[03] AR/AP Management',
    items: ['AR Aging Analysis', 'Overdue invoice tracking', 'Collection forecasting', 'AP scheduling & optimization', 'Cash gap analysis'],
  },
  decision: {
    title: '[04] Decision Support',
    items: ['ROI Analysis calculator', 'NPV/IRR calculations', 'Sensitivity analysis', 'What-if scenario planning', 'Investment decision framework'],
  },
};

const outcomeFeatures = {
  before: {
    title: '[01] Before/After Comparison',
    items: ['Tu dong capture metrics truoc quyet dinh', 'So sanh voi ket qua thuc te sau action', 'Tinh toan variance va accuracy', 'Goi y verdict dua tren data'],
  },
  roi: {
    title: '[02] ROI Calculation',
    items: ['Do luong impact tai chinh thuc te', 'So sanh voi du doan ban dau', 'Cost vs Benefit analysis', 'Cumulative ROI tracking'],
  },
  learning: {
    title: '[03] Learning Feedback',
    items: ['Ghi nhan bai hoc tu moi quyet dinh', 'Build pattern recognition', 'Cai thien do chinh xac theo thoi gian', 'Knowledge base for team'],
  },
  gqs: {
    title: '[04] Quality Score (GQS)',
    items: ['Governance Quality Score 0-100', 'Track decision quality over time', 'Identify improvement areas', 'Benchmark across teams'],
  },
};

// Decision flow steps
const decisionSteps = [
  { number: '1', title: 'Phat hien', desc: 'Alert tu he thong' },
  { number: '2', title: 'Phan tich', desc: 'Evidence & Context' },
  { number: '3', title: 'Quyet dinh', desc: 'Accept / Reject' },
  { number: '4', title: 'Do luong', desc: 'Before vs After' },
];

const FDPSalesDeckPDF: React.FC = () => {
  return (
    <Document title="Bluecore FDP - Sales Deck" author="Bluecore">
      {/* Page 1: Cover Page */}
      <Page size="A4" style={styles.coverPage}>
        <View style={[styles.coverOrnament, styles.coverCircle1]} />
        <View style={[styles.coverOrnament, styles.coverCircle2]} />
        <View style={[styles.coverOrnament, styles.coverCircle3]} />
        <Text style={styles.coverTitle}>Bluecore FDP</Text>
        <Text style={styles.coverSubtitle}>
          Nen tang tai chinh cho CEO & CFO dieu hanh — Single Source of Truth cho moi quyet dinh kinh doanh
        </Text>
        <View style={styles.coverBadge}>
          <Text style={styles.coverBadgeText}>FINANCIAL DATA PLATFORM</Text>
        </View>
      </Page>

      {/* Page 2: Why Bluecore (NEW) */}
      <Page size="A4" style={styles.pageAlt}>
        <Text style={styles.sectionTitle}>Tai sao can Bluecore?</Text>
        <Text style={styles.sectionSubtitle}>
          Nhung van de pho bien ma CEO/CFO gap phai — va cach Bluecore giai quyet chung.
        </Text>
        
        <View style={styles.whyContainer}>
          {whyBluecoreItems.map((item, index) => (
            <View key={index} style={styles.whyRow}>
              <View style={styles.whyPainColumn}>
                <Text style={styles.whyPainTitle}>VAN DE: {item.pain}</Text>
                <Text style={styles.whyPainDesc}>{item.painDesc}</Text>
              </View>
              <View style={styles.whySolutionColumn}>
                <Text style={styles.whySolutionTitle}>BLUECORE: {item.solution}</Text>
                <Text style={styles.whySolutionDesc}>{item.solutionDesc}</Text>
              </View>
            </View>
          ))}
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Bluecore FDP - Financial Data Platform</Text>
          <Text style={styles.pageNumber}>2</Text>
        </View>
      </Page>

      {/* Page 3: Competitive Comparison (NEW) */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>So sanh voi giai phap khac</Text>
        <Text style={styles.sectionSubtitle}>
          Bluecore FDP duoc thiet ke danh rieng cho CEO/CFO — khong phai cho IT hay ke toan.
        </Text>
        
        <View style={styles.compTable}>
          {/* Header row */}
          <View style={styles.compHeaderRow}>
            {comparisonData.headers.map((header, index) => (
              <Text 
                key={index} 
                style={index === 0 ? styles.compHeaderCellFirst : styles.compHeaderCell}
              >
                {header}
              </Text>
            ))}
          </View>
          
          {/* Data rows */}
          {comparisonData.rows.map((row, rowIndex) => (
            <View key={rowIndex} style={rowIndex % 2 === 0 ? styles.compRow : styles.compRowAlt}>
              {row.map((cell, cellIndex) => (
                <Text 
                  key={cellIndex} 
                  style={
                    cellIndex === 0 
                      ? styles.compCellFirst 
                      : cellIndex === 4 
                        ? styles.compCellHighlight 
                        : styles.compCell
                  }
                >
                  {cell}
                </Text>
              ))}
            </View>
          ))}
        </View>
        
        {/* Highlight box */}
        <View style={{ marginTop: 30, backgroundColor: colors.primaryDark, padding: 20, borderRadius: 12 }}>
          <Text style={{ fontSize: 14, fontWeight: 700, color: colors.white, marginBottom: 8 }}>
            Diem khac biet cot loi
          </Text>
          <Text style={{ fontSize: 11, color: colors.white, opacity: 0.9, lineHeight: 1.5 }}>
            Bluecore FDP khong chi la cong cu bao cao — ma la nen tang ho tro quyet dinh. 
            Setup trong vai gio, thay gia tri ngay lap tuc.
          </Text>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Bluecore FDP - Financial Data Platform</Text>
          <Text style={styles.pageNumber}>3</Text>
        </View>
      </Page>

      {/* Page 4: Manifesto Page */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>FDP Manifesto</Text>
        <Text style={styles.sectionSubtitle}>
          10 nguyen tac bat bien cua Financial Data Platform — day la nhung cam ket ma Bluecore khong bao gio thoa hiep.
        </Text>
        
        <View style={styles.manifestoContainer}>
          {manifestoItems.map((item, index) => (
            <View key={index} style={styles.manifestoItem}>
              <Text style={styles.manifestoNumber}>{item.number}</Text>
              <Text style={styles.manifestoTitle}>{item.title}</Text>
              <Text style={styles.manifestoDesc}>{item.desc}</Text>
            </View>
          ))}
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Bluecore FDP - Financial Data Platform</Text>
          <Text style={styles.pageNumber}>4</Text>
        </View>
      </Page>

      {/* Page 5: Core Capabilities Page */}
      <Page size="A4" style={styles.pageAlt}>
        <Text style={styles.sectionTitle}>Core Capabilities</Text>
        <Text style={styles.sectionSubtitle}>
          Nhung nang luc cot loi giup CEO/CFO dieu hanh doanh nghiep hieu qua hon.
        </Text>
        
        <View style={styles.capabilityGrid}>
          {coreCapabilities.map((cap, index) => (
            <View key={index} style={index % 2 === 0 ? styles.capabilityCard : styles.capabilityCardAlt}>
              <View style={styles.capabilityIconBadge}>
                <Text style={styles.capabilityIconText}>{cap.badge}</Text>
              </View>
              <Text style={styles.capabilityTitle}>{cap.title}</Text>
              <Text style={styles.capabilityDesc}>{cap.desc}</Text>
              <View style={styles.capabilityFeatures}>
                {cap.features.map((feature, fIndex) => (
                  <Text key={fIndex} style={styles.capabilityFeature}>* {feature}</Text>
                ))}
              </View>
            </View>
          ))}
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Bluecore FDP - Financial Data Platform</Text>
          <Text style={styles.pageNumber}>5</Text>
        </View>
      </Page>

      {/* Page 6: Feature Details Page */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Chuc nang Chi tiet</Text>
        
        <View style={styles.featureRow}>
          <View style={styles.featureColumn}>
            <Text style={styles.featureColumnTitle}>{featureDetails.finance.title}</Text>
            {featureDetails.finance.items.map((item, index) => (
              <Text key={index} style={styles.featureItem}>* {item}</Text>
            ))}
          </View>
          
          <View style={styles.featureColumnAlt}>
            <Text style={styles.featureColumnTitle}>{featureDetails.working.title}</Text>
            {featureDetails.working.items.map((item, index) => (
              <Text key={index} style={styles.featureItem}>* {item}</Text>
            ))}
          </View>
        </View>
        
        <View style={styles.featureRow}>
          <View style={styles.featureColumnAlt}>
            <Text style={styles.featureColumnTitle}>{featureDetails.arap.title}</Text>
            {featureDetails.arap.items.map((item, index) => (
              <Text key={index} style={styles.featureItem}>* {item}</Text>
            ))}
          </View>
          
          <View style={styles.featureColumn}>
            <Text style={styles.featureColumnTitle}>{featureDetails.decision.title}</Text>
            {featureDetails.decision.items.map((item, index) => (
              <Text key={index} style={styles.featureItem}>* {item}</Text>
            ))}
          </View>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Bluecore FDP - Financial Data Platform</Text>
          <Text style={styles.pageNumber}>6</Text>
        </View>
      </Page>

      {/* Page 7: Decision Flow Page */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Quy trinh Quyet dinh</Text>
        <Text style={styles.sectionSubtitle}>
          Tu phat hien van de den do luong ket qua — moi quyet dinh deu duoc tracking.
        </Text>
        
        <View style={styles.decisionFlow}>
          {decisionSteps.map((step, index) => (
            <React.Fragment key={index}>
              <View style={styles.decisionStep}>
                <View style={styles.decisionStepCircle}>
                  <Text style={styles.decisionStepNumber}>{step.number}</Text>
                </View>
                <Text style={styles.decisionStepTitle}>{step.title}</Text>
                <Text style={styles.decisionStepDesc}>{step.desc}</Text>
              </View>
              {index < decisionSteps.length - 1 && (
                <Text style={styles.decisionArrow}>{'>'}</Text>
              )}
            </React.Fragment>
          ))}
        </View>
        
        {/* Use Case Example */}
        <View style={styles.useCaseBox}>
          <Text style={styles.useCaseTitle}>Vi du: AR qua han can thu hoi</Text>
          <Text style={styles.useCaseValue}>+3.4 Ty VND</Text>
          <Text style={styles.useCaseDesc}>
            105 khach hang co no qua han. Neu thu hoi thanh cong trong 7-14 ngay, 
            Cash Runway se tang them 0.9 thang.
          </Text>
          
          <View style={styles.useCaseMetrics}>
            <View style={styles.useCaseMetric}>
              <Text style={styles.useCaseMetricValue}>105</Text>
              <Text style={styles.useCaseMetricLabel}>Khach hang</Text>
            </View>
            <View style={styles.useCaseMetric}>
              <Text style={styles.useCaseMetricValue}>14 ngay</Text>
              <Text style={styles.useCaseMetricLabel}>Deadline</Text>
            </View>
            <View style={styles.useCaseMetric}>
              <Text style={styles.useCaseMetricValue}>+0.9 thang</Text>
              <Text style={styles.useCaseMetricLabel}>Runway Impact</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Bluecore FDP - Financial Data Platform</Text>
          <Text style={styles.pageNumber}>7</Text>
        </View>
      </Page>

      {/* Page 8: Outcome Tracking Page */}
      <Page size="A4" style={styles.pageAlt}>
        <Text style={styles.sectionTitle}>Do luong Ket qua Tu dong</Text>
        <Text style={styles.sectionSubtitle}>
          So sanh Before vs After — tracking outcome cua moi quyet dinh de hoc va cai thien theo thoi gian.
        </Text>
        
        <View style={styles.featureRow}>
          <View style={styles.featureColumn}>
            <Text style={styles.featureColumnTitle}>{outcomeFeatures.before.title}</Text>
            {outcomeFeatures.before.items.map((item, index) => (
              <Text key={index} style={styles.featureItem}>* {item}</Text>
            ))}
          </View>
          
          <View style={styles.featureColumnAlt}>
            <Text style={styles.featureColumnTitle}>{outcomeFeatures.roi.title}</Text>
            {outcomeFeatures.roi.items.map((item, index) => (
              <Text key={index} style={styles.featureItem}>* {item}</Text>
            ))}
          </View>
        </View>
        
        <View style={styles.featureRow}>
          <View style={styles.featureColumnAlt}>
            <Text style={styles.featureColumnTitle}>{outcomeFeatures.learning.title}</Text>
            {outcomeFeatures.learning.items.map((item, index) => (
              <Text key={index} style={styles.featureItem}>* {item}</Text>
            ))}
          </View>
          
          <View style={styles.featureColumn}>
            <Text style={styles.featureColumnTitle}>{outcomeFeatures.gqs.title}</Text>
            {outcomeFeatures.gqs.items.map((item, index) => (
              <Text key={index} style={styles.featureItem}>* {item}</Text>
            ))}
          </View>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Bluecore FDP - Financial Data Platform</Text>
          <Text style={styles.pageNumber}>8</Text>
        </View>
      </Page>

      {/* Page 9: Contact Page */}
      <Page size="A4" style={styles.coverPage}>
        <View style={[styles.coverOrnament, styles.coverCircle1]} />
        <View style={[styles.coverOrnament, styles.coverCircle2]} />
        <View style={[styles.coverOrnament, styles.coverCircle3]} />
        <Text style={styles.coverTitle}>Bat dau voi FDP</Text>
        <Text style={styles.coverSubtitle}>
          Lien he voi chung toi de duoc demo truc tiep va tu van giai phap phu hop voi doanh nghiep cua ban.
        </Text>
        <View style={{ marginTop: 40 }}>
          <Text style={{ fontSize: 14, color: colors.white, opacity: 0.9, marginBottom: 8, textAlign: 'center' }}>
            Web: bluecore.vn
          </Text>
          <Text style={{ fontSize: 14, color: colors.white, opacity: 0.9, marginBottom: 8, textAlign: 'center' }}>
            Email: contact@bluecore.vn
          </Text>
          <Text style={{ fontSize: 14, color: colors.white, opacity: 0.9, textAlign: 'center' }}>
            Hotline: 1800 xxxx xxx
          </Text>
        </View>
        <View style={{ ...styles.coverBadge, marginTop: 60 }}>
          <Text style={styles.coverBadgeText}>TRUTH {'>'} FLEXIBILITY</Text>
        </View>
      </Page>
    </Document>
  );
};

export default FDPSalesDeckPDF;
