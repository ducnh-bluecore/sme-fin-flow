/**
 * Control Tower Sales Deck PDF Generator - ENGLISH VERSION
 * 
 * 12-slide narrative deck for Business Command Center
 * Tagline: "Awareness before Analytics"
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
  primary: '#f59e0b',
  primaryDark: '#b45309',
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
  coverTitle: { fontSize: 42, fontWeight: 700, color: colors.white, marginBottom: 16, textAlign: 'center' },
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
  { title: 'Dashboard Overload', desc: '50 metrics, 20 charts, 100 KPIs. Everything looks important. Nothing gets done.' },
  { title: 'Problems Discovered Too Late', desc: 'Cash crisis? Discovered at month-end. Stock-out? Discovered when customer complains.' },
  { title: 'No Ownership', desc: 'Alert fires. Who is responsible? When is deadline? What\'s the impact? Nobody knows.' },
  { title: 'Analytics Without Action', desc: 'Beautiful reports. Zero decisions. Analysis paralysis at its finest.' },
];

const solutions = [
  { title: 'Max 7 Alerts', desc: 'Only 5-7 most critical alerts at any time. Prioritized by financial impact.' },
  { title: 'Impact + Deadline + Owner', desc: 'Every alert answers: How much money? How long to act? Who is responsible?' },
  { title: 'Cross-Module Intelligence', desc: 'Combine signals from FDP + MDP + CDP. See the complete picture.' },
  { title: 'Resolution Tracking', desc: 'Track every alert to resolution. Learn from every incident.' },
];

const manifesto = [
  'Control Tower is NOT a dashboard — it exists to ALERT and ACT',
  'Only cares about "what is WRONG" — if nothing wrong, stay silent',
  'Every alert must have: Impact amount, Deadline, Owner',
  'Max 5-7 alerts at any time — more alerts = meaningless',
  'If it doesn\'t force action, Control Tower has failed',
];

const ControlTowerSalesDeckPDF_EN: React.FC = () => (
  <Document>
    {/* Cover */}
    <Page size="A4" style={styles.coverPage}>
      <View style={styles.coverBadge}><Text style={styles.coverBadgeText}>COMMAND CENTER</Text></View>
      <Text style={styles.coverTitle}>CONTROL TOWER</Text>
      <Text style={styles.coverSubtitle}>Alert and Action — Only Focus on What's Wrong and Needs Immediate Attention</Text>
      <Text style={styles.coverTagline}>Awareness before Analytics</Text>
      <View style={styles.footer}><Text style={styles.footerTextWhite}>bluecore.vn</Text><Text style={styles.footerTextWhite}>1 / 12</Text></View>
    </Page>

    {/* Pain Points */}
    <Page size="A4" style={styles.page}>
      <Text style={styles.eyebrowLabel}>THE PROBLEM</Text>
      <Text style={styles.sectionTitle}>Dashboard Hell</Text>
      <Text style={styles.sectionSubtitle}>More dashboards. More metrics. More confusion. Less action.</Text>
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
      <Text style={styles.sectionTitle}>The Cost of Late Detection</Text>
      <View style={{ padding: 20, backgroundColor: '#fef2f2', borderRadius: 12, borderWidth: 1, borderColor: '#fecaca', marginBottom: 20 }}>
        <Text style={{ fontSize: 14, fontWeight: 700, color: colors.danger, marginBottom: 8 }}>Cash Gap: $45K in 7 Days</Text>
        <Text style={{ fontSize: 10, color: colors.text, lineHeight: 1.6 }}>
          - Shopee settlement delayed: 5 days{'\n'}- B2B invoices overdue: $30K{'\n'}- Inventory purchase pending: $15K{'\n'}- Available cash: $5K{'\n'}- Gap: $45K
        </Text>
        <Text style={{ fontSize: 14, fontWeight: 700, color: colors.danger, marginTop: 12 }}>Detected: Day 6 (too late) → Emergency loan at 24%</Text>
      </View>
      <View style={{ padding: 16, backgroundColor: colors.primaryDark, borderRadius: 10 }}>
        <Text style={{ fontSize: 11, color: colors.white, textAlign: 'center' }}>
          "Businesses don't die from problems. They die from not knowing about problems EARLY."
        </Text>
      </View>
      <View style={styles.footer}><Text style={styles.footerText}>bluecore.vn</Text><Text style={styles.pageNumber}>3 / 12</Text></View>
    </Page>

    {/* Solution */}
    <Page size="A4" style={styles.page}>
      <Text style={styles.eyebrowLabel}>THE SOLUTION</Text>
      <Text style={styles.sectionTitle}>Control Tower — Command Center</Text>
      <Text style={styles.sectionSubtitle}>Not what's happening — what's WRONG and needs action NOW.</Text>
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
      <Text style={styles.eyebrowLabel}>CONTROL TOWER MANIFESTO</Text>
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
        <Text style={{ fontSize: 32, fontWeight: 700, color: colors.white, textAlign: 'center', marginBottom: 20 }}>Never Be Surprised Again</Text>
        <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginBottom: 40 }}>See your critical alerts in 30 minutes</Text>
        <View style={{ backgroundColor: colors.accent, paddingHorizontal: 32, paddingVertical: 16, borderRadius: 8 }}>
          <Text style={{ fontSize: 14, fontWeight: 700, color: colors.white }}>sales@bluecore.vn</Text>
        </View>
      </View>
      <View style={styles.footer}><Text style={styles.footerTextWhite}>bluecore.vn</Text><Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)' }}>12 / 12</Text></View>
    </Page>
  </Document>
);

export default ControlTowerSalesDeckPDF_EN;
