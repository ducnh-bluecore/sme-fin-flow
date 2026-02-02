/**
 * FDP Sales Deck PDF Generator - ENGLISH VERSION
 * 
 * 12-slide narrative deck telling the Cash Flow Story for SME Retail
 * English content for international clients
 */

import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';

const getBaseUrl = () => {
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
};

// FDP Screenshot URLs (from assets)
const getFdpImages = () => ({
  dashboard: `${getBaseUrl()}/screenshots/cfo-dashboard.png`,
  unitEconomics: `${getBaseUrl()}/screenshots/unit-economics.png`,
  cashPosition: `${getBaseUrl()}/screenshots/cash-position.png`,
  decisionDetail: `${getBaseUrl()}/screenshots/decision-detail.png`,
  riskDashboard: `${getBaseUrl()}/screenshots/risk-dashboard.png`,
  workingCapital: `${getBaseUrl()}/screenshots/working-capital.png`,
});

Font.register({
  family: 'NotoSans',
  fonts: [
    { src: `${getBaseUrl()}/fonts/NotoSans-Regular.ttf`, fontWeight: 400 },
    { src: `${getBaseUrl()}/fonts/NotoSans-Bold.ttf`, fontWeight: 700 },
  ],
});

const colors = {
  primary: '#3b82f6',
  primaryDark: '#1e40af',
  accent: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  text: '#1f2937',
  textLight: '#6b7280',
  background: '#f8fafc',
  white: '#ffffff',
};

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'NotoSans', backgroundColor: colors.white },
  pageDark: { padding: 40, fontFamily: 'NotoSans', backgroundColor: colors.primaryDark },
  coverPage: { padding: 60, fontFamily: 'NotoSans', backgroundColor: colors.primaryDark, justifyContent: 'center', alignItems: 'center', height: '100%' },
  coverTitle: { fontSize: 48, fontWeight: 700, color: colors.white, marginBottom: 16, textAlign: 'center' },
  coverSubtitle: { fontSize: 18, color: colors.white, opacity: 0.9, textAlign: 'center', maxWidth: 420, lineHeight: 1.6 },
  coverBadge: { marginTop: 40, backgroundColor: colors.accent, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  coverBadgeText: { fontSize: 14, fontWeight: 700, color: colors.white, letterSpacing: 1 },
  coverTagline: { marginTop: 24, fontSize: 16, fontWeight: 700, color: colors.accent },
  eyebrowLabel: { fontSize: 10, fontWeight: 700, color: colors.primary, letterSpacing: 1, marginBottom: 8 },
  sectionTitle: { fontSize: 26, fontWeight: 700, color: colors.primaryDark, marginBottom: 10 },
  sectionTitleWhite: { fontSize: 26, fontWeight: 700, color: colors.white, marginBottom: 10, textAlign: 'center' },
  sectionSubtitle: { fontSize: 12, color: colors.textLight, marginBottom: 24, maxWidth: 480, lineHeight: 1.5 },
  card: { backgroundColor: colors.white, padding: 16, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 12 },
  cardTitle: { fontSize: 12, fontWeight: 700, color: colors.primaryDark, marginBottom: 6 },
  cardText: { fontSize: 10, color: colors.textLight, lineHeight: 1.5 },
  footer: { position: 'absolute', bottom: 20, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 8, color: colors.textLight },
  footerTextWhite: { fontSize: 8, color: 'rgba(255,255,255,0.6)' },
  pageNumber: { fontSize: 9, color: colors.textLight },
  // Screenshot styles
  screenshotContainer: { marginVertical: 16, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0' },
  screenshotImage: { width: '100%', height: 180, objectFit: 'cover' },
  screenshotLabel: { fontSize: 8, color: colors.textLight, textAlign: 'center', marginTop: 6 },
  screenshotFullWidth: { width: '100%', height: 220, objectFit: 'contain' },
  twoColumnRow: { flexDirection: 'row', gap: 12 },
  halfColumn: { flex: 1 },
});

const painPoints = [
  { title: 'No Real Cash Visibility', desc: 'Revenue reported but how much actually in the bank? Accounting says "wait for month-end".' },
  { title: 'Unit Economics Unknown', desc: 'Which SKU is profitable? Which channel is bleeding money? Nobody knows until too late.' },
  { title: 'Cash Flow Surprises', desc: 'Suddenly running out of cash. Emergency loans at 18-24% interest rate.' },
  { title: 'Multiple Versions of Truth', desc: 'Sales says $100K. Finance says $80K. Marketing says $120K. Who is right?' },
];

const solutions = [
  { title: 'CFO Dashboard', desc: 'Net Revenue, Contribution Margin, Real Cash — all in one screen, updated daily.' },
  { title: 'Real Cash Breakdown', desc: 'Cash received vs expected vs at-risk vs locked. Know your real payment capacity.' },
  { title: 'Unit Economics', desc: 'Contribution Margin per SKU and Channel. Stop the bleeding instantly.' },
  { title: 'Working Capital', desc: 'DSO, DIO, DPO, Cash Conversion Cycle. Understand where money is stuck.' },
];

const manifesto = [
  'FDP is NOT accounting software — it serves CEO/CFO decision-making',
  'Single Source of Truth — 1 Net Revenue, 1 Contribution Margin, 1 Cash Position',
  'Real Cash — distinguish money received vs expected vs at-risk vs locked',
  'Revenue ↔ Cost — every revenue comes with associated costs',
  'Unit Economics → Action — losing SKU + locked cash = STOP immediately',
];

const FDPSalesDeckPDF_EN: React.FC = () => (
  <Document>
    {/* Cover */}
    <Page size="A4" style={styles.coverPage}>
      <View style={styles.coverBadge}><Text style={styles.coverBadgeText}>FINANCIAL DATA PLATFORM</Text></View>
      <Text style={styles.coverTitle}>FDP</Text>
      <Text style={styles.coverSubtitle}>Single Source of Financial Truth for CEO/CFO Decision Making</Text>
      <Text style={styles.coverTagline}>Truth &gt; Flexibility</Text>
      <View style={styles.footer}><Text style={styles.footerTextWhite}>bluecore.vn</Text><Text style={styles.footerTextWhite}>1 / 12</Text></View>
    </Page>

    {/* Pain Points */}
    <Page size="A4" style={styles.page}>
      <Text style={styles.eyebrowLabel}>THE PROBLEM</Text>
      <Text style={styles.sectionTitle}>Cash Flow Chaos in SME Retail</Text>
      <Text style={styles.sectionSubtitle}>Every CEO asks the same questions every morning — and nobody has real answers.</Text>
      {painPoints.map((p, i) => (
        <View key={i} style={styles.card}>
          <Text style={styles.cardTitle}>{p.title}</Text>
          <Text style={styles.cardText}>{p.desc}</Text>
        </View>
      ))}
      <View style={styles.footer}><Text style={styles.footerText}>bluecore.vn</Text><Text style={styles.pageNumber}>2 / 12</Text></View>
    </Page>

    {/* Solution with Dashboard Screenshot */}
    <Page size="A4" style={styles.page}>
      <Text style={styles.eyebrowLabel}>THE SOLUTION</Text>
      <Text style={styles.sectionTitle}>FDP — Financial Data Platform</Text>
      <Text style={styles.sectionSubtitle}>One platform, one truth, immediate decisions.</Text>
      
      {/* CFO Dashboard Screenshot */}
      <View style={styles.screenshotContainer}>
        <Image src={getFdpImages().dashboard} style={styles.screenshotImage} />
      </View>
      <Text style={styles.screenshotLabel}>CFO Dashboard — Real-time financial visibility</Text>
      
      <View style={styles.twoColumnRow}>
        <View style={styles.halfColumn}>
          {solutions.slice(0, 2).map((s, i) => (
            <View key={i} style={styles.card}>
              <Text style={styles.cardTitle}>{s.title}</Text>
              <Text style={styles.cardText}>{s.desc}</Text>
            </View>
          ))}
        </View>
        <View style={styles.halfColumn}>
          {solutions.slice(2, 4).map((s, i) => (
            <View key={i} style={styles.card}>
              <Text style={styles.cardTitle}>{s.title}</Text>
              <Text style={styles.cardText}>{s.desc}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={styles.footer}><Text style={styles.footerText}>bluecore.vn</Text><Text style={styles.pageNumber}>3 / 12</Text></View>
    </Page>

    {/* Core Formulas */}
    <Page size="A4" style={styles.pageDark}>
      <Text style={styles.sectionTitleWhite}>Core Financial Formulas</Text>
      <View style={{ marginTop: 30, padding: 20, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12 }}>
        <Text style={{ fontSize: 11, color: colors.white, lineHeight: 2 }}>
          Net Revenue = Gross Revenue - Returns - Discounts - Platform Fees{'\n'}
          Contribution Margin = Net Revenue - COGS - Variable Costs{'\n'}
          Real Cash = Bank Balance - Pending Payables - Locked Inventory + Confirmed AR{'\n'}
          Cash Conversion Cycle = DIO + DSO - DPO
        </Text>
      </View>
      <View style={{ marginTop: 30 }}>
        <Text style={{ fontSize: 12, color: colors.accent, textAlign: 'center' }}>
          "These are not accounting formulas — they are DECISION formulas."
        </Text>
      </View>
      <View style={styles.footer}><Text style={styles.footerTextWhite}>bluecore.vn</Text><Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)' }}>4 / 12</Text></View>
    </Page>

    {/* Use Cases with Screenshots */}
    <Page size="A4" style={styles.page}>
      <Text style={styles.eyebrowLabel}>USE CASES</Text>
      <Text style={styles.sectionTitle}>Daily CEO Morning Routine</Text>
      
      <View style={styles.twoColumnRow}>
        <View style={styles.halfColumn}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Before FDP</Text>
            <Text style={styles.cardText}>Call accounting → Wait 2 hours → Get Excel file → Still confused → End of day = no decision</Text>
          </View>
          <View style={[styles.card, { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' }]}>
            <Text style={[styles.cardTitle, { color: colors.accent }]}>With FDP</Text>
            <Text style={styles.cardText}>Open app → 30 seconds → See cash position → Make 3 decisions → Move on</Text>
          </View>
        </View>
        <View style={styles.halfColumn}>
          {/* Cash Position Screenshot */}
          <View style={styles.screenshotContainer}>
            <Image src={getFdpImages().cashPosition} style={styles.screenshotImage} />
          </View>
          <Text style={styles.screenshotLabel}>Cash Position Dashboard</Text>
        </View>
      </View>
      
      <View style={{ marginTop: 12, padding: 14, backgroundColor: colors.primaryDark, borderRadius: 10 }}>
        <Text style={{ fontSize: 10, color: colors.white, textAlign: 'center' }}>
          Time saved per day: 2 hours → Decisions made: 3x more → Cash saved: thousands per month
        </Text>
      </View>
      <View style={styles.footer}><Text style={styles.footerText}>bluecore.vn</Text><Text style={styles.pageNumber}>5 / 12</Text></View>
    </Page>

    {/* Manifesto */}
    <Page size="A4" style={styles.page}>
      <Text style={styles.eyebrowLabel}>FDP MANIFESTO</Text>
      <Text style={styles.sectionTitle}>Principles We Live By</Text>
      {manifesto.map((m, i) => (
        <View key={i} style={{ flexDirection: 'row', marginBottom: 12, alignItems: 'flex-start' }}>
          <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
            <Text style={{ fontSize: 10, fontWeight: 700, color: colors.white }}>{i + 1}</Text>
          </View>
          <Text style={{ flex: 1, fontSize: 11, color: colors.text, lineHeight: 1.5 }}>{m}</Text>
        </View>
      ))}
      <View style={styles.footer}><Text style={styles.footerText}>bluecore.vn</Text><Text style={styles.pageNumber}>6 / 12</Text></View>
    </Page>

    {/* CTA */}
    <Page size="A4" style={styles.pageDark}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 32, fontWeight: 700, color: colors.white, textAlign: 'center', marginBottom: 20 }}>Ready to See Your Financial Truth?</Text>
        <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginBottom: 40 }}>Book a 30-minute demo today</Text>
        <View style={{ backgroundColor: colors.accent, paddingHorizontal: 32, paddingVertical: 16, borderRadius: 8 }}>
          <Text style={{ fontSize: 14, fontWeight: 700, color: colors.white }}>sales@bluecore.vn</Text>
        </View>
      </View>
      <View style={styles.footer}><Text style={styles.footerTextWhite}>bluecore.vn</Text><Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)' }}>12 / 12</Text></View>
    </Page>
  </Document>
);

export default FDPSalesDeckPDF_EN;
