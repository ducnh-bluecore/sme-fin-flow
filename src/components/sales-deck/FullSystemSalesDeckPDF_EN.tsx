/**
 * Full System Overview Sales Deck PDF Generator - ENGLISH VERSION
 * 
 * 17-slide comprehensive deck showcasing the entire Bluecore ecosystem
 * English content for international clients
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
  page: { padding: 40, fontFamily: 'NotoSans', backgroundColor: colors.white },
  pageAlt: { padding: 40, fontFamily: 'NotoSans', backgroundColor: colors.backgroundAlt },
  pageDark: { padding: 40, fontFamily: 'NotoSans', backgroundColor: colors.gradientStart },
  pageAccent: { padding: 40, fontFamily: 'NotoSans', backgroundColor: colors.primaryDark },
  
  coverPage: { padding: 60, fontFamily: 'NotoSans', backgroundColor: colors.gradientStart, justifyContent: 'center', alignItems: 'center', height: '100%' },
  coverTitle: { fontSize: 52, fontWeight: 700, color: colors.white, marginBottom: 12, textAlign: 'center', letterSpacing: 2 },
  coverSubtitle: { fontSize: 20, fontWeight: 400, color: colors.white, opacity: 0.9, textAlign: 'center', maxWidth: 500, lineHeight: 1.6, marginBottom: 32 },
  coverBadge: { backgroundColor: colors.accent, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 28, marginBottom: 20 },
  coverBadgeText: { fontSize: 14, fontWeight: 700, color: colors.white, letterSpacing: 2 },
  coverTagline: { fontSize: 16, fontWeight: 700, color: colors.accent, textAlign: 'center' },
  coverOrnament: { position: 'absolute', borderRadius: 9999, opacity: 0.08, backgroundColor: colors.white },
  
  eyebrowLabel: { fontSize: 10, fontWeight: 700, color: colors.primary, letterSpacing: 2, marginBottom: 8 },
  eyebrowLabelWhite: { fontSize: 10, fontWeight: 700, color: colors.accent, letterSpacing: 2, marginBottom: 8 },
  sectionTitle: { fontSize: 28, fontWeight: 700, color: colors.primaryDark, marginBottom: 12 },
  sectionTitleWhite: { fontSize: 28, fontWeight: 700, color: colors.white, marginBottom: 12, textAlign: 'center' },
  sectionSubtitle: { fontSize: 12, fontWeight: 400, color: colors.textLight, marginBottom: 24, maxWidth: 500, lineHeight: 1.6 },
  
  cardRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  card: { flex: 1, backgroundColor: colors.white, borderRadius: 12, padding: 20, borderWidth: 1, borderColor: '#e2e8f0' },
  cardDark: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', flexDirection: 'column' },
  cardTitle: { fontSize: 14, fontWeight: 700, color: colors.primaryDark, marginBottom: 8 },
  cardTitleWhite: { fontSize: 12, fontWeight: 700, color: colors.white, marginBottom: 6 },
  cardText: { fontSize: 10, color: colors.textLight, lineHeight: 1.5 },
  cardTextWhite: { fontSize: 9, color: 'rgba(255,255,255,0.75)', lineHeight: 1.4 },
  
  moduleCard: { width: '48%', backgroundColor: colors.white, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  moduleIcon: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  moduleTitle: { fontSize: 12, fontWeight: 700, color: colors.text, marginBottom: 4 },
  moduleTagline: { fontSize: 9, fontWeight: 700, color: colors.primary, marginBottom: 6 },
  moduleDesc: { fontSize: 9, color: colors.textLight, lineHeight: 1.4 },
  
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tableHeader: { flex: 1, padding: 10, backgroundColor: colors.primaryDark },
  tableHeaderText: { fontSize: 9, fontWeight: 700, color: colors.white, textAlign: 'center' },
  tableCell: { flex: 1, padding: 10, backgroundColor: colors.white },
  tableCellHighlight: { flex: 1, padding: 10, backgroundColor: '#ecfdf5' },
  tableCellText: { fontSize: 9, color: colors.text, textAlign: 'center' },
  tableCellTextBold: { fontSize: 9, fontWeight: 700, color: colors.accentDark, textAlign: 'center' },
  
  useCaseContainer: { backgroundColor: colors.white, borderRadius: 12, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  useCaseStory: { fontSize: 10, color: colors.textLight, lineHeight: 1.6, marginBottom: 12 },
  useCaseResult: { flexDirection: 'row', gap: 16 },
  useCaseResultItem: { flex: 1, backgroundColor: colors.background, borderRadius: 8, padding: 12, alignItems: 'center' },
  
  pillarCard: { flex: 1, alignItems: 'center', padding: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  pillarTitle: { fontSize: 14, fontWeight: 700, color: colors.white, marginTop: 8, textAlign: 'center' },
  pillarDesc: { fontSize: 9, color: 'rgba(255,255,255,0.7)', marginTop: 6, textAlign: 'center', lineHeight: 1.4 },
  
  manifestoItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, paddingLeft: 4 },
  manifestoNumber: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  manifestoNumberText: { fontSize: 10, fontWeight: 700, color: colors.white },
  manifestoText: { flex: 1, fontSize: 10, color: colors.text, lineHeight: 1.5 },
  manifestoTextBold: { fontWeight: 700, color: colors.primaryDark },
  
  footer: { position: 'absolute', bottom: 20, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerText: { fontSize: 8, color: colors.textLight },
  footerTextWhite: { fontSize: 8, color: 'rgba(255,255,255,0.6)' },
  pageNumber: { fontSize: 9, color: colors.textLight },
  pageNumberWhite: { fontSize: 9, color: 'rgba(255,255,255,0.6)' },
  
  // Screenshot styles
  screenshotContainer: { marginVertical: 12, alignItems: 'center' },
  screenshot: { width: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0' },
  screenshotHalf: { width: '100%', maxHeight: 140, objectFit: 'contain', borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0' },
  screenshotCaption: { fontSize: 8, color: '#64748b', marginTop: 4, textAlign: 'center', fontStyle: 'italic' },
});

// ============= DATA CONSTANTS =============

const threePillars = [
  { title: 'REAL CASH', desc: 'Actual money in the bank, not revenue on paper', icon: 'VND' },
  { title: 'TRUTH FIRST', desc: 'Financial reality, not beautified metrics', icon: 'TRUE' },
  { title: 'ACTION NOW', desc: 'Decide today, not wait for month-end reports', icon: 'NOW' },
];

const platformModules = [
  { id: 'fdp', name: 'FDP', fullName: 'Financial Data Platform', tagline: 'Truth > Flexibility', color: colors.primary, description: 'Financial foundation - Single Source of Truth for Net Revenue, Contribution Margin, and Real Cash Position.', features: ['CFO Dashboard', 'Unit Economics', 'Cash Flow Direct', 'Working Capital', 'AR/AP Operations'] },
  { id: 'mdp', name: 'MDP', fullName: 'Marketing Data Platform', tagline: 'Profit before Performance', color: colors.purple, description: 'Measure true financial value of Marketing - Profit ROAS instead of Click ROAS.', features: ['Profit Attribution', 'Cash Impact', 'CAC Payback', 'Channel P&L', 'Scale/Kill Decisions'] },
  { id: 'cdp', name: 'CDP', fullName: 'Customer Data Platform', tagline: 'Population > Individual', color: colors.accent, description: 'Track customer portfolio health - LTV Decay, Cohort Shift, Revenue at Risk.', features: ['Customer Equity', 'LTV Forecast', 'Cohort Analysis', 'Churn Prediction', 'At-Risk Revenue'] },
  { id: 'ct', name: 'Control Tower', fullName: 'Command Center', tagline: 'Awareness before Analytics', color: colors.warning, description: 'Alerts and actions - Only focus on "what is wrong" with Impact, Deadline, and Owner.', features: ['Max 7 Alerts', 'Impact Calculation', 'Auto-Escalation', 'Resolution Tracking', 'Cross-module Sync'] },
  { id: 'dw', name: 'Financial Spine', fullName: 'Data Foundation', tagline: 'No Spine = Different numbers everywhere', color: colors.cyan, description: 'Centralized data foundation with 35+ connectors for Vietnam market. Without Financial Spine, Control Tower is meaningless.', features: ['35+ Connectors', 'Single Source of Truth', 'Real-time Sync', '1-2 Weeks Deploy', 'Zero Reconcile'] },
];

const hiddenCosts = [
  { title: '2-3% Net Revenue Discrepancy', pain: 'Wrong inventory decisions, over-purchasing $20,000 of unsellable stock', cost: '$20,000 USD' },
  { title: 'Positive ROAS but Negative Profit', pain: 'Marketing reports "winning" while actually burning $8,000/month silently', cost: '$96,000 USD/year' },
  { title: 'Missing Cash Gap Early', pain: 'Discover cash shortage too late, forced emergency loans at 18-24% interest', cost: 'Interest + Lost credibility' },
  { title: 'Overdue AR Nobody Knows', pain: '$30,000 bad debt accumulating silently, only discovered at year-end audit', cost: '$30,000 USD bad debt' },
];

const competitiveComparison = [
  { criteria: 'Deployment Time', excel: '0 (but chaos)', powerbi: '3-6 months', custom: '6-12 months', bluecore: '1-2 weeks' },
  { criteria: 'VN Platform Integration', excel: '100% Manual', powerbi: 'Custom API code', custom: 'Build from scratch', bluecore: '35+ native' },
  { criteria: 'Unit Economics', excel: 'None', powerbi: 'Self-calculate', custom: 'Depends on dev', bluecore: 'Built-in' },
  { criteria: 'Real Cash Tracking', excel: 'No', powerbi: 'No', custom: 'Possible', bluecore: 'Built-in' },
  { criteria: 'Alert System', excel: 'No', powerbi: 'Basic', custom: 'Depends', bluecore: 'Financial-first' },
  { criteria: 'Maintenance Cost', excel: 'Low', powerbi: 'Medium', custom: 'Very High', bluecore: 'Fixed' },
];

const useCases = [
  { id: '1', title: 'Daily Financial Health Check', persona: 'CEO Retail', story: 'Every morning, Mike - CEO of a fashion chain - opens Bluecore instead of calling accounting. In 30 seconds, he sees: Available cash $50K, 3 large unpaid orders $15K, and 1 SKU losing 15% margin.', modules: ['FDP', 'Control Tower'], results: [{ label: 'Check time', before: '2 hours', after: '30 seconds' }, { label: 'Decision making', before: 'Month-end', after: 'Real-time' }] },
  { id: '2', title: 'Marketing Budget Allocation', persona: 'CMO E-commerce', story: 'Lisa runs marketing for a cosmetics brand. Previously, she chased 3.5x ROAS but couldn\'t understand why profit didn\'t increase. MDP revealed: Shopee Ads has Profit ROAS of only 0.8x after deducting platform fees, shipping, and returns.', modules: ['MDP', 'FDP'], results: [{ label: 'Profit ROAS visibility', before: '0%', after: '100%' }, { label: 'Budget efficiency', before: '50%', after: '85%' }] },
  { id: '3', title: 'Cash Flow Crisis Warning', persona: 'CFO FMCG', story: 'David manages finance for a food company. Control Tower detected: Shopee settlement delayed 5 days + 3 B2B orders $30K overdue = Cash gap $45K in 7 days. He had time to act before the crisis.', modules: ['Control Tower', 'FDP'], results: [{ label: 'Risk detection', before: 'When it happens', after: '7 days ahead' }, { label: 'Cash gap avoided', before: '-', after: '$45K USD' }] },
  { id: '4', title: 'Customer Health Monitoring', persona: 'Founder D2C', story: 'Tom founded a D2C startup. CDP showed: Q1/2024 cohort has 40% LTV decay after 6 months - 2x faster than old cohorts. At-risk revenue: $80K. He adjusted retention campaigns before losing customers.', modules: ['CDP', 'MDP'], results: [{ label: 'Churn visibility', before: 'Quarterly', after: 'Weekly' }, { label: 'Revenue protected', before: '-', after: '$50K USD' }] },
];

const manifesto = [
  { title: 'SINGLE SOURCE OF TRUTH', desc: '1 Net Revenue, 1 Contribution Margin, 1 Cash Position. No other version.' },
  { title: 'REAL CASH', desc: 'Distinguish: Money received / will receive / at risk / locked.' },
  { title: 'REVENUE ↔ COST', desc: 'Every revenue comes with cost. No revenue "stands alone".' },
  { title: 'UNIT ECONOMICS → ACTION', desc: 'Losing SKU + locked cash + rising risk → must say STOP.' },
  { title: 'TODAY\'S DECISION', desc: 'Serve today\'s decision, not month-end reports.' },
  { title: 'SURFACE PROBLEMS', desc: 'Don\'t beautify numbers, don\'t hide anomalies, surface problems early.' },
  { title: 'AWARENESS BEFORE ANALYTICS', desc: 'Know what\'s wrong before detailed analysis.' },
  { title: 'PROFIT BEFORE PERFORMANCE', desc: 'Real profit before paper marketing metrics.' },
  { title: 'POPULATION > INDIVIDUAL', desc: 'Customer portfolio health matters more than individual CRM.' },
  { title: 'FINAL TEST', desc: 'If it doesn\'t make decisions clearer → Bluecore has failed.' },
];

// ============= PAGE COMPONENTS =============

const CoverPage = () => (
  <Page size="A4" style={styles.coverPage}>
    <View style={[styles.coverOrnament, { width: 600, height: 600, top: -200, right: -250 }]} />
    <View style={[styles.coverOrnament, { width: 700, height: 700, bottom: -300, left: -350, opacity: 0.05 }]} />
    <View style={styles.coverBadge}>
      <Text style={styles.coverBadgeText}>EXECUTIVE DECISION OS</Text>
    </View>
    <Text style={styles.coverTitle}>BLUECORE</Text>
    <Text style={styles.coverSubtitle}>
      Financial Decision Platform for CEO/CFO in Retail & E-commerce
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
    <Text style={styles.eyebrowLabelWhite}>CORE VALUES</Text>
    <Text style={styles.sectionTitleWhite}>3 Pillars of Bluecore</Text>
    <View style={{ flexDirection: 'row', gap: 16, marginTop: 40 }}>
      {threePillars.map((pillar, index) => (
        <View key={index} style={styles.pillarCard}>
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 12, fontWeight: 700, color: colors.white }}>{pillar.icon}</Text>
          </View>
          <Text style={styles.pillarTitle}>{pillar.title}</Text>
          <Text style={styles.pillarDesc}>{pillar.desc}</Text>
        </View>
      ))}
    </View>
    <View style={{ marginTop: 40, padding: 24, backgroundColor: 'rgba(16, 185, 129, 0.15)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)' }}>
      <Text style={{ fontSize: 16, fontWeight: 700, color: colors.white, textAlign: 'center', marginBottom: 12 }}>
        "Bluecore is not BI — not ERP"
      </Text>
      <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 1.6 }}>
        BI gives you charts. ERP gives you processes. Bluecore gives you DECISIONS — with real financial data, instantly.
      </Text>
    </View>
    <View style={styles.footer}>
      <Text style={styles.footerTextWhite}>bluecore.vn</Text>
      <Text style={styles.pageNumberWhite}>2 / 17</Text>
    </View>
  </Page>
);

const HiddenCostPage = () => (
  <Page size="A4" style={styles.page}>
    <Text style={[styles.eyebrowLabel, { color: colors.danger }]}>WARNING</Text>
    <Text style={styles.sectionTitle}>The Hidden Cost of Not Knowing</Text>
    <Text style={styles.sectionSubtitle}>
      Silent losses happening every day when businesses lack a reliable source of financial truth.
    </Text>
    <View style={{ gap: 12 }}>
      {hiddenCosts.map((item, index) => (
        <View key={index} style={{ backgroundColor: index === 0 ? '#fef2f2' : colors.white, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: index === 0 ? '#fecaca' : '#e2e8f0', flexDirection: 'row', alignItems: 'flex-start' }}>
          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.danger, justifyContent: 'center', alignItems: 'center', marginRight: 14 }}>
            <Text style={{ fontSize: 14, fontWeight: 700, color: colors.white }}>!</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, fontWeight: 700, color: colors.danger, marginBottom: 4 }}>{item.title}</Text>
            <Text style={{ fontSize: 10, color: colors.text, lineHeight: 1.5, marginBottom: 6 }}>{item.pain}</Text>
            <Text style={{ fontSize: 11, fontWeight: 700, color: colors.primaryDark }}>Loss: {item.cost}</Text>
          </View>
        </View>
      ))}
    </View>
    <View style={{ marginTop: 20, backgroundColor: colors.danger, borderRadius: 12, padding: 16 }}>
      <Text style={{ fontSize: 12, fontWeight: 700, color: colors.white, textAlign: 'center' }}>
        Businesses don't die from lack of money. They die from NOT KNOWING they're about to run out.
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
    <Text style={styles.eyebrowLabel}>ECOSYSTEM</Text>
    <Text style={styles.sectionTitle}>5 Modules — 1 Financial Truth</Text>
    <Text style={styles.sectionSubtitle}>
      Each module solves a different angle, but all share the same source of financial truth.
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
    <Text style={styles.sectionSubtitle}>Financial foundation for CEO/CFO — Single Source of Truth for all business decisions.</Text>
    
    {/* Screenshot: CFO Dashboard */}
    <View style={styles.screenshotContainer}>
      <Image 
        src={`${getBaseUrl()}/screenshots/cfo-dashboard.png`}
        style={styles.screenshot}
      />
      <Text style={styles.screenshotCaption}>
        CFO Dashboard - Real-time Liquidity & Cash Position
      </Text>
    </View>
    
    <View style={styles.cardRow}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Real Cash Breakdown</Text>
        <Text style={styles.cardText}>Cash received vs. expected vs. at risk vs. locked.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Unit Economics</Text>
        <Text style={styles.cardText}>Contribution Margin per SKU/Channel. Know instantly which products are losing.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Working Capital</Text>
        <Text style={styles.cardText}>DSO, DIO, DPO, Cash Conversion Cycle automated.</Text>
      </View>
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
    <Text style={styles.sectionSubtitle}>Measure true financial value of Marketing — Profit ROAS, not Click ROAS.</Text>
    
    {/* Screenshot: Profit Attribution */}
    <View style={styles.screenshotContainer}>
      <Image 
        src={`${getBaseUrl()}/screenshots/mdp-profit-attribution.png`}
        style={styles.screenshot}
      />
      <Text style={styles.screenshotCaption}>
        Profit Attribution - True P&L for each campaign (after COGS, platform fees, returns)
      </Text>
    </View>
    
    <View style={styles.cardRow}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Cash Impact</Text>
        <Text style={styles.cardText}>Marketing spends first, collects later. Track Days to Cash per channel.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Decision Panel</Text>
        <Text style={styles.cardText}>3 decisions: SCALE (increase), HOLD (maintain), or KILL (stop now).</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Risk Alerts</Text>
        <Text style={styles.cardText}>Warnings when CAC Payback &gt; 6 months, Burn Rate exceeds threshold.</Text>
      </View>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerText}>bluecore.vn</Text>
      <Text style={styles.pageNumber}>6 / 17</Text>
    </View>
  </Page>
);

const CDPControlTowerPage = () => (
  <Page size="A4" style={styles.pageAlt}>
    {/* Two screenshots side by side */}
    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Image 
          src={`${getBaseUrl()}/screenshots/cdp-customer-verification.png`}
          style={styles.screenshotHalf}
        />
        <Text style={styles.screenshotCaption}>
          CDP - Customer Profile 360° with RFM & LTV
        </Text>
      </View>
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Image 
          src={`${getBaseUrl()}/screenshots/control-tower.png`}
          style={styles.screenshotHalf}
        />
        <Text style={styles.screenshotCaption}>
          Control Tower - Decision Cards & Bluecore Scores
        </Text>
      </View>
    </View>
    
    <View style={{ flexDirection: 'row', gap: 16 }}>
      {/* CDP Column */}
      <View style={{ flex: 1 }}>
        <Text style={styles.eyebrowLabel}>MODULE 3: CDP</Text>
        <Text style={{ fontSize: 14, fontWeight: 700, color: colors.primaryDark, marginBottom: 6 }}>Customer Data Platform</Text>
        
        <View style={{ backgroundColor: colors.white, borderRadius: 8, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' }}>
          <Text style={{ fontSize: 10, fontWeight: 700, color: colors.text, marginBottom: 2 }}>Customer Equity</Text>
          <Text style={{ fontSize: 8, color: colors.textLight, lineHeight: 1.3 }}>LTV 12M, 24M Forecast, At-Risk Value</Text>
        </View>
        
        <View style={{ backgroundColor: colors.white, borderRadius: 8, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' }}>
          <Text style={{ fontSize: 10, fontWeight: 700, color: colors.text, marginBottom: 2 }}>LTV Decay Analysis</Text>
          <Text style={{ fontSize: 8, color: colors.textLight, lineHeight: 1.3 }}>Detect cohorts decaying faster than normal</Text>
        </View>
      </View>
      
      {/* Control Tower Column */}
      <View style={{ flex: 1 }}>
        <Text style={[styles.eyebrowLabel, { color: colors.warning }]}>MODULE 4: CONTROL TOWER</Text>
        <Text style={{ fontSize: 14, fontWeight: 700, color: colors.primaryDark, marginBottom: 6 }}>Command Center</Text>
        
        <View style={{ backgroundColor: colors.white, borderRadius: 8, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' }}>
          <Text style={{ fontSize: 10, fontWeight: 700, color: colors.text, marginBottom: 2 }}>Max 7 Alerts</Text>
          <Text style={{ fontSize: 8, color: colors.textLight, lineHeight: 1.3 }}>Impact (USD) + Deadline + Owner</Text>
        </View>
        
        <View style={{ backgroundColor: colors.white, borderRadius: 8, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' }}>
          <Text style={{ fontSize: 10, fontWeight: 700, color: colors.text, marginBottom: 2 }}>Auto-Escalation</Text>
          <Text style={{ fontSize: 8, color: colors.textLight, lineHeight: 1.3 }}>Auto-escalate to leadership if unresolved</Text>
        </View>
      </View>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerText}>bluecore.vn</Text>
      <Text style={styles.pageNumber}>7 / 17</Text>
    </View>
  </Page>
);

const ComparisonPage = () => (
  <Page size="A4" style={styles.pageAlt}>
    <Text style={styles.eyebrowLabel}>COMPARISON</Text>
    <Text style={styles.sectionTitle}>Bluecore vs. Alternatives</Text>
    <View style={{ marginTop: 16, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0' }}>
      <View style={styles.tableRow}>
        <View style={[styles.tableHeader, { flex: 1.5 }]}><Text style={styles.tableHeaderText}>Criteria</Text></View>
        <View style={styles.tableHeader}><Text style={styles.tableHeaderText}>Excel</Text></View>
        <View style={styles.tableHeader}><Text style={styles.tableHeaderText}>Power BI</Text></View>
        <View style={styles.tableHeader}><Text style={styles.tableHeaderText}>Custom</Text></View>
        <View style={[styles.tableHeader, { backgroundColor: colors.accentDark }]}><Text style={styles.tableHeaderText}>Bluecore</Text></View>
      </View>
      {competitiveComparison.map((row, index) => (
        <View key={index} style={styles.tableRow}>
          <View style={[styles.tableCell, { flex: 1.5 }]}><Text style={styles.tableCellText}>{row.criteria}</Text></View>
          <View style={styles.tableCell}><Text style={styles.tableCellText}>{row.excel}</Text></View>
          <View style={styles.tableCell}><Text style={styles.tableCellText}>{row.powerbi}</Text></View>
          <View style={styles.tableCell}><Text style={styles.tableCellText}>{row.custom}</Text></View>
          <View style={styles.tableCellHighlight}><Text style={styles.tableCellTextBold}>{row.bluecore}</Text></View>
        </View>
      ))}
    </View>
    <View style={{ marginTop: 20, backgroundColor: colors.primaryDark, borderRadius: 12, padding: 16 }}>
      <Text style={{ fontSize: 11, fontWeight: 700, color: colors.white, textAlign: 'center' }}>
        Bluecore is designed specifically for Retail & E-commerce — no customization needed, ready to use immediately.
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
    <View style={{ backgroundColor: colors.backgroundAlt, borderRadius: 12, padding: 16, marginBottom: 16, flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginRight: 12 }}>
        <Text style={{ fontSize: 9, fontWeight: 700, color: colors.white }}>{useCases[0].persona}</Text>
      </View>
      <Text style={{ fontSize: 9, color: colors.textLight }}>Modules: {useCases[0].modules.join(' + ')}</Text>
    </View>
    <View style={styles.useCaseContainer}>
      <Text style={{ fontSize: 11, fontWeight: 700, color: colors.primaryDark, marginBottom: 10 }}>Story</Text>
      <Text style={styles.useCaseStory}>{useCases[0].story}</Text>
      <Text style={{ fontSize: 11, fontWeight: 700, color: colors.primaryDark, marginBottom: 10 }}>Results</Text>
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
    <View style={{ backgroundColor: colors.white, borderRadius: 12, padding: 16, marginBottom: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' }}>
      <View style={{ backgroundColor: colors.purple, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginRight: 12 }}>
        <Text style={{ fontSize: 9, fontWeight: 700, color: colors.white }}>{useCases[1].persona}</Text>
      </View>
      <Text style={{ fontSize: 9, color: colors.textLight }}>Modules: {useCases[1].modules.join(' + ')}</Text>
    </View>
    <View style={[styles.useCaseContainer, { backgroundColor: colors.white }]}>
      <Text style={{ fontSize: 11, fontWeight: 700, color: colors.primaryDark, marginBottom: 10 }}>Story</Text>
      <Text style={styles.useCaseStory}>{useCases[1].story}</Text>
      <Text style={{ fontSize: 11, fontWeight: 700, color: colors.primaryDark, marginBottom: 10 }}>Results</Text>
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
    <View style={{ backgroundColor: colors.backgroundAlt, borderRadius: 12, padding: 16, marginBottom: 16, flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ backgroundColor: colors.warning, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginRight: 12 }}>
        <Text style={{ fontSize: 9, fontWeight: 700, color: colors.white }}>{useCases[2].persona}</Text>
      </View>
      <Text style={{ fontSize: 9, color: colors.textLight }}>Modules: {useCases[2].modules.join(' + ')}</Text>
    </View>
    <View style={styles.useCaseContainer}>
      <Text style={{ fontSize: 11, fontWeight: 700, color: colors.primaryDark, marginBottom: 10 }}>Story</Text>
      <Text style={styles.useCaseStory}>{useCases[2].story}</Text>
      <Text style={{ fontSize: 11, fontWeight: 700, color: colors.primaryDark, marginBottom: 10 }}>Results</Text>
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
    <View style={{ backgroundColor: colors.white, borderRadius: 12, padding: 16, marginBottom: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' }}>
      <View style={{ backgroundColor: colors.accent, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginRight: 12 }}>
        <Text style={{ fontSize: 9, fontWeight: 700, color: colors.white }}>{useCases[3].persona}</Text>
      </View>
      <Text style={{ fontSize: 9, color: colors.textLight }}>Modules: {useCases[3].modules.join(' + ')}</Text>
    </View>
    <View style={[styles.useCaseContainer, { backgroundColor: colors.white }]}>
      <Text style={{ fontSize: 11, fontWeight: 700, color: colors.primaryDark, marginBottom: 10 }}>Story</Text>
      <Text style={styles.useCaseStory}>{useCases[3].story}</Text>
      <Text style={{ fontSize: 11, fontWeight: 700, color: colors.primaryDark, marginBottom: 10 }}>Results</Text>
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
    <Text style={styles.eyebrowLabelWhite}>WHY BLUECORE?</Text>
    <Text style={styles.sectionTitleWhite}>6 Reasons to Choose Bluecore</Text>
    <View style={{ marginTop: 16 }}>
      <View style={[styles.cardDark, { marginBottom: 8 }]}>
        <View><Text style={styles.cardTitleWhite}>1. Designed for CEO/CFO, not Analysts</Text></View>
        <View><Text style={styles.cardTextWhite}>No SQL needed. No waiting for reports. Open Bluecore = see decisions needed today immediately.</Text></View>
      </View>
      <View style={[styles.cardDark, { marginBottom: 8 }]}>
        <View><Text style={styles.cardTitleWhite}>2. Native for Vietnam Market</Text></View>
        <View><Text style={styles.cardTextWhite}>35+ connectors available: Shopee, Lazada, TikTok, Haravan, Sapo, KiotViet. No code, no IT needed.</Text></View>
      </View>
      <View style={[styles.cardDark, { marginBottom: 8 }]}>
        <View><Text style={styles.cardTitleWhite}>3. Financial Truth, not Performance Metrics</Text></View>
        <View><Text style={styles.cardTextWhite}>Profit ROAS instead of Click ROAS. Real Cash instead of Revenue on paper. Contribution Margin instead of Gross Sales.</Text></View>
      </View>
      <View style={[styles.cardDark, { marginBottom: 8 }]}>
        <View><Text style={styles.cardTitleWhite}>4. Deploy in 1-2 weeks, not 6 months</Text></View>
        <View><Text style={styles.cardTextWhite}>No dedicated project team. No hiring consultants. Bluecore team handles all integration.</Text></View>
      </View>
      <View style={[styles.cardDark, { marginBottom: 8 }]}>
        <View><Text style={styles.cardTitleWhite}>5. Fixed cost, no "surprises"</Text></View>
        <View><Text style={styles.cardTextWhite}>No hidden fees. No per-user/data volume charges. One price — all features.</Text></View>
      </View>
      <View style={[styles.cardDark, { backgroundColor: 'rgba(239, 68, 68, 0.2)', borderColor: 'rgba(239, 68, 68, 0.4)' }]}>
        <View><Text style={[styles.cardTitleWhite, { color: '#fca5a5' }]}>6. Not using Bluecore = Decisions in the dark</Text></View>
        <View><Text style={styles.cardTextWhite}>Not knowing real cash left. Not knowing if marketing is profitable. Not knowing customers are leaving. Wait until month-end to know — too late.</Text></View>
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
    <Text style={styles.sectionTitle}>10 Immutable Principles</Text>
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
    <Text style={styles.eyebrowLabel}>SYSTEM ARCHITECTURE</Text>
    <Text style={styles.sectionTitle}>Data Flow Architecture</Text>
    <View style={{ backgroundColor: colors.white, borderRadius: 12, padding: 24, marginTop: 16, borderWidth: 1, borderColor: '#e2e8f0' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
        {['Shopee', 'Lazada', 'TikTok', 'ERP', 'Bank'].map((source, index) => (
          <View key={index} style={{ backgroundColor: colors.backgroundAlt, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}>
            <Text style={{ fontSize: 9, color: colors.text }}>{source}</Text>
          </View>
        ))}
      </View>
      <View style={{ alignItems: 'center', marginBottom: 16 }}>
        <Text style={{ fontSize: 20, color: colors.textLight }}>↓</Text>
        <Text style={{ fontSize: 9, color: colors.textLight }}>ETL Pipeline</Text>
      </View>
      <View style={{ backgroundColor: colors.cyan, borderRadius: 8, padding: 16, marginBottom: 16, alignItems: 'center' }}>
        <Text style={{ fontSize: 12, fontWeight: 700, color: colors.white }}>DATA WAREHOUSE</Text>
        <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>Single Source of Truth</Text>
      </View>
      <View style={{ alignItems: 'center', marginBottom: 16 }}>
        <Text style={{ fontSize: 20, color: colors.textLight }}>↓</Text>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
        {[{ name: 'FDP', color: colors.primary }, { name: 'MDP', color: colors.purple }, { name: 'CDP', color: colors.accent }, { name: 'Control Tower', color: colors.warning }].map((module, index) => (
          <View key={index} style={{ flex: 1, backgroundColor: module.color, borderRadius: 8, padding: 12, alignItems: 'center' }}>
            <Text style={{ fontSize: 10, fontWeight: 700, color: colors.white }}>{module.name}</Text>
          </View>
        ))}
      </View>
    </View>
    <View style={{ marginTop: 16, backgroundColor: '#ecfdf5', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#a7f3d0' }}>
      <Text style={{ fontSize: 11, fontWeight: 700, color: colors.accentDark, marginBottom: 8 }}>Why this architecture matters?</Text>
      <Text style={{ fontSize: 10, color: colors.text, lineHeight: 1.5 }}>
        All modules (FDP, MDP, CDP, Control Tower) read from the same Data Warehouse. No "different version" of data. CFO and CMO see the same numbers — no arguments, no reconciliation.
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
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 14, fontWeight: 700, color: colors.accent, letterSpacing: 2, marginBottom: 16 }}>NEXT STEPS</Text>
      <Text style={{ fontSize: 36, fontWeight: 700, color: colors.white, textAlign: 'center', marginBottom: 24 }}>Ready to See the Truth?</Text>
      <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'center', maxWidth: 400, lineHeight: 1.6, marginBottom: 40 }}>
        Schedule a 30-minute demo to see how Bluecore transforms your financial decision-making.
      </Text>
      <View style={{ flexDirection: 'row', gap: 40 }}>
        <View style={{ alignItems: 'center' }}>
          <View style={{ backgroundColor: colors.accent, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}>
            <Text style={{ fontSize: 11, fontWeight: 700, color: colors.white }}>Book Demo</Text>
          </View>
          <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 8 }}>30-minute session</Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }}>
            <Text style={{ fontSize: 11, fontWeight: 700, color: colors.white }}>Contact Sales</Text>
          </View>
          <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 8 }}>sales@bluecore.vn</Text>
        </View>
      </View>
    </View>
    <View style={styles.footer}>
      <Text style={styles.footerTextWhite}>bluecore.vn</Text>
      <Text style={styles.pageNumberWhite}>17 / 17</Text>
    </View>
  </Page>
);

// ============= MAIN DOCUMENT =============

const FullSystemSalesDeckPDF_EN: React.FC = () => (
  <Document>
    <CoverPage />
    <PillarsPage />
    <HiddenCostPage />
    <EcosystemOverviewPage />
    <FDPDetailPage />
    <MDPDetailPage />
    <CDPControlTowerPage />
    <ComparisonPage />
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

export default FullSystemSalesDeckPDF_EN;
