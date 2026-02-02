/**
 * FDP Sales Deck PDF Generator - ENGLISH VERSION v2.0
 * 
 * 12-slide narrative deck telling the Cash Flow Story for SME Retail
 * [Hook] → [Pain] → [Root Cause] → [Solution] → [Use Cases] → [Daily Habit] → [Proof] → [CTA]
 * 
 * English content for international clients - mirroring Vietnamese structure
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

// Get base URL dynamically for font loading
const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
};

// FDP Screenshot URLs
const getFdpImages = () => ({
  dashboard: `${getBaseUrl()}/screenshots/cfo-dashboard.png`,
  unitEconomics: `${getBaseUrl()}/screenshots/unit-economics.png`,
  cashPosition: `${getBaseUrl()}/screenshots/cash-position.png`,
  decisionDetail: `${getBaseUrl()}/screenshots/decision-detail.png`,
  riskDashboard: `${getBaseUrl()}/screenshots/risk-dashboard.png`,
  workingCapital: `${getBaseUrl()}/screenshots/working-capital.png`,
  skuCost: `${getBaseUrl()}/screenshots/sku-cost-breakdown.png`,
  scenarioPlanning: `${getBaseUrl()}/screenshots/scenario-planning.png`,
});

// Register Noto Sans font
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
  warning: '#f59e0b',
  danger: '#ef4444',
  dangerLight: '#fef2f2',
  dangerBorder: '#fecaca',
  text: '#1f2937',
  textLight: '#6b7280',
  background: '#f8fafc',
  backgroundAlt: '#e0f2fe',
  white: '#ffffff',
  black: '#000000',
  gradientStart: '#f0f9ff',
  gradientEnd: '#e0f2fe',
  greenLight: '#ecfdf5',
  greenBorder: '#a7f3d0',
};

// Styles
const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'NotoSans', backgroundColor: colors.white },
  pageAlt: { padding: 40, fontFamily: 'NotoSans', backgroundColor: colors.background },
  pageGradient: { padding: 40, fontFamily: 'NotoSans', backgroundColor: colors.gradientStart },
  pageDark: { padding: 40, fontFamily: 'NotoSans', backgroundColor: colors.primaryDark },
  
  // Cover page
  coverPage: { padding: 60, fontFamily: 'NotoSans', backgroundColor: colors.primaryDark, justifyContent: 'center', alignItems: 'center', height: '100%' },
  coverTitle: { fontSize: 48, fontWeight: 700, color: colors.white, marginBottom: 16, textAlign: 'center' },
  coverSubtitle: { fontSize: 18, fontWeight: 400, color: colors.white, opacity: 0.9, textAlign: 'center', maxWidth: 420, lineHeight: 1.6 },
  coverBadge: { marginTop: 40, backgroundColor: colors.accent, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  coverBadgeText: { fontSize: 14, fontWeight: 700, color: colors.white, letterSpacing: 1 },
  coverTagline: { marginTop: 24, fontSize: 16, fontWeight: 700, color: colors.accent, opacity: 0.9 },
  coverOrnament: { position: 'absolute', borderRadius: 9999, opacity: 0.15, backgroundColor: colors.white },
  coverCircle1: { width: 500, height: 500, top: -180, right: -200 },
  coverCircle2: { width: 600, height: 600, bottom: -280, left: -300, opacity: 0.1 },
  coverCircle3: { width: 200, height: 200, bottom: 120, right: 80, opacity: 0.08 },
  
  // Section headers
  eyebrowLabel: { fontSize: 10, fontWeight: 700, color: colors.primary, letterSpacing: 1, marginBottom: 8 },
  eyebrowLabelRed: { fontSize: 10, fontWeight: 700, color: colors.danger, letterSpacing: 1, marginBottom: 8 },
  sectionTitle: { fontSize: 26, fontWeight: 700, color: colors.primaryDark, marginBottom: 10 },
  sectionTitleCenter: { fontSize: 26, fontWeight: 700, color: colors.primaryDark, marginBottom: 10, textAlign: 'center' },
  sectionTitleWhite: { fontSize: 26, fontWeight: 700, color: colors.white, marginBottom: 10, textAlign: 'center' },
  sectionSubtitle: { fontSize: 12, fontWeight: 400, color: colors.textLight, marginBottom: 24, maxWidth: 480, lineHeight: 1.5 },
  sectionSubtitleCenter: { fontSize: 12, fontWeight: 400, color: colors.textLight, textAlign: 'center', marginBottom: 24, maxWidth: 420, alignSelf: 'center', lineHeight: 1.5 },
  
  // CEO Day Timeline
  timelineContainer: { marginTop: 10 },
  timelineItem: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-start' },
  timelineTime: { width: 70, fontSize: 11, fontWeight: 700, color: colors.primary },
  timelineContent: { flex: 1, backgroundColor: colors.white, padding: 12, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: colors.warning },
  timelineContentDanger: { flex: 1, backgroundColor: colors.dangerLight, padding: 12, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: colors.danger },
  timelineText: { fontSize: 10, fontWeight: 400, color: colors.text, lineHeight: 1.4 },
  
  // Pain Points Grid
  painGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  painCard: { width: '48%', backgroundColor: colors.white, padding: 14, borderRadius: 10, borderLeftWidth: 4, borderLeftColor: colors.danger, marginBottom: 10 },
  painNumber: { fontSize: 9, fontWeight: 700, color: colors.danger, marginBottom: 4 },
  painTitle: { fontSize: 11, fontWeight: 700, color: colors.text, marginBottom: 6 },
  painBullet: { fontSize: 9, fontWeight: 400, color: colors.textLight, marginBottom: 3, lineHeight: 1.4 },
  
  // Cost Boxes
  costGrid: { flexDirection: 'row', gap: 14, marginTop: 20 },
  costCard: { flex: 1, backgroundColor: colors.dangerLight, padding: 18, borderRadius: 10, borderWidth: 1, borderColor: colors.dangerBorder, alignItems: 'center' },
  costAmount: { fontSize: 24, fontWeight: 700, color: colors.danger, marginBottom: 4 },
  costLabel: { fontSize: 9, fontWeight: 700, color: colors.text, textAlign: 'center', marginBottom: 6 },
  costDesc: { fontSize: 8, fontWeight: 400, color: colors.textLight, textAlign: 'center', lineHeight: 1.4 },
  quoteBox: { marginTop: 24, backgroundColor: colors.primaryDark, padding: 20, borderRadius: 10 },
  quoteText: { fontSize: 13, fontWeight: 700, color: colors.white, textAlign: 'center', lineHeight: 1.5 },
  
  // Solution positioning
  positioningStatement: { backgroundColor: colors.white, padding: 16, borderRadius: 10, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: colors.primary },
  positioningText: { fontSize: 11, fontWeight: 400, color: colors.text, lineHeight: 1.6 },
  threePillarsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  pillarCard: { flex: 1, backgroundColor: colors.primaryDark, padding: 14, borderRadius: 10, alignItems: 'center' },
  pillarIcon: { fontSize: 18, marginBottom: 6 },
  pillarTitle: { fontSize: 10, fontWeight: 700, color: colors.white, textAlign: 'center', marginBottom: 4 },
  pillarDesc: { fontSize: 8, fontWeight: 400, color: colors.white, opacity: 0.85, textAlign: 'center', lineHeight: 1.3 },
  solutionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  solutionCard: { width: '48%', backgroundColor: colors.white, padding: 16, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 10 },
  solutionCardAlt: { width: '48%', backgroundColor: colors.backgroundAlt, padding: 16, borderRadius: 10, borderWidth: 1, borderColor: '#bae6fd', marginBottom: 10 },
  solutionBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  solutionBadgeText: { fontSize: 12, fontWeight: 700, color: colors.white },
  solutionTitle: { fontSize: 11, fontWeight: 700, color: colors.text, marginBottom: 6 },
  solutionDesc: { fontSize: 9, fontWeight: 400, color: colors.textLight, lineHeight: 1.4 },
  
  // Comparison table
  compTable: { width: '100%', borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0' },
  compHeaderRow: { flexDirection: 'row', backgroundColor: colors.primaryDark },
  compRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  compRowAlt: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', backgroundColor: colors.background },
  compCell: { flex: 1, padding: 10, fontSize: 9, fontWeight: 400, color: colors.text, textAlign: 'center' },
  compCellFirst: { flex: 1.3, padding: 10, fontSize: 9, fontWeight: 700, color: colors.text, textAlign: 'left', backgroundColor: '#f1f5f9' },
  compHeaderCell: { flex: 1, padding: 10, fontSize: 9, fontWeight: 700, color: colors.white, textAlign: 'center' },
  compHeaderCellFirst: { flex: 1.3, padding: 10, fontSize: 9, fontWeight: 700, color: colors.white, textAlign: 'left' },
  compCellHighlight: { flex: 1, padding: 10, fontSize: 9, fontWeight: 700, color: colors.accent, textAlign: 'center', backgroundColor: colors.greenLight },
  
  // Competitive Advantages
  advantagesSection: { marginTop: 16 },
  advantagesSectionTitle: { fontSize: 11, fontWeight: 700, color: colors.primaryDark, marginBottom: 10 },
  advantageCard: { backgroundColor: colors.greenLight, padding: 12, borderRadius: 8, borderLeftWidth: 4, borderLeftColor: colors.accent, marginBottom: 8, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  advantageNumber: { fontSize: 12, fontWeight: 700, color: colors.accent, width: 24 },
  advantageContent: { flex: 1 },
  advantageTitle: { fontSize: 10, fontWeight: 700, color: colors.text, marginBottom: 3 },
  advantageDesc: { fontSize: 8, fontWeight: 400, color: colors.textLight, lineHeight: 1.4 },
  
  // Story Box
  storyBox: { backgroundColor: colors.backgroundAlt, padding: 14, borderRadius: 10, marginBottom: 14, borderWidth: 1, borderColor: '#bae6fd' },
  storyTitle: { fontSize: 9, fontWeight: 700, color: colors.primary, marginBottom: 6, letterSpacing: 0.5 },
  storyText: { fontSize: 9, fontWeight: 400, color: colors.text, lineHeight: 1.5, marginBottom: 8 },
  storyResult: { fontSize: 9, fontWeight: 700, color: colors.accent, lineHeight: 1.4 },
  
  // Use Case Pages
  useCaseQuestion: { fontSize: 20, fontWeight: 700, color: colors.primaryDark, marginBottom: 6 },
  
  // Mockup Diagram
  mockupContainer: { backgroundColor: colors.white, borderRadius: 12, padding: 16, borderWidth: 2, borderColor: '#e2e8f0', marginBottom: 16 },
  mockupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', marginBottom: 12 },
  mockupTitle: { fontSize: 10, fontWeight: 700, color: colors.text },
  mockupLive: { backgroundColor: colors.accent, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  mockupLiveText: { fontSize: 7, fontWeight: 700, color: colors.white },
  mockupKPIRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  mockupKPICard: { flex: 1, backgroundColor: colors.background, padding: 12, borderRadius: 8, alignItems: 'center' },
  mockupKPICardHighlight: { flex: 1, backgroundColor: colors.greenLight, padding: 12, borderRadius: 8, alignItems: 'center', borderWidth: 2, borderColor: colors.accent },
  mockupKPICardDanger: { flex: 1, backgroundColor: colors.dangerLight, padding: 12, borderRadius: 8, alignItems: 'center', borderWidth: 2, borderColor: colors.danger },
  mockupKPILabel: { fontSize: 7, fontWeight: 400, color: colors.textLight, marginBottom: 4 },
  mockupKPIValue: { fontSize: 16, fontWeight: 700, color: colors.primaryDark },
  mockupKPIValueGreen: { fontSize: 16, fontWeight: 700, color: colors.accent },
  mockupKPIValueRed: { fontSize: 16, fontWeight: 700, color: colors.danger },
  mockupTable: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 6, overflow: 'hidden' },
  mockupTableHeader: { flexDirection: 'row', backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  mockupTableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  mockupTableCell: { flex: 1, padding: 6, fontSize: 7, fontWeight: 400, color: colors.text },
  mockupTableCellHeader: { flex: 1, padding: 6, fontSize: 7, fontWeight: 700, color: colors.text },
  mockupTableCellDanger: { flex: 1, padding: 6, fontSize: 7, fontWeight: 700, color: colors.danger, backgroundColor: colors.dangerLight },
  
  // Use Case Benefits
  benefitRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  benefitCard: { flex: 1, backgroundColor: colors.greenLight, padding: 12, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: colors.accent },
  benefitTitle: { fontSize: 9, fontWeight: 700, color: colors.text, marginBottom: 4 },
  benefitText: { fontSize: 8, fontWeight: 400, color: colors.textLight, lineHeight: 1.4 },
  
  // Impact Box
  impactBox: { backgroundColor: colors.primaryDark, padding: 16, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  impactLabel: { fontSize: 9, fontWeight: 400, color: colors.white, opacity: 0.8 },
  impactValue: { fontSize: 20, fontWeight: 700, color: colors.accent, marginTop: 4 },
  impactDesc: { fontSize: 9, fontWeight: 400, color: colors.white, opacity: 0.9, maxWidth: 200, lineHeight: 1.4 },
  
  // Manifesto
  manifestoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  manifestoCard: { width: '48%', backgroundColor: colors.white, padding: 12, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: colors.primary, marginBottom: 8 },
  manifestoNumber: { fontSize: 9, fontWeight: 700, color: colors.primary, marginBottom: 3 },
  manifestoTitle: { fontSize: 9, fontWeight: 700, color: colors.text, marginBottom: 3 },
  manifestoDesc: { fontSize: 7, fontWeight: 400, color: colors.textLight, lineHeight: 1.4 },
  
  // Contact/CTA
  contactTitle: { fontSize: 36, fontWeight: 700, color: colors.white, marginBottom: 14, textAlign: 'center' },
  contactSubtitle: { fontSize: 14, fontWeight: 400, color: colors.white, opacity: 0.9, textAlign: 'center', maxWidth: 360, lineHeight: 1.6 },
  contactInfo: { marginTop: 36, alignItems: 'center' },
  contactItem: { fontSize: 13, fontWeight: 400, color: colors.white, marginBottom: 8 },
  contactCTA: { marginTop: 28, backgroundColor: colors.accent, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24 },
  contactCTAText: { fontSize: 13, fontWeight: 700, color: colors.white },
  
  // Footer
  footer: { position: 'absolute', bottom: 24, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerText: { fontSize: 8, fontWeight: 400, color: colors.textLight },
  footerTextWhite: { fontSize: 8, fontWeight: 400, color: colors.white, opacity: 0.6 },
  pageNumber: { fontSize: 9, fontWeight: 400, color: colors.textLight },
  pageNumberWhite: { fontSize: 9, fontWeight: 400, color: colors.white, opacity: 0.6 },
  
  // Screenshot styles
  screenshotContainer: { marginVertical: 12, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0' },
  screenshotImage: { width: '100%', height: 180, objectFit: 'cover' as const },
  screenshotLabel: { fontSize: 8, fontWeight: 400, color: colors.textLight, textAlign: 'center' as const, marginTop: 4 },
});

// ============== CONTENT DATA (ENGLISH) ==============

// CEO Day Timeline (Page 2)
const ceoDayTimeline = [
  { time: '7:00 AM', text: "Yesterday's revenue was $32K, but how much real cash came in?", danger: false },
  { time: '9:00 AM', text: 'Supplier demands $24K payment today. Do we have enough?', danger: true },
  { time: '11:00 AM', text: 'Marketing asks for $8K more for ads. Approve or not?', danger: false },
  { time: '2:00 PM', text: 'Accounting says $80K in the account — but $60K is held by Shopee.', danger: true },
  { time: '5:00 PM', text: 'Not sure whether to approve $20K new purchase request.', danger: true },
];

// 5 Pain Points (Page 3)
const cashPainPoints = [
  {
    number: '01',
    title: 'Sales revenue is not real cash',
    bullets: ['• Shopee/Lazada hold for 14-21 days', '• COD not yet reconciled', '• Returns not processed'],
  },
  {
    number: '02',
    title: 'Inventory = Dead money',
    bullets: ['• 30% inventory is slow-moving', '• Daily storage costs', '• Nobody knows which SKU to liquidate'],
  },
  {
    number: '03',
    title: 'Marketing burns cash without knowing real ROI',
    bullets: ['• Spend $4K on ads → $12K revenue', '• But COGS + logistics + returns = loss?', '• No Unit Economics'],
  },
  {
    number: '04',
    title: 'Receivables "look good" on paper, bad in reality',
    bullets: ['• AR $80K, but $32K overdue 60+ days', '• Who needs to be called today?', '• Actual collection probability?'],
  },
  {
    number: '05',
    title: "Don't know how long until cash runs out",
    bullets: ['• What is Cash Runway?', '• Real burn rate per month?', '• When to take action?'],
  },
];

// Cost of Not Knowing (Page 4)
const costItems = [
  { amount: '$2-4K', label: 'Decision delayed 1 week', desc: 'Miss opportunity for good pricing, slow market reaction' },
  { amount: '$1-3K', label: 'Losing SKU sold 1 more month', desc: 'More sales = more losses, more cash locked in inventory' },
  { amount: '20%', label: 'AR overdue 2 months', desc: 'Risk of total loss if no early action taken' },
];

// Three Pillars (Page 5)
const threePillars = [
  { icon: '$', title: 'REAL CASH', desc: 'Real money, not book money' },
  { icon: '#', title: 'TRUTH FIRST', desc: 'No beautifying numbers, only truth' },
  { icon: '>', title: 'ACTION NOW', desc: 'Decide today, don\'t wait' },
];

// Solution Cards (Page 5)
const solutionCards = [
  { badge: 'A', title: 'Cash Position', desc: 'Know REAL cash in 5 seconds' },
  { badge: 'B', title: 'Unit Economics', desc: 'Know which SKU is eating money' },
  { badge: 'C', title: 'AR/AP Actions', desc: 'Know who to call today' },
  { badge: 'D', title: 'Cash Forecast', desc: 'Know how long runway lasts' },
];

// Comparison table (Page 6)
const comparisonData = {
  headers: ['Criteria', 'Excel', 'ERP', 'BI Tools', 'Bluecore FDP'],
  rows: [
    ['Deployment', 'Days', 'Months', 'Weeks', 'Hours'],
    ['Track real cash', 'No', 'Partial', 'No', 'Complete'],
    ['Unit Economics', 'Manual', 'No', 'Partial', 'Automatic'],
    ['Decision support', 'No', 'No', 'Charts only', 'Decision-first'],
    ['Focus CEO/CFO', 'No', 'Accounting', 'IT focus', 'CEO/CFO'],
  ],
};

// Competitive Advantages (Page 6)
const competitiveAdvantages = [
  { number: '#1', title: 'DESIGNED FOR CEO/CFO, NOT IT', desc: 'Excel/ERP serves accounting and IT. Bluecore serves decision makers.' },
  { number: '#2', title: 'REAL CASH, NOT BOOK NUMBERS', desc: 'ERP shows AR $120K. Bluecore shows: $32K at risk, $20K needs call today.' },
  { number: '#3', title: 'DEPLOY IN HOURS, NOT MONTHS', desc: 'ERP takes 3-6 months. BI takes 4-8 weeks training. Bluecore: connect data → see value in 1 day.' },
];

// Story Blocks for Use Cases (Pages 7-10)
const useCaseStories = {
  cashCheck: {
    title: 'REAL SITUATION',
    text: 'Mr. Minh, CEO of a 5-store fashion chain, every Monday morning spends 2 hours asking accounting: "How much money do we have?" Accounting says $80K, but $60K is held by Shopee, $12K is unreconciled COD.',
    result: 'WITH BLUECORE: Mr. Minh opens app, 5 seconds later knows: Real Cash: $20K | On Hold: $60K | Coming: $32K',
  },
  skuProfit: {
    title: 'REAL SITUATION',
    text: "Ms. Lan, founder of an online cosmetics shop, had $20K revenue last month but ran out of cash for payroll. Investigation revealed: 3 promo combos were selling at a loss, each order losing $6 after COGS, shipping, ads, returns.",
    result: 'WITH BLUECORE: Ms. Lan saw 3 SKUs with negative CM instantly in dashboard, stopped sales immediately, saved $3.2K.',
  },
  arCollection: {
    title: 'REAL SITUATION',
    text: "Mr. Hung's food company has $120K AR on the books. But $32K is already 60 days overdue, and 1 major customer is showing signs of financial difficulty.",
    result: 'WITH BLUECORE: Mr. Hung has a list of 5 customers to call today, collected $12.8K before it became bad debt.',
  },
  cashRunway: {
    title: 'REAL SITUATION',
    text: "Tuan's startup is burning $24K/month. End of quarter discovered cash running out, rushed to fundraise but too late - valuation was crushed due to weak position.",
    result: 'WITH BLUECORE: Tuan knew 3 months ahead runway was ending, had time to prepare fundraising, negotiated from a stronger position.',
  },
};

// FDP Manifesto (Page 11)
const manifestoItems = [
  { number: '#1', title: 'Not accounting software', desc: 'Serves CEO/CFO operations, not tax reporting.' },
  { number: '#2', title: 'Single Source of Truth', desc: '1 Net Revenue, 1 Contribution Margin, 1 Cash Position.' },
  { number: '#3', title: 'Truth > Flexibility', desc: 'No custom metric definitions, no "choosing nice numbers".' },
  { number: '#4', title: 'Real Cash', desc: 'Distinguish: Cash received / expected / locked / at risk.' },
  { number: '#5', title: 'Revenue linked to Cost', desc: 'Every revenue comes with associated costs.' },
  { number: '#6', title: 'Unit Economics → Action', desc: 'Losing SKU + locked cash + risk = must say STOP.' },
  { number: '#7', title: "Today's Decision", desc: "Serve today's decision, not month-end reports." },
  { number: '#8', title: 'Surface Problems', desc: "Don't beautify numbers, highlight issues early." },
  { number: '#9', title: 'Feed Control Tower', desc: 'FDP is the source of truth for all actions.' },
  { number: '#10', title: 'Final Test', desc: "If it doesn't help decide clearer = failure." },
];

const FDPSalesDeckPDF_EN: React.FC = () => {
  return (
    <Document title="Bluecore FDP - Sales Deck (EN)" author="Bluecore">
      {/* ========== Page 1: Cover ========== */}
      <Page size="A4" style={styles.coverPage}>
        <View style={[styles.coverOrnament, styles.coverCircle1]} />
        <View style={[styles.coverOrnament, styles.coverCircle2]} />
        <View style={[styles.coverOrnament, styles.coverCircle3]} />
        <Text style={styles.coverTitle}>Bluecore FDP</Text>
        <Text style={styles.coverSubtitle}>
          Financial Data Platform for CEO & CFO{'\n'}
          Telling the real cash flow story of your business
        </Text>
        <View style={styles.coverBadge}>
          <Text style={styles.coverBadgeText}>FINANCIAL DATA PLATFORM</Text>
        </View>
        <Text style={styles.coverTagline}>Truth {'>'} Flexibility</Text>
      </Page>

      {/* ========== Page 2: A Day in the Life of an SME CEO ========== */}
      <Page size="A4" style={styles.pageGradient}>
        <Text style={styles.eyebrowLabel}>THE STORY</Text>
        <Text style={styles.sectionTitle}>A day of a CEO who doesn't know how much cash they have</Text>
        <Text style={styles.sectionSubtitle}>
          This is a real story happening every day at thousands of SME Retail businesses.
        </Text>
        
        <View style={styles.timelineContainer}>
          {ceoDayTimeline.map((item, index) => (
            <View key={index} style={styles.timelineItem}>
              <Text style={styles.timelineTime}>{item.time}</Text>
              <View style={item.danger ? styles.timelineContentDanger : styles.timelineContent}>
                <Text style={styles.timelineText}>{item.text}</Text>
              </View>
            </View>
          ))}
        </View>
        
        <View style={styles.quoteBox}>
          <Text style={styles.quoteText}>
            "End of day, CEO still doesn't know how much REAL cash they can use."
          </Text>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Bluecore FDP - Financial Data Platform</Text>
          <Text style={styles.pageNumber}>2</Text>
        </View>
      </Page>

      {/* ========== Page 3: 5 Cash Flow Bottlenecks ========== */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.eyebrowLabelRed}>THE PROBLEM</Text>
        <Text style={styles.sectionTitle}>5 cash flow bottlenecks that Excel cannot show</Text>
        <Text style={styles.sectionSubtitle}>
          Hidden problems causing businesses to have revenue but no cash.
        </Text>
        
        <View style={styles.painGrid}>
          {cashPainPoints.map((item, index) => (
            <View key={index} style={styles.painCard}>
              <Text style={styles.painNumber}>{item.number}</Text>
              <Text style={styles.painTitle}>{item.title}</Text>
              {item.bullets.map((bullet, bIndex) => (
                <Text key={bIndex} style={styles.painBullet}>{bullet}</Text>
              ))}
            </View>
          ))}
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Bluecore FDP - Financial Data Platform</Text>
          <Text style={styles.pageNumber}>3</Text>
        </View>
      </Page>

      {/* ========== Page 4: The Cost of Not Knowing ========== */}
      <Page size="A4" style={styles.pageDark}>
        <View style={[styles.coverOrnament, styles.coverCircle1]} />
        <View style={[styles.coverOrnament, styles.coverCircle2]} />
        
        <Text style={{ fontSize: 10, fontWeight: 700, color: colors.warning, letterSpacing: 1, marginBottom: 8 }}>CONSEQUENCES</Text>
        <Text style={styles.sectionTitleWhite}>Every day not knowing = Real money lost</Text>
        <Text style={{ fontSize: 12, fontWeight: 400, color: colors.white, opacity: 0.8, marginBottom: 28, lineHeight: 1.5 }}>
          This is not theory — these are real numbers from SME Retail businesses.
        </Text>
        
        <View style={styles.costGrid}>
          {costItems.map((item, index) => (
            <View key={index} style={styles.costCard}>
              <Text style={styles.costAmount}>{item.amount}</Text>
              <Text style={styles.costLabel}>{item.label}</Text>
              <Text style={styles.costDesc}>{item.desc}</Text>
            </View>
          ))}
        </View>
        
        <View style={[styles.quoteBox, { marginTop: 32, backgroundColor: 'rgba(255,255,255,0.1)' }]}>
          <Text style={[styles.quoteText, { fontSize: 15 }]}>
            "SME businesses don't die from wrong decisions —{'\n'}they die from slow decisions."
          </Text>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerTextWhite}>Bluecore FDP - Financial Data Platform</Text>
          <Text style={styles.pageNumberWhite}>4</Text>
        </View>
      </Page>

      {/* ========== Page 5: What is Bluecore FDP? (Positioning + Screenshot) ========== */}
      <Page size="A4" style={styles.pageGradient}>
        <Text style={styles.eyebrowLabel}>POSITIONING</Text>
        <Text style={styles.sectionTitle}>Bluecore FDP is not BI — not ERP</Text>
        
        {/* CFO Dashboard Screenshot */}
        <View style={styles.screenshotContainer}>
          <Image src={getFdpImages().dashboard} style={styles.screenshotImage} />
        </View>
        
        {/* Positioning Statement */}
        <View style={styles.positioningStatement}>
          <Text style={styles.positioningText}>
            The only financial data platform for CEO and CFO of SME Retail. Not a reporting tool — a decision support system based on real cash flow.
          </Text>
        </View>
        
        {/* Three Pillars */}
        <View style={styles.threePillarsRow}>
          {threePillars.map((pillar, index) => (
            <View key={index} style={styles.pillarCard}>
              <Text style={styles.pillarIcon}>{pillar.icon}</Text>
              <Text style={styles.pillarTitle}>{pillar.title}</Text>
              <Text style={styles.pillarDesc}>{pillar.desc}</Text>
            </View>
          ))}
        </View>
        
        {/* Core Capabilities */}
        <View style={styles.solutionGrid}>
          {solutionCards.map((item, index) => (
            <View key={index} style={index % 2 === 0 ? styles.solutionCard : styles.solutionCardAlt}>
              <View style={styles.solutionBadge}>
                <Text style={styles.solutionBadgeText}>{item.badge}</Text>
              </View>
              <Text style={styles.solutionTitle}>{item.title}</Text>
              <Text style={styles.solutionDesc}>{item.desc}</Text>
            </View>
          ))}
        </View>
        
        <View style={styles.impactBox}>
          <View>
            <Text style={styles.impactLabel}>Deployment in</Text>
            <Text style={styles.impactValue}>Hours</Text>
          </View>
          <Text style={styles.impactDesc}>No IT needed, no complex training. See value immediately.</Text>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Bluecore FDP - Financial Data Platform</Text>
          <Text style={styles.pageNumber}>5</Text>
        </View>
      </Page>

      {/* ========== Page 6: Comparison + Competitive Advantages ========== */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.eyebrowLabel}>COMPARISON</Text>
        <Text style={styles.sectionTitle}>Why choose Bluecore FDP?</Text>
        <Text style={styles.sectionSubtitle}>
          Compare with other solutions and why Bluecore is different.
        </Text>
        
        <View style={styles.compTable}>
          <View style={styles.compHeaderRow}>
            {comparisonData.headers.map((header, index) => (
              <Text key={index} style={index === 0 ? styles.compHeaderCellFirst : styles.compHeaderCell}>
                {header}
              </Text>
            ))}
          </View>
          
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
        
        {/* Competitive Advantages Section */}
        <View style={styles.advantagesSection}>
          <Text style={styles.advantagesSectionTitle}>WHY BLUECORE IS DIFFERENT?</Text>
          {competitiveAdvantages.map((adv, index) => (
            <View key={index} style={styles.advantageCard}>
              <Text style={styles.advantageNumber}>{adv.number}</Text>
              <View style={styles.advantageContent}>
                <Text style={styles.advantageTitle}>{adv.title}</Text>
                <Text style={styles.advantageDesc}>{adv.desc}</Text>
              </View>
            </View>
          ))}
        </View>
        
        <View style={[styles.quoteBox, { marginTop: 12 }]}>
          <Text style={[styles.quoteText, { fontSize: 10 }]}>
            "Bluecore FDP doesn't compete with Excel or ERP — we solve problems they cannot solve."
          </Text>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Bluecore FDP - Financial Data Platform</Text>
          <Text style={styles.pageNumber}>6</Text>
        </View>
      </Page>

      {/* ========== Page 7: Use Case 1 - Monday Morning Cash Check ========== */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.eyebrowLabel}>USE CASE #1</Text>
        <Text style={styles.useCaseQuestion}>"How much REAL cash do I have today?"</Text>
        
        {/* Story Block */}
        <View style={styles.storyBox}>
          <Text style={styles.storyTitle}>{useCaseStories.cashCheck.title}</Text>
          <Text style={styles.storyText}>{useCaseStories.cashCheck.text}</Text>
          <Text style={styles.storyResult}>{useCaseStories.cashCheck.result}</Text>
        </View>
        
        {/* Real Screenshot - Cash Position */}
        <View style={styles.screenshotContainer}>
          <Image src={getFdpImages().cashPosition} style={styles.screenshotImage} />
        </View>
        <Text style={styles.screenshotLabel}>Cash Position Dashboard — Real cash vs book cash</Text>
        
        <View style={styles.benefitRow}>
          <View style={styles.benefitCard}>
            <Text style={styles.benefitTitle}>No waiting for accounting</Text>
            <Text style={styles.benefitText}>Data auto-updates from bank, e-commerce, POS</Text>
          </View>
          <View style={styles.benefitCard}>
            <Text style={styles.benefitTitle}>Distinguish real vs book cash</Text>
            <Text style={styles.benefitText}>Know cash received, on hold, coming, at risk</Text>
          </View>
        </View>
        
        <View style={styles.impactBox}>
          <View>
            <Text style={styles.impactLabel}>Impact</Text>
            <Text style={styles.impactValue}>-90%</Text>
          </View>
          <Text style={styles.impactDesc}>Time to check cash each morning. From 2 hours down to 5 minutes.</Text>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Bluecore FDP - Financial Data Platform</Text>
          <Text style={styles.pageNumber}>7</Text>
        </View>
      </Page>

      {/* ========== Page 8: Use Case 2 - SKU Profit Analysis ========== */}
      <Page size="A4" style={styles.pageAlt}>
        <Text style={styles.eyebrowLabel}>USE CASE #2</Text>
        <Text style={styles.useCaseQuestion}>"Which SKU is making money, which is losing?"</Text>
        
        {/* Story Block */}
        <View style={styles.storyBox}>
          <Text style={styles.storyTitle}>{useCaseStories.skuProfit.title}</Text>
          <Text style={styles.storyText}>{useCaseStories.skuProfit.text}</Text>
          <Text style={styles.storyResult}>{useCaseStories.skuProfit.result}</Text>
        </View>
        
        {/* Real Screenshot - Unit Economics */}
        <View style={styles.screenshotContainer}>
          <Image src={getFdpImages().unitEconomics} style={styles.screenshotImage} />
        </View>
        <Text style={styles.screenshotLabel}>Unit Economics by SKU — Real Contribution Margin</Text>
        
        <View style={styles.benefitRow}>
          <View style={styles.benefitCard}>
            <Text style={styles.benefitTitle}>Not just Gross Margin</Text>
            <Text style={styles.benefitText}>Includes COGS, logistics, return, platform fees</Text>
          </View>
          <View style={styles.benefitCard}>
            <Text style={styles.benefitTitle}>Action immediately</Text>
            <Text style={styles.benefitText}>Stop losing SKU, adjust price, optimize ads</Text>
          </View>
        </View>
        
        <View style={styles.impactBox}>
          <View>
            <Text style={styles.impactLabel}>Discover</Text>
            <Text style={styles.impactValue}>15% SKU</Text>
          </View>
          <Text style={styles.impactDesc}>Have negative contribution margin — more sales = more losses.</Text>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Bluecore FDP - Financial Data Platform</Text>
          <Text style={styles.pageNumber}>8</Text>
        </View>
      </Page>

      {/* ========== Page 9: Use Case 3 - AR Collection ========== */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.eyebrowLabel}>USE CASE #3</Text>
        <Text style={styles.useCaseQuestion}>"Who should I call for payment TODAY?"</Text>
        
        {/* Story Block */}
        <View style={styles.storyBox}>
          <Text style={styles.storyTitle}>{useCaseStories.arCollection.title}</Text>
          <Text style={styles.storyText}>{useCaseStories.arCollection.text}</Text>
          <Text style={styles.storyResult}>{useCaseStories.arCollection.result}</Text>
        </View>
        
        {/* Stylized Mockup - AR Table */}
        <View style={styles.mockupContainer}>
          <View style={styles.mockupHeader}>
            <Text style={styles.mockupTitle}>AR Collection Priority</Text>
            <View style={[styles.mockupLive, { backgroundColor: colors.danger }]}>
              <Text style={styles.mockupLiveText}>5 OVERDUE</Text>
            </View>
          </View>
          
          <View style={styles.mockupKPIRow}>
            <View style={styles.mockupKPICard}>
              <Text style={styles.mockupKPILabel}>Total AR</Text>
              <Text style={styles.mockupKPIValue}>$128K</Text>
            </View>
            <View style={styles.mockupKPICardDanger}>
              <Text style={styles.mockupKPILabel}>Overdue 30+ days</Text>
              <Text style={styles.mockupKPIValueRed}>$34K</Text>
            </View>
            <View style={styles.mockupKPICard}>
              <Text style={styles.mockupKPILabel}>Overdue 60+ days</Text>
              <Text style={styles.mockupKPIValue}>$12.8K</Text>
            </View>
          </View>
          
          <View style={styles.mockupTable}>
            <View style={styles.mockupTableHeader}>
              <Text style={[styles.mockupTableCellHeader, { flex: 2 }]}>Customer</Text>
              <Text style={styles.mockupTableCellHeader}>Amount</Text>
              <Text style={styles.mockupTableCellHeader}>Overdue</Text>
              <Text style={styles.mockupTableCellHeader}>Priority</Text>
            </View>
            <View style={styles.mockupTableRow}>
              <Text style={[styles.mockupTableCell, { flex: 2 }]}>ABC Corp LLC</Text>
              <Text style={styles.mockupTableCell}>$12.8K</Text>
              <Text style={styles.mockupTableCellDanger}>45 days</Text>
              <Text style={[styles.mockupTableCell, { fontWeight: 700 }]}>CALL NOW</Text>
            </View>
            <View style={styles.mockupTableRow}>
              <Text style={[styles.mockupTableCell, { flex: 2 }]}>Shop XYZ - Shopee</Text>
              <Text style={styles.mockupTableCell}>$7.2K</Text>
              <Text style={styles.mockupTableCellDanger}>38 days</Text>
              <Text style={[styles.mockupTableCell, { fontWeight: 700 }]}>CALL NOW</Text>
            </View>
            <View style={styles.mockupTableRow}>
              <Text style={[styles.mockupTableCell, { flex: 2 }]}>North Region Dealer</Text>
              <Text style={styles.mockupTableCell}>$6K</Text>
              <Text style={styles.mockupTableCell}>21 days</Text>
              <Text style={styles.mockupTableCell}>This week</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.benefitRow}>
          <View style={styles.benefitCard}>
            <Text style={styles.benefitTitle}>Prioritize by risk</Text>
            <Text style={styles.benefitText}>Long overdue + large amount = call first</Text>
          </View>
          <View style={styles.benefitCard}>
            <Text style={styles.benefitTitle}>Track results</Text>
            <Text style={styles.benefitText}>Record outcome after each collection call</Text>
          </View>
        </View>
        
        <View style={styles.impactBox}>
          <View>
            <Text style={styles.impactLabel}>Collect more</Text>
            <Text style={styles.impactValue}>$20-80K</Text>
          </View>
          <Text style={styles.impactDesc}>Per month thanks to early action with overdue customers.</Text>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Bluecore FDP - Financial Data Platform</Text>
          <Text style={styles.pageNumber}>9</Text>
        </View>
      </Page>

      {/* ========== Page 10: Use Case 4 - Cash Runway Forecast ========== */}
      <Page size="A4" style={styles.pageAlt}>
        <Text style={styles.eyebrowLabel}>USE CASE #4</Text>
        <Text style={styles.useCaseQuestion}>"How many months until we run out of cash?"</Text>
        
        {/* Story Block */}
        <View style={styles.storyBox}>
          <Text style={styles.storyTitle}>{useCaseStories.cashRunway.title}</Text>
          <Text style={styles.storyText}>{useCaseStories.cashRunway.text}</Text>
          <Text style={styles.storyResult}>{useCaseStories.cashRunway.result}</Text>
        </View>
        
        {/* Stylized Mockup - Runway Forecast */}
        <View style={styles.mockupContainer}>
          <View style={styles.mockupHeader}>
            <Text style={styles.mockupTitle}>Cash Runway Forecast</Text>
            <View style={styles.mockupLive}>
              <Text style={styles.mockupLiveText}>UPDATED TODAY</Text>
            </View>
          </View>
          
          <View style={styles.mockupKPIRow}>
            <View style={styles.mockupKPICardHighlight}>
              <Text style={styles.mockupKPILabel}>Current Cash Runway</Text>
              <Text style={styles.mockupKPIValueGreen}>4.2 months</Text>
            </View>
            <View style={styles.mockupKPICard}>
              <Text style={styles.mockupKPILabel}>Burn Rate / month</Text>
              <Text style={styles.mockupKPIValue}>$23.2K</Text>
            </View>
          </View>
          
          {/* Simplified forecast visualization */}
          <View style={{ marginTop: 10, padding: 12, backgroundColor: colors.background, borderRadius: 8 }}>
            <Text style={{ fontSize: 8, fontWeight: 700, color: colors.text, marginBottom: 10 }}>90-DAY FORECAST</Text>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 7, color: colors.textLight }}>Today</Text>
                <Text style={{ fontSize: 12, fontWeight: 700, color: colors.accent }}>$96K</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 7, color: colors.textLight }}>+30 days</Text>
                <Text style={{ fontSize: 12, fontWeight: 700, color: colors.primary }}>$72K</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 7, color: colors.textLight }}>+60 days</Text>
                <Text style={{ fontSize: 12, fontWeight: 700, color: colors.warning }}>$48K</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 7, color: colors.textLight }}>+90 days</Text>
                <Text style={{ fontSize: 12, fontWeight: 700, color: colors.danger }}>$24K</Text>
              </View>
            </View>
            
            {/* Progress bar visualization */}
            <View style={{ height: 8, backgroundColor: '#e2e8f0', borderRadius: 4, overflow: 'hidden', flexDirection: 'row' }}>
              <View style={{ width: '60%', backgroundColor: colors.accent }} />
              <View style={{ width: '20%', backgroundColor: colors.warning }} />
              <View style={{ width: '20%', backgroundColor: colors.danger }} />
            </View>
          </View>
        </View>
        
        <View style={styles.benefitRow}>
          <View style={styles.benefitCard}>
            <Text style={styles.benefitTitle}>What-if Scenarios</Text>
            <Text style={styles.benefitText}>If ad spend increases 20%? If AR collection delays 1 month?</Text>
          </View>
          <View style={styles.benefitCard}>
            <Text style={styles.benefitTitle}>Early warning</Text>
            <Text style={styles.benefitText}>Alert when runway falls below safety threshold</Text>
          </View>
        </View>
        
        <View style={styles.impactBox}>
          <View>
            <Text style={styles.impactLabel}>Know ahead</Text>
            <Text style={styles.impactValue}>2-3 months</Text>
          </View>
          <Text style={styles.impactDesc}>If cash is running out, have time to take action.</Text>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Bluecore FDP - Financial Data Platform</Text>
          <Text style={styles.pageNumber}>10</Text>
        </View>
      </Page>

      {/* ========== Page 11: FDP Manifesto ========== */}
      <Page size="A4" style={styles.pageAlt}>
        <Text style={styles.eyebrowLabel}>MANIFESTO</Text>
        <Text style={styles.sectionTitleCenter}>FDP Manifesto</Text>
        <Text style={styles.sectionSubtitleCenter}>
          10 immutable principles of Financial Data Platform — commitments Bluecore never compromises.
        </Text>
        
        <View style={styles.manifestoGrid}>
          {manifestoItems.map((item, index) => (
            <View key={index} style={styles.manifestoCard}>
              <Text style={styles.manifestoNumber}>{item.number}</Text>
              <Text style={styles.manifestoTitle}>{item.title}</Text>
              <Text style={styles.manifestoDesc}>{item.desc}</Text>
            </View>
          ))}
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Bluecore FDP - Financial Data Platform</Text>
          <Text style={styles.pageNumber}>11</Text>
        </View>
      </Page>

      {/* ========== Page 12: Contact/CTA ========== */}
      <Page size="A4" style={styles.coverPage}>
        <View style={[styles.coverOrnament, styles.coverCircle1]} />
        <View style={[styles.coverOrnament, styles.coverCircle2]} />
        <View style={[styles.coverOrnament, styles.coverCircle3]} />
        <Text style={styles.contactTitle}>Ready to see your Financial Truth?</Text>
        <Text style={styles.contactSubtitle}>
          Contact us for a live demo{'\n'}
          and consultation tailored to your business.
        </Text>
        
        <View style={styles.contactInfo}>
          <Text style={styles.contactItem}>sales@bluecore.vn</Text>
          <Text style={styles.contactItem}>bluecore.vn</Text>
        </View>
        
        <View style={styles.contactCTA}>
          <Text style={styles.contactCTAText}>Start Free Trial</Text>
        </View>
        
        <View style={{ position: 'absolute', bottom: 36 }}>
          <Text style={{ fontSize: 11, color: colors.white, opacity: 0.6 }}>
            Truth {'>'} Flexibility
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default FDPSalesDeckPDF_EN;
