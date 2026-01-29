/**
 * CDP Sales Deck PDF Generator - ENGLISH VERSION
 * 
 * 12-slide narrative deck for Customer Data Platform
 * Tagline: "Population > Individual"
 */

import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

const getBaseUrl = () => {
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
};

Font.register({
  family: 'NotoSans',
  fonts: [
    { src: `${getBaseUrl()}/fonts/NotoSans-Regular.ttf`, fontWeight: 400 },
    { src: `${getBaseUrl()}/fonts/NotoSans-Bold.ttf`, fontWeight: 700 },
  ],
});

const colors = {
  primary: '#10b981',
  primaryDark: '#047857',
  accent: '#8b5cf6',
  danger: '#ef4444',
  text: '#1f2937',
  textLight: '#6b7280',
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
});

const painPoints = [
  { title: 'Customer Data Scattered', desc: 'CRM here, transactions there, marketing data somewhere else. No unified view of customer value.' },
  { title: 'LTV is a Guess', desc: 'Everyone talks about Customer Lifetime Value — but who actually calculates it properly?' },
  { title: 'Churn Detected Too Late', desc: 'By the time you notice customers leaving, they\'ve already left. Revenue is gone.' },
  { title: 'Individual vs Population', desc: 'Traditional CDP focuses on individuals. But what about the financial health of your entire customer base?' },
];

const solutions = [
  { title: 'Customer Equity', desc: 'Total portfolio value = Sum of Expected LTV - Acquisition Costs. Your customers are an asset.' },
  { title: 'LTV Decay Tracking', desc: 'Real-time monitoring of cohort value decay. Catch problems before revenue is lost.' },
  { title: 'Revenue at Risk', desc: 'Calculate potential revenue loss from churning segments. Prioritize retention by value.' },
  { title: 'Cohort Financial View', desc: 'Compare customer groups by financial value. Which acquisition month gave best customers?' },
];

const manifesto = [
  'CDP is NOT CRM — it tracks FINANCIAL health of customer populations',
  'Population > Individual — aggregate value matters more than single customers',
  'LTV Decay is leading indicator — catch it early, save revenue',
  'Revenue at Risk — quantify potential losses, prioritize actions',
  'Cohort thinking — compare groups, not individuals',
];

const CDPSalesDeckPDF_EN: React.FC = () => (
  <Document>
    {/* Cover */}
    <Page size="A4" style={styles.coverPage}>
      <View style={styles.coverBadge}><Text style={styles.coverBadgeText}>CUSTOMER DATA PLATFORM</Text></View>
      <Text style={styles.coverTitle}>CDP</Text>
      <Text style={styles.coverSubtitle}>Track Customer Portfolio Health — Financial Perspective, Not Just CRM</Text>
      <Text style={styles.coverTagline}>Population &gt; Individual</Text>
      <View style={styles.footer}><Text style={styles.footerTextWhite}>bluecore.vn</Text><Text style={styles.footerTextWhite}>1 / 12</Text></View>
    </Page>

    {/* Pain Points */}
    <Page size="A4" style={styles.page}>
      <Text style={styles.eyebrowLabel}>THE PROBLEM</Text>
      <Text style={styles.sectionTitle}>Customer Value Blindness</Text>
      <Text style={styles.sectionSubtitle}>You know how many customers you have. But do you know what they're WORTH?</Text>
      {painPoints.map((p, i) => (
        <View key={i} style={styles.card}>
          <Text style={styles.cardTitle}>{p.title}</Text>
          <Text style={styles.cardText}>{p.desc}</Text>
        </View>
      ))}
      <View style={styles.footer}><Text style={styles.footerText}>bluecore.vn</Text><Text style={styles.pageNumber}>2 / 12</Text></View>
    </Page>

    {/* Reality Check */}
    <Page size="A4" style={styles.page}>
      <Text style={styles.eyebrowLabel}>REALITY CHECK</Text>
      <Text style={styles.sectionTitle}>The Silent Customer Exodus</Text>
      <View style={{ padding: 20, backgroundColor: '#fef2f2', borderRadius: 12, borderWidth: 1, borderColor: '#fecaca', marginBottom: 20 }}>
        <Text style={{ fontSize: 14, fontWeight: 700, color: colors.danger, marginBottom: 8 }}>Q1 Cohort: LTV Decay 40% in 6 Months</Text>
        <Text style={{ fontSize: 10, color: colors.text, lineHeight: 1.6 }}>
          - Initial cohort value: $100K{'\n'}- After 6 months: $60K{'\n'}- Lost revenue: $40K{'\n'}- Detected: After the fact{'\n'}- Recovery: Too late
        </Text>
        <Text style={{ fontSize: 14, fontWeight: 700, color: colors.danger, marginTop: 12 }}>$40K revenue lost silently</Text>
      </View>
      <View style={{ padding: 16, backgroundColor: colors.primaryDark, borderRadius: 10 }}>
        <Text style={{ fontSize: 11, color: colors.white, textAlign: 'center' }}>
          "You don't lose customers one by one. You lose them in cohorts. Track cohorts, save revenue."
        </Text>
      </View>
      <View style={styles.footer}><Text style={styles.footerText}>bluecore.vn</Text><Text style={styles.pageNumber}>3 / 12</Text></View>
    </Page>

    {/* Solution */}
    <Page size="A4" style={styles.page}>
      <Text style={styles.eyebrowLabel}>THE SOLUTION</Text>
      <Text style={styles.sectionTitle}>CDP — Customer Data Platform</Text>
      <Text style={styles.sectionSubtitle}>Financial health of your customer portfolio.</Text>
      {solutions.map((s, i) => (
        <View key={i} style={styles.card}>
          <Text style={styles.cardTitle}>{s.title}</Text>
          <Text style={styles.cardText}>{s.desc}</Text>
        </View>
      ))}
      <View style={styles.footer}><Text style={styles.footerText}>bluecore.vn</Text><Text style={styles.pageNumber}>4 / 12</Text></View>
    </Page>

    {/* Manifesto */}
    <Page size="A4" style={styles.page}>
      <Text style={styles.eyebrowLabel}>CDP MANIFESTO</Text>
      <Text style={styles.sectionTitle}>Principles We Live By</Text>
      {manifesto.map((m, i) => (
        <View key={i} style={{ flexDirection: 'row', marginBottom: 12, alignItems: 'flex-start' }}>
          <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
            <Text style={{ fontSize: 10, fontWeight: 700, color: colors.white }}>{i + 1}</Text>
          </View>
          <Text style={{ flex: 1, fontSize: 11, color: colors.text, lineHeight: 1.5 }}>{m}</Text>
        </View>
      ))}
      <View style={styles.footer}><Text style={styles.footerText}>bluecore.vn</Text><Text style={styles.pageNumber}>5 / 12</Text></View>
    </Page>

    {/* CTA */}
    <Page size="A4" style={styles.pageDark}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 32, fontWeight: 700, color: colors.white, textAlign: 'center', marginBottom: 20 }}>Know Your Customer Portfolio Value</Text>
        <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginBottom: 40 }}>See your Revenue at Risk in 30 minutes</Text>
        <View style={{ backgroundColor: colors.accent, paddingHorizontal: 32, paddingVertical: 16, borderRadius: 8 }}>
          <Text style={{ fontSize: 14, fontWeight: 700, color: colors.white }}>sales@bluecore.vn</Text>
        </View>
      </View>
      <View style={styles.footer}><Text style={styles.footerTextWhite}>bluecore.vn</Text><Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)' }}>12 / 12</Text></View>
    </Page>
  </Document>
);

export default CDPSalesDeckPDF_EN;
