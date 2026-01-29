/**
 * MDP Sales Deck PDF Generator - ENGLISH VERSION
 * 
 * 12-slide narrative deck telling the Marketing ROI Story
 * Tagline: "Profit before Performance"
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
  primary: '#8b5cf6',
  primaryDark: '#5b21b6',
  accent: '#10b981',
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
  { title: 'ROAS Lies to You', desc: '3.5x ROAS looks great — but after platform fees, shipping, returns? You might be LOSING money.' },
  { title: 'Marketing Burns Cash First', desc: 'You pay ads today, collect revenue in 30-60 days. Cash gap kills more businesses than low sales.' },
  { title: 'No Profit Attribution', desc: 'Which campaign actually makes PROFIT? Not clicks, not conversions — PROFIT?' },
  { title: 'Scale/Kill Decisions Delayed', desc: 'By the time you realize a campaign is bleeding money, you\'ve already wasted thousands.' },
];

const solutions = [
  { title: 'Profit ROAS', desc: 'True return after ALL costs: COGS, platform fees, shipping, returns, payment fees.' },
  { title: 'Cash Impact Tracking', desc: 'Days to Cash per channel. Know which campaigns hurt your cash flow.' },
  { title: 'CAC Payback Analysis', desc: 'How many months to recover customer acquisition cost? If >6 months, reconsider.' },
  { title: 'Scale/Hold/Kill Panel', desc: '3 simple decisions for each campaign. No more analysis paralysis.' },
];

const manifesto = [
  'MDP is NOT MarTech — it measures FINANCIAL value of marketing',
  'Profit before Performance — real profit, not paper metrics',
  'Serves CEO/CFO first, marketers second',
  'Cash Impact — marketing spends money first, collects later',
  'If it doesn\'t change decisions, it doesn\'t belong in MDP',
];

const MDPSalesDeckPDF_EN: React.FC = () => (
  <Document>
    {/* Cover */}
    <Page size="A4" style={styles.coverPage}>
      <View style={styles.coverBadge}><Text style={styles.coverBadgeText}>MARKETING DATA PLATFORM</Text></View>
      <Text style={styles.coverTitle}>MDP</Text>
      <Text style={styles.coverSubtitle}>Measure True Financial Value of Marketing — Profit ROAS, Not Click ROAS</Text>
      <Text style={styles.coverTagline}>Profit before Performance</Text>
      <View style={styles.footer}><Text style={styles.footerTextWhite}>bluecore.vn</Text><Text style={styles.footerTextWhite}>1 / 12</Text></View>
    </Page>

    {/* Pain Points */}
    <Page size="A4" style={styles.page}>
      <Text style={styles.eyebrowLabel}>THE PROBLEM</Text>
      <Text style={styles.sectionTitle}>Marketing's Dirty Secret</Text>
      <Text style={styles.sectionSubtitle}>Marketers celebrate ROAS. CFOs see the real numbers. Someone is wrong.</Text>
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
      <Text style={styles.sectionTitle}>The ROAS Illusion</Text>
      <View style={{ padding: 20, backgroundColor: '#fef2f2', borderRadius: 12, borderWidth: 1, borderColor: '#fecaca', marginBottom: 20 }}>
        <Text style={{ fontSize: 14, fontWeight: 700, color: colors.danger, marginBottom: 8 }}>Reported: 4.0x ROAS</Text>
        <Text style={{ fontSize: 10, color: colors.text, lineHeight: 1.6 }}>
          - Platform fee: -15%{'\n'}- Shipping: -8%{'\n'}- Returns: -12%{'\n'}- COGS: -45%{'\n'}- Payment fee: -3%
        </Text>
        <Text style={{ fontSize: 14, fontWeight: 700, color: colors.danger, marginTop: 12 }}>Reality: 0.9x Profit ROAS = LOSING MONEY</Text>
      </View>
      <View style={{ padding: 16, backgroundColor: colors.primaryDark, borderRadius: 10 }}>
        <Text style={{ fontSize: 11, color: colors.white, textAlign: 'center' }}>
          "Marketing says we're winning. Finance says we're bleeding. MDP shows the truth."
        </Text>
      </View>
      <View style={styles.footer}><Text style={styles.footerText}>bluecore.vn</Text><Text style={styles.pageNumber}>3 / 12</Text></View>
    </Page>

    {/* Solution */}
    <Page size="A4" style={styles.page}>
      <Text style={styles.eyebrowLabel}>THE SOLUTION</Text>
      <Text style={styles.sectionTitle}>MDP — Marketing Data Platform</Text>
      <Text style={styles.sectionSubtitle}>Financial truth for marketing decisions.</Text>
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
      <Text style={styles.eyebrowLabel}>MDP MANIFESTO</Text>
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
        <Text style={{ fontSize: 32, fontWeight: 700, color: colors.white, textAlign: 'center', marginBottom: 20 }}>Stop Burning Money on Marketing</Text>
        <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginBottom: 40 }}>See your true Profit ROAS in 30 minutes</Text>
        <View style={{ backgroundColor: colors.accent, paddingHorizontal: 32, paddingVertical: 16, borderRadius: 8 }}>
          <Text style={{ fontSize: 14, fontWeight: 700, color: colors.white }}>sales@bluecore.vn</Text>
        </View>
      </View>
      <View style={styles.footer}><Text style={styles.footerTextWhite}>bluecore.vn</Text><Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)' }}>12 / 12</Text></View>
    </Page>
  </Document>
);

export default MDPSalesDeckPDF_EN;
